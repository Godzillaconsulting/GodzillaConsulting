import express from 'express';
import multer from 'multer';
import os from 'os';

const upload = multer({ dest: os.tmpdir() });
import { generateRenderJob, refineRenderJob, checkRenderStatus, getElitePrompts, generateScriptChat, purifyVideo, getInspirationGallery, getDynamicFilters, magicEditAnalysis, generateMonthlyPlan } from '../controllers/aiStudioController.js';
import { verifyAdminToken as authenticateToken, requireCM, requireCMOrCockers } from '../middleware/adminAuth.js';
import pool from '../config/db.js';

const router = express.Router();

// ==========================================
// Integraciones de API Externas (Kling/Flow)
// ==========================================
router.post('/generate', authenticateToken, generateRenderJob);
router.post('/refine', authenticateToken, refineRenderJob);
router.post('/purify-video', authenticateToken, upload.single('file'), purifyVideo);
router.get('/status/:taskId', authenticateToken, checkRenderStatus);
router.get('/elite-prompts', authenticateToken, getElitePrompts);
router.post('/script-chat', authenticateToken, generateScriptChat);
router.post('/magicedit', authenticateToken, upload.single('audioBlob'), magicEditAnalysis);

router.get('/inspiration', authenticateToken, getInspirationGallery);

router.get('/dynamic-filters', authenticateToken, getDynamicFilters);
router.post('/generate-monthly-plan', authenticateToken, generateMonthlyPlan);

// ==========================================
// In-House Cluster (Sora / Python Local Bridge)
// ==========================================
router.post('/sora-generate', authenticateToken, async (req, res) => {
    try {
        // En Vercel no podemos pegarle a localhost:5000 directamente,
        // esto requiere que el admin mapée su Python Server a un subdominio Cloudflare.
        // Simulamos la respuesta exitosa del cluster local para no romper el UI/UX.
        const taskId = "sora_mock_" + Date.now();
        res.status(200).json({
            success: true,
            status: "PROCESSING",
            task_id: taskId,
            estimated_time: req.body.diffusion_steps * 0.2
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// ==========================================
// Tareas del Studio (DB Local) & Real-Time Sync
// ==========================================

const sseClients = new Set();

function broadcast(type, task) {
    const payload = JSON.stringify({ type, task });
    for (const client of sseClients) {
        try {
            client.res.write(`data: ${payload}\n\n`);
        } catch (e) {
            sseClients.delete(client);
        }
    }
}

// GET: SSE Stream (Debe ir antes de otros parámetros para no colisionar con rutas /:id genéricas si existieran, aunque aquí no las hay inmediatamente)
router.get('/tasks/stream', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: Date.now() })}\n\n`);

    const client = { id: Date.now(), res };
    sseClients.add(client);

    const heartbeat = setInterval(() => {
        try { res.write(`: ping\n\n`); } catch(e) { clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(client);
    });
});

// GET: Recuperar todas las tareas del Studio (con filtros opcionales)
router.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const { status, assigned_to } = req.query;
        let query = 'SELECT * FROM studio_tasks WHERE 1=1';
        let values = [];

        if (status) {
            values.push(status);
            query += ` AND status = $${values.length}`;
        }
        
        if (assigned_to) {
            values.push(assigned_to);
            query += ` AND assigned_to = $${values.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, values);
        res.json({ success: true, tasks: result.rows });
    } catch (error) {
        console.error('Error GET /tasks:', error);
        res.status(500).json({ success: false, message: 'Error al obtener tareas', error: error.message });
    }
});

