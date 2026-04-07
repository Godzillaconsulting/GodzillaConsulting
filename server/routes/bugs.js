import express from 'express';
import pool from '../config/db.js';
import { verifyAdminToken } from '../middleware/adminAuth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let ARCHIVOS_PESADOS_DIR = path.join(__dirname, '..', 'uploads', 'assets');
try { if (!fs.existsSync(ARCHIVOS_PESADOS_DIR)) fs.mkdirSync(ARCHIVOS_PESADOS_DIR, { recursive: true }); } catch (e) {}

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

        let finalUrl = screenshot_url;

        // Si envía un Base64 grande, lo escribimos al disco duro local para NO inflar PostgreSQL (Costos: $0)
        if (screenshot_url && screenshot_url.startsWith('data:image')) {
            try {
                const base64Data = screenshot_url.replace(/^data:image\/\w+;base64,/, "");
                const ext = screenshot_url.split(';')[0].split('/')[1] || 'png';
                const filename = `bug_evidence_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
                const filepath = path.join(ARCHIVOS_PESADOS_DIR, filename);
                
                fs.writeFileSync(filepath, base64Data, 'base64');
                finalUrl = `/api/media/assets/${filename}`;
                console.log(`[Bugs] Evidencia guardada en disco local: ${finalUrl}`);
            } catch (err) {
                console.error("[Bugs] Error escupiendo archivo al disco, fallback a base64.", err);
            }
        }
        
        const r = await pool.query(`
            INSERT INTO it_bugs (description, priority, screenshot_url, reporter_username, path_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [description, priority || 'media', finalUrl, reporter, path_url]);
        
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
