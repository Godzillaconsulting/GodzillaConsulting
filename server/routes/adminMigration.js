// Endpoint de migración administrativa — ejecutar UNA VEZ
// Protegido con token secreto de ambiente
// Llamar: POST /api/admin/run-security-migration
// Headers: { "x-migration-key": process.env.MIGRATION_SECRET }

import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.post('/run-security-migration', async (req, res) => {
    // Verificar clave de migración (definida en variables de entorno de Vercel)
    const key = req.headers['x-migration-key'];
    const expected = process.env.MIGRATION_SECRET || 'godzilla_migrate_2026_secure';
    
    if (key !== expected) {
        return res.status(403).json({ success: false, message: 'Clave incorrecta.' });
    }

    const results = [];
    const run = async (label, sql) => {
        try {
            await pool.query(sql);
            results.push({ ok: true, label });
        } catch (err) {
            results.push({ ok: false, label, error: err.message });
        }
    };

    await run('Tabla login_attempts', `
        CREATE TABLE IF NOT EXISTS login_attempts (
            id SERIAL PRIMARY KEY,
            username VARCHAR(60) NOT NULL,
            ip_address VARCHAR(64) NOT NULL,
            attempted_at TIMESTAMPTZ DEFAULT NOW(),
            success BOOLEAN DEFAULT FALSE,
            user_agent TEXT
        );
    `);

    await run('Índice IP login_attempts', `
        CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts (ip_address, attempted_at);
    `);

    await run('Índice username login_attempts', `
        CREATE INDEX IF NOT EXISTS idx_login_username ON login_attempts (username, attempted_at);
    `);

    await run('Columna is_locked en admins', `
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);

    await run('Columna role en admins', `
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'user';
    `);

    await run('Limpiar intentos viejos', `
        DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
    `);

    const allOk = results.every(r => r.ok);
    return res.json({ success: allOk, results });
});

// Ruta para ver el estado del audit log (solo con clave)
router.get('/login-audit', async (req, res) => {
    const key = req.headers['x-migration-key'];
    const expected = process.env.MIGRATION_SECRET || 'godzilla_migrate_2026_secure';
    if (key !== expected) return res.status(403).json({ success: false });

    try {
        const data = await pool.query(`
            SELECT username, ip_address, attempted_at, success
            FROM login_attempts
            ORDER BY attempted_at DESC
            LIMIT 50
        `);
        res.json({ success: true, rows: data.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