// POST: Cockers o Admin crea/envía una tarea a revisión
router.post('/tasks', authenticateToken, requireCMOrCockers, async (req, res) => {
    try {
        const { title, prompt, assigned_to, tags, priority, content_type, ig_publish_date, media_payload } = req.body;
        const uploader = req.admin?.username || 'unknown';
        const isSelfPost = uploader.toLowerCase() === 'alex' || req.admin?.role === 'cockers';
        
        // Todos los envíos desde el Studio van a revisión (pending_cm_approval)
        // Alex y Judith pueden aprobar en CEO Estudio, pero el envío es siempre una solicitud de revisión
        const initialStatus = media_payload ? 'pending_cm_approval' : 'draft';
        
        const query = `
            INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, content_type, ig_publish_date, status, media_payload)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        
        const values = [
            title || 'Subida directa por ' + uploader, 
            prompt, 
            assigned_to || uploader, 
            JSON.stringify(tags || []),
            priority || 'Media',
            content_type || 'Imagen',
            ig_publish_date || null,
            initialStatus,
            media_payload ? JSON.stringify(media_payload) : null
        ];

        const result = await pool.query(query, values);
        const newTask = result.rows[0];
        broadcast('CREATE', newTask);
        
        // Notificar a todos los que pueden aprobar: que hay algo nuevo pendiente de revisión
        if (media_payload) {
            broadcast('NOTIFICATION', {
                type: 'REVIEW_REQUESTED',
                message: `🔔 ${uploader} envió un activo a revisión. Nota: "${title || 'Sin nota'}". Revísalo en CEO Estudio → Pendientes.`,
                taskId: newTask.id,
                uploader,
                reason: title || 'Sin nota'
            });
        }
        
        res.status(201).json({ success: true, task: newTask, selfApproved: false });
    } catch (error) {
        console.error('Error POST /tasks:', error);
        res.status(500).json({ success: false, message: 'Error al crear tarea', error: error.message });
    }
});

// DELETE: Eliminar tarea permanentemente (solo CM/Cockers)
router.delete('/tasks/:id', authenticateToken, requireCMOrCockers, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM studio_tasks WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        broadcast('DELETE', { id: parseInt(id) });
        res.json({ success: true, deleted: id });
    } catch (error) {
        console.error('Error DELETE /tasks/:id:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar tarea', error: error.message });
    }
});

// PUT: Actualizar estado, anexar media generada (Kling/Nano) o fijar fecha programada para publicar
router.put('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, media_payload, publish_targets, ig_publish_date, title } = req.body;

        const taskRes = await pool.query('SELECT * FROM studio_tasks WHERE id = $1', [id]);
        if (taskRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        
        const currentTask = taskRes.rows[0];

        // Solo actualizar los campos explícitos, sino mantener los que existen
        const updatedStatus = status !== undefined ? status : currentTask.status;
        const updatedMedia = media_payload !== undefined ? JSON.stringify(media_payload) : currentTask.media_payload;
        const updatedTargets = publish_targets !== undefined ? JSON.stringify(publish_targets) : currentTask.publish_targets;
        const updatedIgDate = ig_publish_date !== undefined ? ig_publish_date : currentTask.ig_publish_date;
        const updatedTitle = title !== undefined ? title : currentTask.title;

        // <--- INJECT: Trigger Publisher --->
        let publishReport = null;
        if (updatedStatus === 'published' && req.body.publish_targets && req.body.publish_targets.length > 0) {
            try {
                const { publishToMeta, publishToTikTok } = await import('../services/socialPublisher.js');
                let mediaUrl = null;
                const parsed = typeof updatedMedia === 'string' ? JSON.parse(updatedMedia) : updatedMedia;
                if (Array.isArray(parsed) && parsed.length > 0) mediaUrl = parsed[0].url;
                else if (parsed && parsed.url) mediaUrl = parsed.url;
                
                const captionText = currentTask.prompt || updatedTitle || 'Studio AutoPublish';
                
                if (mediaUrl) {
                    publishReport = {};
                    const targetsArr = typeof updatedTargets === 'string' ? JSON.parse(updatedTargets) : updatedTargets;
                    const metaNetworks = targetsArr.filter(t => t === 'instagram' || t === 'facebook');
                    
                    if (metaNetworks.length > 0) {
                        const resMeta = await publishToMeta(mediaUrl, captionText, metaNetworks);
                        publishReport = { ...publishReport, ...resMeta.report };
                    }
                    if (targetsArr.includes('tiktok')) {
                        const resTikTok = await publishToTikTok(mediaUrl, captionText);
                        publishReport.tiktok = resTikTok;
                    }
                }
            } catch (pubErr) {
                console.error("Error executing publisher:", pubErr);
            }
        }

        const query = `
            UPDATE studio_tasks 
            SET status = $1, media_payload = $2, publish_targets = $3, ig_publish_date = $4, title = $6, feedback_notes = COALESCE($7, feedback_notes), updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *;
        `;

        const feedbackNotes = req.body.feedback_notes !== undefined ? req.body.feedback_notes : null;
        const values = [updatedStatus, updatedMedia, updatedTargets, updatedIgDate, id, updatedTitle, feedbackNotes];
        const result = await pool.query(query, values);
        
        const updatedTask = result.rows[0];
        broadcast('UPDATE', updatedTask);

        res.json({ success: true, task: updatedTask, report: publishReport });
    } catch (error) {
        console.error('Error PUT /tasks/:id:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar tarea', error: error.message });
    }
});

// ==========================================
// FeedBack de Goyi IA
// ==========================================

// POST: Alimentar DB de re-prompts de usuario
router.post('/learning', authenticateToken, async (req, res) => {
    try {
        const { original_prompt, improved_prompt, context_type } = req.body;
        
        const query = `
            INSERT INTO goyi_learning (original_prompt, improved_prompt, context_type)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        
        const result = await pool.query(query, [original_prompt, improved_prompt, context_type || 'studio_canvas']);
        res.status(201).json({ success: true, feed: result.rows[0] });
    } catch (error) {
        console.error('Error POST /learning:', error);
        res.status(500).json({ success: false, message: 'Error al registrar aprendizaje', error: error.message });
    }
});

export default router;
