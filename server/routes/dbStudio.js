import express from 'express';
import pool from '../config/db.js';
import { requireSuperAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────
// Todas las rutas en este archivo están protegidas obligatoriamente 
// por requireSuperAdmin al momento de montarse en index.js
// ──────────────────────────────────────────────────────────

// GET /api/db-studio/tables - Obtiene un mapa de todas las tablas
router.get('/tables', async (req, res) => {
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_type='BASE TABLE'
            ORDER BY table_name ASC;
        `;
        const result = await pool.query(query);
        const tables = result.rows.map(r => r.table_name);
        
        // Excluir tabla de contraseñas de la lista pública si es necesario, 
        // pero como es SuperAdmin, le mostraremos todo el motor de forma transparente.
        res.json({ success: true, tables });
    } catch (err) {
        console.error('[DB Studio] Error iterando tablas:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/db-studio/tables/:name - Obtiene contenido rápido de una tabla (LIMIT 50)
router.get('/tables/:name', async (req, res) => {
    try {
        const tableName = req.params.name;
        // Sanitización para prevenir ataques de identificador (solo chars válidos)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ success: false, error: 'Nombre de tabla inválido' });
        }

        const query = `SELECT * FROM "${tableName}" LIMIT 50`;
        const result = await pool.query(query);
        
        res.json({ 
            success: true, 
            rows: result.rows,
            fields: result.fields.map(f => f.name)
        });
    } catch (err) {
        console.error(`[DB Studio] Error leyendo ${req.params.name}:`, err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/db-studio/query - Ejecuta un raw SQL (Max 500 rows format safe)
router.post('/query', async (req, res) => {
    try {
        // Validación de Dios de Servidores (Solo JareG)
        const username = req.admin?.username?.toLowerCase();
        if (username !== 'jareg' && username !== 'godzilla_admin') {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const payloadStr = req.body?.query ? String(req.body.query).substring(0, 500) : 'Sin query';
            
            // Log del ataque
            try {
                await pool.query(
                    `INSERT INTO security_alerts (attempt_type, ip_address, username, payload) VALUES ($1, $2, $3, $4)`,
                    ['UNAUTHORIZED_SQL_INJECTION', ip, req.admin?.username || 'Desconocido', payloadStr]
                );
            } catch (logErr) {
                console.error('[SECURITY] Error guardando log de ataque:', logErr);
            }

            return res.status(403).json({ success: false, error: 'Acceso Denegado: Inyecciones SQL solo permitidas para JareG (Security GodMode).' });
        }

        let { query } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ success: false, error: 'Se requiere una query válida.' });
        }

        // Interceptor de seguridad: Evitar Crash of Memory forzando LIMIT si es un SELECT
        if (query.trim().toUpperCase().startsWith('SELECT') && !/LIMIT/i.test(query)) {
            query = query.trim() + ' LIMIT 500';
        }

        const triggerTime = process.hrtime();
        const result = await pool.query(query);
        const diffTime = process.hrtime(triggerTime);
        const execMs = (diffTime[0] * 1000 + diffTime[1] / 1e6).toFixed(2);

        // Si es INSERT/UPDATE/DELETE reportamos la cuenta de rows mutadas
        if (result.command !== 'SELECT') {
            return res.json({
                success: true,
                command: result.command,
                rowCount: result.rowCount || 0,
                timeMs: execMs
            });
        }

        // Es SELECT, devolver rows
        res.json({
            success: true,
            rows: result.rows,
            fields: result.fields?.map(f => f.name) || [],
            timeMs: execMs
        });

    } catch (err) {
        console.error('[DB Studio] SQL Syntax Error:', err.message);
        res.status(400).json({ success: false, error: err.message, position: err.position });
    }
});

export default router;
