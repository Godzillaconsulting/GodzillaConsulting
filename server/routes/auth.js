import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { logFailedLogin, isIPBlocked } from '../middleware/adminAuth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';

// ──────────────────────────────────────────────────────────
// POST /api/auth/login
// Con protección contra brute-force + bloqueo por IP + audit log
// ──────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    // Agente de seguridad: ningún bot o escáner automatizado pasa
    const ua = req.headers['user-agent'] || '';
    const isSuspiciousBot = /curl|python-requests|go-http|scrapy|libwww|httpie|okhttp|java\//i.test(ua);
    if (isSuspiciousBot) {
        return res.status(403).json({ success: false, message: 'Agente no permitido.' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;

    // Verificar si la IP está bloqueada
    const blocked = await isIPBlocked(clientIp);
    if (blocked) {
        return res.status(429).json({
            success: false,
            message: 'IP temporalmente bloqueada debido a múltiples intentos fallidos. Espera 15 minutos.',
            blocked: true
        });
    }

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos.' });
        }

        // Longitud máxima para evitar ataques de desbordamiento
        if (username.length > 60 || password.length > 128) {
            return res.status(400).json({ success: false, message: 'Credenciales inválidas.' });
        }

        const result = await pool.query('SELECT * FROM admins WHERE LOWER(username) = LOWER($1)', [username.trim()]);

        if (result.rows.length === 0) {
            // NO revelamos si el usuario existe o no (timing-safe)
            await logFailedLogin(username, clientIp);
            // Simulamos delay para prevenir timing attacks
            await bcrypt.hash('dummy_timing_protection', 10);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const admin = result.rows[0];

        // Verificar si la cuenta está bloqueada
        if (admin.is_locked) {
            // Auto-desbloqueo: si no hubo intentos fallidos en los últimos 30 min, levantar el bloqueo
            const recentFails = await pool.query(
                `SELECT COUNT(*) as count FROM login_attempts
                 WHERE username = $1 AND attempted_at > NOW() - INTERVAL '30 minutes' AND (success IS NULL OR success = FALSE)`,
                [username]
            ).catch(() => ({ rows: [{ count: '0' }] }));
            const recentFailCount = parseInt(recentFails.rows[0].count);

            if (recentFailCount === 0) {
                // Sin actividad sospechosa reciente → auto-unlock
                await pool.query(
                    'UPDATE admins SET is_locked = FALSE WHERE username = $1',
                    [username]
                ).catch(() => {});
                console.log(`[AUTH] Auto-unlock aplicado a '${username}' (sin intentos fallidos recientes).`);
                // Continúa el flujo normal de login (no hace return)
            } else {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Espera 30 minutos.',
                    locked: true
                });
            }
        }

        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            await logFailedLogin(username, clientIp);
            
            // Auto-lock: si tiene >7 intentos fallidos en la DB, bloquear la cuenta
            const failCount = await pool.query(
                `SELECT COUNT(*) FROM login_attempts 
                 WHERE username = $1 AND attempted_at > NOW() - INTERVAL '30 minutes'`,
                [username]
            ).catch(() => ({ rows: [{ count: 0 }] }));
            
            const fails = parseInt(failCount.rows[0].count);
            if (fails >= 7) {
                await pool.query(
                    'UPDATE admins SET is_locked = TRUE WHERE username = $1',
                    [username]
                ).catch(() => {});
                return res.status(403).json({
                    success: false,
                    message: 'Cuenta bloqueada por múltiples intentos fallidos. Contacta al administrador.',
                    locked: true
                });
            }

            const remaining = Math.max(0, 7 - fails);
            return res.status(401).json({ 
                success: false, 
                message: `Credenciales incorrectas. Te quedan ${remaining} intentos antes del bloqueo.`,
                attemptsLeft: remaining
            });
        }

        // Login exitoso: limpiar intentos fallidos de esta IP
        pool.query(
            'DELETE FROM login_attempts WHERE ip_address = $1 OR username = $2',
            [clientIp, username]
        ).catch(() => {});

        // Incluir role en el JWT payload
        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username,
                role: admin.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '365d' } // Módulo Auth FB-Like: Sesión semi-permanente por 1 año
        );

        // Log de acceso exitoso
        pool.query(
            `INSERT INTO login_attempts (username, ip_address, attempted_at, success)
             VALUES ($1, $2, NOW(), TRUE)
             ON CONFLICT DO NOTHING`,
            [admin.username, clientIp]
        ).catch(() => {});

        res.json({ 
            success: true, 
            token, 
            username: admin.username,
            role: admin.role || 'user'
        });

    } catch (error) {
        // En producción NUNCA devolver el stack trace
        console.error('[AUTH ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Error en el servidor. Contacta a IT.' });
    }
});

// ──────────────────────────────────────────────────────────
// GET /api/auth/verify — Verificar token activo
// ──────────────────────────────────────────────────────────
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ 
            success: true, 
            username: decoded.username, 
            id: decoded.id,
            role: decoded.role 
        });
    } catch (err) {
        const msg = err.name === 'TokenExpiredError' 
            ? 'Sesión expirada. Inicia sesión nuevamente.' 
            : 'Token inválido.';
        res.status(401).json({ success: false, message: msg });
    }
});

// ──────────────────────────────────────────────────────────
// POST /api/auth/logout — Invalidar sesión (para logs)
// ──────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    // Con JWT stateless no hay servidor-side invalidation sin una lista negra.
    // El frontend limpia el localStorage. Aquí registramos el evento.
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log(`[LOGOUT] ${decoded.username} cerró sesión.`);
        } catch (_) {}
    }
    res.json({ success: true });
});

export default router;
