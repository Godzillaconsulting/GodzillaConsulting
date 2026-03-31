import express from 'express';
import pool from '../config/db.js';

import { requireAdmin } from '../middlewares/adminAuth.js';
import { logAction } from './users.js';

const router = express.Router();

// GET /api/nodes -> Fetch all nodes in the linked list
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM site_nodes');
        
        // Anti-Caché para que Vercel y el navegador siempre sirvan el cambio fresco
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching nodes:', err);
        res.status(500).json({ error: 'Failed to fetch site nodes' });
    }
});

// GET /api/nodes/:id -> Fetch a specific node
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM site_nodes WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching node:', err);
        res.status(500).json({ error: 'Failed to fetch node' });
    }
});

// PUT /api/nodes/:id/draft -> Save draft data to the DB (Double Pointer)
router.put('/:id/draft', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { draft_data } = req.body;
        
        const result = await pool.query(`
            INSERT INTO site_nodes (id, draft_data, updated_at)
            VALUES ($2, $1, NOW())
            ON CONFLICT (id) DO UPDATE 
            SET draft_data = EXCLUDED.draft_data, updated_at = EXCLUDED.updated_at
            RETURNING *
        `, [draft_data, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
        
        await logAction(req.admin.id, 'SAVE_DRAFT', { section: id });
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving draft:', err);
        res.status(500).json({ error: 'Failed to save draft data' });
    }
});

// POST /api/nodes/:id/publish -> Swap draft to published
router.post('/:id/publish', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Copy draft_data to published_data
        const result = await pool.query(`
            UPDATE site_nodes
            SET published_data = draft_data, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
        
        await logAction(req.admin.id, 'PUBLISH_SECTION', { section: id });
        
        res.json({ success: true, node: result.rows[0] });
    } catch (err) {
        console.error('Error publishing node:', err);
        res.status(500).json({ error: 'Failed to publish node data' });
    }
});

// PUT /api/nodes/:id/reorder -> Modify next_node_id pointer
router.put('/:id/reorder', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { next_node_id } = req.body;
        
        const result = await pool.query(`
            UPDATE site_nodes
            SET next_node_id = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [next_node_id || null, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error reordering node:', err);
        res.status(500).json({ error: 'Failed to reorder node' });
    }
});

export default router;
