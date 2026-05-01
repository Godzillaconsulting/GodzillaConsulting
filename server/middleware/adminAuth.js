// ==========================================================
// middleware/adminAuth.js
// Guardián de rutas Admin: verifica JWT y bloquea sin token válido
// ==========================================================
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';

// ──────────────────────────────────────────────────────────
// 1. Verificar token JWT genérico (cualquier admin)
// ──────────────────────────────────────────────────────────
export const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso denegado. Token requerido.' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded; // { id, username, role }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Sesión expirada. Vuelve a iniciar sesión.' });
        }
        return res.status(403).json({ success: false, message: 'Token inválido.' });
    }
};

// ──────────────────────────────────────────────────────────
// 2. Solo Super Admins (JareG / Oscar / godzilla_admin)
// ──────────────────────────────────────────────────────────
export const requireSuperAdmin = (req, res, next) => {
    const user = req.admin;
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado.' });
    
    const isSuperAdmin = user.role === 'admin' || 
        ['jareg', 'oscar', 'godzilla_admin'].includes(user.username?.toLowerCase());
    
    if (!isSuperAdmin) {
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso restringido. Solo administradores.' 
        });
    }
    next();
};

// ──────────────────────────────────────────────────────────
// 3. CM o Admin (Oscar, Judith, JareG)
// ──────────────────────────────────────────────────────────
export const requireCM = (req, res, next) => {
    const user = req.admin;
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado.' });
    
    const allowed = user.role === 'admin' || user.role === 'cm' ||
        ['jareg', 'oscar', 'godzilla_admin', 'judith'].includes(user.username?.toLowerCase());
    
    if (!allowed) {
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso restringido. Solo CM o administradores.'
        });
    }
    next();
};

// ──────────────────────────────────────────────────────────
// 3b. CM, Admin, O Cockers (Alex puede enviar tareas a revisión)
// ──────────────────────────────────────────────────────────
export const requireCMOrCockers = (req, res, next) => {
    const user = req.admin;
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado.' });
    
    console.log(`[AUTH CHECK] requireCMOrCockers - User:`, user);
    
    const allowed = user.role === 'admin' || user.role === 'cm' || user.role === 'cockers' ||
        ['jareg', 'oscar', 'godzilla_admin', 'judith', 'alex', 'cockers'].includes(user.username?.toLowerCase());
    
    if (!allowed) {
        console.log(`[AUTH CHECK] Access denied for user:`, user);
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso restringido.'
        });
    }
    next();
};

// ──────────────────────────────────────────────────────────
// 4. Registro de intentos fallidos (para audit log)
// ──────────────────────────────────────────────────────────
export const logFailedLogin = async (username, ip) => {
    try {
        await pool.query(
            `INSERT INTO login_attempts (username, ip_address, attempted_at)
             VALUES ($1, $2, NOW())`,
            [username, ip]
        );
    } catch (_) {
        // Silencioso: la tabla puede no existir aún
    }
};

// ──────────────────────────────────────────────────────────
// 5. Verificar si la IP está bloqueada (>10 fallos en 15min)
// ──────────────────────────────────────────────────────────
export const isIPBlocked = async (ip) => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM login_attempts 
             WHERE ip_address = $1 AND attempted_at > NOW() - INTERVAL '15 minutes'`,
            [ip]
        );
        return parseInt(result.rows[0].count) >= 10;
    } catch (_) {
        return false; // Si la tabla no existe, no bloqueamos
    }
};

// ──────────────────────────────────────────────────────────
// 6. Alias de 'requireAdmin' faltante en las otras rutas
// ──────────────────────────────────────────────────────────
export const requireAdmin = verifyAdminToken;
