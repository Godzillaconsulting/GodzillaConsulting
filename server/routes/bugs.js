import express from 'express';
import pool from '../config/db.js';
import { verifyAdminToken } from '../middleware/adminAuth.js';

const router = express.Router();

// GET /api/bugs - Obtener bugs reportados (solo Dani/JareG tendran acceso en UI, pero el backend lo asegura)
router.get('/', verifyAdminToken, async (req, res) => {
    try {
        const allowed = ['jareg', 'godzilla_admin', 'dani'];
        if (!allowed.includes(req.admin.username?.toLowerCase())) {
            return res.status(403).json({ error: 'Acceso restringido a TI' });
        }
        
        const r = await pool.query(`
            SELECT id, description, priority, screenshot_url, reporter_username, path_url, resolved, created_at, resolved_by, resolved_at 
            FROM it_bugs 
            ORDER BY resolved ASC, created_at DESC
        `);
        res.json({ bugs: r.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/bugs - Reportar nuevo bug (cualquiera autenticado puede reportar)
router.post('/', verifyAdminToken, async (req, res) => {
    try {
        const { description, priority, screenshot_url, path_url } = req.body;
        const reporter = req.admin.username || 'desconocido';
        
        const r = await pool.query(`
            INSERT INTO it_bugs (description, priority, screenshot_url, reporter_username, path_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [description, priority || 'media', screenshot_url, reporter, path_url]);
        
        res.status(201).json({ success: true, bug: r.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/bugs/:id - Marcar como resuelto. (Solo TI)
router.put('/:id', verifyAdminToken, async (req, res) => {
    try {
        const allowed = ['jareg', 'godzilla_admin', 'dani'];
        if (!allowed.includes(req.admin.username?.toLowerCase())) {
            return res.status(403).json({ error: 'Acceso restringido a TI' });
        }
        
        const bugId = req.params.id;
        const { resolved } = req.body;
        const resolvedBy = resolved ? (req.admin.username || 'AdminTI') : null;
        
        const r = await pool.query(`
            UPDATE it_bugs 
            SET resolved = $1, resolved_by = $2, resolved_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END
            WHERE id = $3
            RETURNING *
        `, [resolved, resolvedBy, bugId]);
        
        res.json({ success: true, bug: r.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
