import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const requireAdmin = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'godzilla_temp_secret_key_2026');
        
        // Cargar admin desde DB para tener is_superadmin fresco
        const result = await pool.query('SELECT id, username, is_superadmin, photo_url, status FROM admins WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Admin no encontrado.' });
        }

        req.admin = result.rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
    }
};

export const requireSuperAdmin = (req, res, next) => {
    if (!req.admin || !req.admin.is_superadmin) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere permiso de SuperAdmin.' });
    }
    next();
};
