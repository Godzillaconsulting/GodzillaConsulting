import express from 'express';
import pool from '../config/db.js';

import { requireAdmin } from '../middleware/adminAuth.js';
import { logAction } from './users.js';
import { translateNodePayload } from '../services/translateService.js';
import { ensureNodesTranslation } from '../utils/nodeTranslator.js';

const router = express.Router();

// ===================================
// ADMIN PRESENCE (SSE & Lock State)
// ===================================
const presenceClients = new Set();
let activePresences = {}; // { [nodeId]: { user: 'oscar', ts: timestamp } }

function broadcastPresence() {
    const payload = JSON.stringify({ type: 'PRESENCE_SYNC', activePresences });
    for (const client of presenceClients) {
        try { client.res.write(`data: ${payload}\n\n`); }
        catch (e) { presenceClients.delete(client); }
    }
}

// Limpieza automática cada minuto de presencias fantasma (locks abandonados)
setInterval(() => {
    let changed = false;
    const now = Date.now();
    for (const [nodeId, data] of Object.entries(activePresences)) {
        if (now - data.ts > 60000 * 5) { // 5 min timeout
            delete activePresences[nodeId];
            changed = true;
        }
    }
    if (changed) broadcastPresence();
}, 60000);

// GET /api/nodes/stream/presence  (SSE)
// NOTA: Debe ir antes que /:id
router.get('/stream/presence', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: Date.now() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'PRESENCE_SYNC', activePresences })}\n\n`);

    const client = { id: Date.now(), res };
    presenceClients.add(client);

    const heartbeat = setInterval(() => {
        try { res.write(`: ping\n\n`); } catch(e) { clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        presenceClients.delete(client);
    });
});

// POST /api/nodes/presence
router.post('/presence', requireAdmin, (req, res) => {
    const { nodeId, action, user } = req.body;
    if (!nodeId || !user) return res.status(400).json({error: 'nodeId and user required'});
    
    if (action === 'claim') {
        activePresences[nodeId] = { user, ts: Date.now() };
    } else if (action === 'release') {
        if (activePresences[nodeId] && activePresences[nodeId].user === user) {
            delete activePresences[nodeId];
        }
    } else if (action === 'heartbeat') {
        if (activePresences[nodeId] && activePresences[nodeId].user === user) {
            activePresences[nodeId].ts = Date.now();
        }
    }
    
    broadcastPresence();
    res.json({ success: true, activePresences });
});

// GET /api/nodes -> Fetch all nodes in the linked list
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM site_nodes');
        const lng = (req.query.lng || 'es').split('-')[0].toLowerCase();
        
        // Procesador JIT multi-lenguaje (asegurar capa de traduccion)
        const processedRows = await ensureNodesTranslation(result.rows, lng);
        
        // Anti-Caché para que Vercel y el navegador siempre sirvan el cambio fresco
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json(processedRows);
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
        let { draft_data } = req.body;
        
        // Auto-Translate marketing dynamic nodes
        if (id === 'paquetes' || id.startsWith('paquete-')) {
            const translatedPayload = await translateNodePayload(draft_data, id);
            
            // Obtener el nodo actual para no perder traducciones si falla Gemini
            const current = await pool.query('SELECT draft_data, published_data FROM site_nodes WHERE id = $1', [id]);
            const prevDraftTranslations = current.rows[0]?.draft_data?.translations || {};
            const prevPublishedTranslations = current.rows[0]?.published_data?.translations || {};
            
            // Consolidamos para que JIT (que guarda en published_data) no sea sobrescrito
            const consolidatedTranslations = { ...prevPublishedTranslations, ...prevDraftTranslations };

            draft_data = {
                ...draft_data,
                translations: {
                    ...consolidatedTranslations,
                    ...(translatedPayload ? { en: translatedPayload } : {})
                }
            };
        }
        
        const result = await pool.query(`
            INSERT INTO site_nodes (id, draft_data, updated_at)
            VALUES ($2, $1, NOW())
            ON CONFLICT (id) DO UPDATE 
            SET draft_data = EXCLUDED.draft_data, updated_at = EXCLUDED.updated_at
            RETURNING *
        `, [draft_data, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Node not found' });
        
        // Se eliminó el log de SAVE_DRAFT para no inundar la auditoría
        
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
        
        // Se eliminó el log de PUBLISH_SECTION para no inundar la auditoría
        
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
