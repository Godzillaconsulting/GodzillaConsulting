// ==========================================================
// middleware/adminAuth.js
// Guardián de rutas Admin: verifica JWT y bloquea sin token válido
// ==========================================================
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'godzilla_temp_secret_key_2026';

// ──────────────────────────────────────────────────────────
// 1. Verificar token JWT genérico (cualquier admin)
// ──────────────────────────────────────────────────────────
export const requireAdmin = async (req, res, next) => {
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
        
        // Cargar admin desde DB para tener is_superadmin fresco
        const result = await pool.query('SELECT id, username, is_superadmin, role, status FROM admins WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Admin no encontrado.' });
        }

        req.admin = result.rows[0];
        req.adminUser = decoded; // Compatibilidad
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
    if (!req.admin || !req.admin.is_superadmin) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere permiso de SuperAdmin.' });
    }
    next();
};

// ──────────────────────────────────────────────────────────
// 3. CM o Admin (Oscar, Judith, JareG)
// ──────────────────────────────────────────────────────────
export const requireCM = (req, res, next) => {
    const user = req.adminUser || req.admin;
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado.' });
    
    const allowed = user.role === 'admin' || user.role === 'cm' ||
        ['jareg', 'oscar', 'godzilla_admin', 'judith'].includes(user.username?.toLowerCase() || req.admin.username?.toLowerCase());
    
    if (!allowed) {
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso restringido. Solo CM o administradores.'
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
