import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Middleware simplificado: Asumimos que la petición viene de un admin local, 
// o puedes usar un middleware de token en el futuro.
// GET /api/bots/config/:plataforma
router.get('/:plataforma', async (req, res) => {
    try {
        const { plataforma } = req.params;
        const result = await pool.query('SELECT * FROM bot_configs WHERE plataforma = $1', [plataforma]);
        if (result.rows.length === 0) {
            return res.json({ success: true, config: null });
        }
        res.json({ success: true, config: result.rows[0] });
    } catch (err) {
        console.error('Error GET bot config:', err);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// POST /api/bots/config/:plataforma
router.post('/:plataforma', async (req, res) => {
    try {
        const { plataforma } = req.params;
        const { keywords, comment_template, dm_system_prompt } = req.body;

        const result = await pool.query(`
            INSERT INTO bot_configs (plataforma, keywords, comment_template, dm_system_prompt)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (plataforma) DO UPDATE SET
                keywords = EXCLUDED.keywords,
                comment_template = EXCLUDED.comment_template,
                dm_system_prompt = EXCLUDED.dm_system_prompt
            RETURNING *
        `, [plataforma, keywords, comment_template, dm_system_prompt]);

        res.json({ success: true, config: result.rows[0] });
    } catch (err) {
        console.error('Error POST bot config:', err);
        res.status(500).json({ success: false, error: 'Error interno guardando config' });
    }
});

export default router;
