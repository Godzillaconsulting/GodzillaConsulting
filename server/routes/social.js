import express from 'express';
import pool from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Obtener todas las publicaciones pendientes o programadas
router.get('/queue', requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT id, platform, caption, visual_prompt, media_url, media_type, scheduled_for, status, created_by, created_at
            FROM social_queue
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, posts: result.rows });
    } catch (e) {
        console.error('Error fetching social queue', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Obtener comentarios de un post específico
router.get('/:id/comments', requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT c.id, c.content, c.created_at, a.username as author_name, c.tagged_user_ids
            FROM task_comments c
            JOIN admins a ON c.author_id = a.id
            WHERE c.target_type = 'social_post' AND c.target_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await pool.query(query, [req.params.id]);
        res.json({ success: true, comments: result.rows });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// Apretar botón: "Aprobar y Mandar a Meta" o "Rechazar"
router.put('/:id/status', requireAdmin, async (req, res) => {
    const { status } = req.body; // 'approved', 'rejected'
    try {
        await pool.query('UPDATE social_queue SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true, message: `Post marcado como ${status}` });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// Flujo Inter-departamental: El Estudio (Arte) aprueba un visual y se lo envía a CM (Calendario)
router.put('/approve-media', requireAdmin, async (req, res) => {
    const { id, selected_media_url, status } = req.body;
    try {
        await pool.query(
            'UPDATE social_queue SET status = $1, media_url = $2 WHERE id = $3', 
            [status || 'pending_cm_approval', selected_media_url, id]
        );
        res.json({ success: true, message: 'Media attached and sent to CM inbox.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

export default router;
