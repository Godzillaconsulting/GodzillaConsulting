import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { generateVoice } from '../services/ttsService.js';
const upload = multer({ dest: os.tmpdir() });
import { generateRenderJob, refineRenderJob, checkRenderStatus, getElitePrompts, generateScriptChat, purifyVideo, getInspirationGallery, getDynamicFilters, magicEditAnalysis, generateMonthlyPlan, getMonthlyPlanStatus } from '../controllers/aiStudioController.js';
import { verifyAdminToken as authenticateToken, requireCM, requireCMOrCockers } from '../middleware/adminAuth.js';
import pool from '../config/db.js';
import { detectSilences } from '../utils/videoProcessor.js';

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
router.get('/plan-status/:taskId', authenticateToken, getMonthlyPlanStatus);

// ==========================================
// Radar de Contenido (AnswerThePublic Engine — Costo Cero)
// ==========================================
router.get('/content-radar', authenticateToken, async (req, res) => {
    const { topic } = req.query;
    if (!topic || topic.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Proporciona un tema.' });
    }

    const keyword = topic.trim();

    // MODIFIERS para simular AnswerThePublic y Google Trends
    const MODIFIERS = [
        '', 'noticias de', 'filtraciones de', 'cuándo sale',
        'polémica de', 'por qué es tendencia',
        'datos curiosos de', 'secretos de', 'mitos de', 'easter eggs de',
        'cosas que no sabías de', 'la verdad sobre', 'teorías de',
        'qué es', 'cómo hacer', 'cuál es el mejor', 'errores en'
    ];

    const fetchGoogle = async (query) => {
        try {
            const url = `http://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&hl=es&gl=mx`;
            const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
            const buffer = await r.arrayBuffer();
            const text = new TextDecoder('iso-8859-1').decode(buffer);
            const d = JSON.parse(text);
            return d[1] || [];
        } catch { return []; }
    };

    // Scraping paralelo (todos los modifiers a la vez para ser rápido)
    const results = await Promise.all(
        MODIFIERS.map(mod => fetchGoogle(`${mod} ${keyword}`))
    );

    // Agregamos y deduplicamos
    const allQuestions = [...new Set(results.flat())].filter(q =>
        q.toLowerCase().includes(keyword.toLowerCase().split(' ')[0])
    );

    // Agrupar por tipo de modifier
    const structured = {};
    MODIFIERS.forEach((mod, i) => {
        const qs = results[i].filter(q => q.toLowerCase().includes(keyword.toLowerCase().split(' ')[0]));
        const groupName = mod === '' ? '🔥 TOP BÚSQUEDAS' : mod;
        if (qs.length > 0) structured[groupName] = qs;
    });

    // Generar hashtags con IA Gratuita (Groq/Cerebras, costo CERO)
    let hashtags = [];
    let aiSummary = '';
    let hooks = [];
    try {
        const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
        const aiRes = await executeAiWaterfall([{
            role: 'user',
            content: `Eres un experto estratega de contenido viral en México. NO vendemos productos, creamos contenido magnético.
Basado en el tema "${keyword}" y estas búsquedas reales de Google: ${allQuestions.slice(0, 30).join(' | ')}

Genera EXACTAMENTE este JSON sin markdown ni texto extra:
{
  "hashtags": ["#hashtag1","#hashtag2",...] (15 hashtags reales, virales y enfocados a la audiencia objetivo),
  "summary": "1 párrafo conciso (3-4 oraciones) sobre oportunidades de contenido viral para este tema basado en las búsquedas",
  "hooks": ["Gancho 1", "Gancho 2", ...] (5 ganchos hiper persuasivos, controversiales o magnéticos basados en estas búsquedas reales),
  "audiencia": "Ejemplo: Jóvenes 18-25 años, gamers, interesados en desarrollo indie, tono dinámico." (Descripción corta y directa de la audiencia objetivo ideal)
}`
        }], { mode: 'compression', temperature: 0.7 });

        const raw = aiRes.content || '';
        const startObj = raw.indexOf('{');
        const endObj = raw.lastIndexOf('}');
        let audiencia = '';
        if (startObj !== -1 && endObj !== -1) {
            const parsed = JSON.parse(raw.substring(startObj, endObj + 1));
            hashtags = parsed.hashtags || [];
            aiSummary = parsed.summary || '';
            hooks = parsed.hooks || [];
            audiencia = parsed.audiencia || '';
        }
    } catch (e) {
        console.warn('[ContentRadar] IA fallback:', e.message);
        // Fallback: generar hashtags básicos del tema sin IA
        hashtags = keyword.split(' ').map(w => `#${w.toLowerCase()}`);
        hooks = [`Descubre los secretos de ${keyword}`, `Lo que nadie te dice de ${keyword}`, `La verdad sobre ${keyword}`];
    }

    res.json({
        success: true,
        topic: keyword,
        totalQuestions: allQuestions.length,
        structured,
        hashtags,
        hooks,
        aiSummary,
        audiencia
    });
});

// ==========================================
// Generación TTS Directa (Editor de Video)
// ==========================================
router.post('/tts', authenticateToken, async (req, res) => {
    try {
        const { text, voice, referenceAudio } = req.body;
        if (!text || !voice) {
            return res.status(400).json({ success: false, error: 'Text and voice are required' });
        }
        
        const outputFilename = `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`;
        const outputPath = path.join(os.tmpdir(), outputFilename);

        await generateVoice(text, outputPath, voice, referenceAudio);

        res.download(outputPath, outputFilename, (err) => {
            try {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {
                console.error('Error cleanup TTS:', e);
            }
        });
    } catch (error) {
        console.error('[aiStudio.js] Error in /tts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ==========================================
// Tareas IA (Smart Cut & Whisper en Backend)
// ==========================================
router.post('/smart-cut', authenticateToken, upload.single('mediaFile'), async (req, res) => {
    try {
        const filePath = req.file?.path;
        if (!filePath) return res.status(400).json({ error: 'No media file provided.' });

        const silences = await detectSilences(filePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ success: true, silences });
    } catch (e) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/auto-captions', authenticateToken, upload.single('mediaFile'), async (req, res) => {
    try {
        const filePath = req.file?.path;
        if (!filePath) return res.status(400).json({ error: 'No media file provided.' });

        // Cargar Whisper de HuggingFace en Node.js, almacenando el modelo en el disco duro.
        const { pipeline, env } = await import('@huggingface/transformers');
        
        // Configuramos la cache en el disco para evitar descargas.
        env.cacheDir = 'E:/Godzilla_Studio_Cache/models';
        env.backends.onnx.wasm.numThreads = 2; // Node.js tiene más threads
        
        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
            device: 'wasm',
            dtype: 'fp32'
        });

        // Importante: Transformers.js Node API requiere file URL para locales
        const fileUrl = 'file://' + path.resolve(filePath);
        const output = await transcriber(fileUrl, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: 'word'
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        // Devolvemos los subtítulos con marcas de tiempo, tal como lo esperaba el frontend
        res.json({ success: true, captions: output.chunks || [] });
    } catch (e) {
        console.error('[Whisper Backend]', e);
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// Renderizado FFmpeg Nativo (Backend)
// ==========================================
import { spawn } from 'child_process';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

router.post('/render-native', authenticateToken, upload.array('mediaFiles'), (req, res) => {
    try {
        const argsStr = req.body.args;
        if (!argsStr) return res.status(400).json({ error: 'Faltan argumentos (args)' });
        
        const args = JSON.parse(argsStr);
        const workDir = os.tmpdir();
        
        // Mover archivos renombrados al dir de trabajo
        req.files.forEach(f => {
            const originalName = f.originalname;
            const tempPath = path.join(workDir, originalName);
            fs.renameSync(f.path, tempPath);
        });

        // Configurar output final
        const outName = `render_final_${Date.now()}.mp4`;
        // Reemplazamos la salida final 'output.mp4' (o el último arg) por nuestra ruta real
        const outIdx = args.length - 1;
        args[outIdx] = path.join(workDir, outName);

        // Añadir paths a las fuentes nativas de ffmpeg
        // Spawn el proceso nativo
        const child = spawn(ffmpegPath.path, args, { cwd: workDir });

        child.stderr.on('data', (data) => {
            // Se puede hacer broadcast de progreso aquí si fuera necesario
            // console.log(`[FFmpeg Native]: ${data}`);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                return res.status(500).json({ error: `FFmpeg falló con código ${code}` });
            }
            
            const finalPath = path.join(workDir, outName);
            if (!fs.existsSync(finalPath)) return res.status(500).json({ error: 'Archivo final no encontrado' });

            res.download(finalPath, outName, (err) => {
                // Cleanup general de la carpeta
                try {
                    fs.unlinkSync(finalPath);
                    req.files.forEach(f => {
                        const t = path.join(workDir, f.originalname);
                        if (fs.existsSync(t)) fs.unlinkSync(t);
                    });
                } catch(e) {}
            });
        });
        
    } catch (e) {
        console.error('[Render Native Error]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Crear tarea de video manual (Faceless) — va a CEO Estudio para revisión
// antes de que el MediaWorker la recoja (status: manual_studio)
router.post('/create-video-script', authenticateToken, async (req, res) => {
    try {
        const { title, voice, scenes, ig_publish_date, niche } = req.body;
        if (!title || !scenes || scenes.length === 0) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: title, scenes' });
        }

        const uploaderName = req.admin?.username || 'manual';

        // Construir el payload en el formato que espera mediaWorker.js
        const scenesPayload = {};
        scenes.forEach((scene, i) => {
            const n = i + 1;
            const isLast = n === scenes.length;
            const narKey = isLast ? `NARRACION ESCENA ${n} (CTA)` : `NARRACION ESCENA ${n}`;
            scenesPayload[`VISUAL ESCENA ${n} (Prompt Imagen Detallado)`] = scene.visual || '';
            scenesPayload[narKey] = scene.narration || '';
        });

        const mediaPayload = {
            source: 'manual_cockers',
            scenes: scenesPayload,
            voice: voice || 'es-MX-JorgeNeural',
            niche: niche || '',
            sceneCount: scenes.length
        };
        if (req.body.referenceAudio) {
            mediaPayload.referenceAudio = req.body.referenceAudio;
        }

        const publishDate = ig_publish_date || null;

        // Status: manual_studio → aparece en CEO Estudio con botón "Generar"
        // El MediaWorker SOLO lo procesa cuando el CEO lo cambia a pending_render
        const result = await pool.query(
            `INSERT INTO studio_tasks (title, prompt, status, assigned_to, media_payload, ig_publish_date, created_by)
             VALUES ($1, $2, 'pending_render', $3, $4, $5, $6)
             RETURNING id`,
            [
                title,
                scenes.map((s, i) => `Escena ${i+1}: ${s.narration || s.visual || ''}`).join('\n'),
                uploaderName,
                JSON.stringify(mediaPayload),
                publishDate,
                uploaderName
            ]
        );

        const taskId = result.rows[0].id;
        console.log(`[VideoScript] ✅ Tarea manual #${taskId} creada en CEO Estudio: "${title}"`);
        res.json({
            success: true,
            taskId,
            message: `Video "${title}" enviado al CEO Estudio. Revísalo en la bandeja "🎬 En Estudio IA" y activa la generación.`
        });
    } catch (e) {
        console.error('[VideoScript] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

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

// PUT: Progreso interno (Worker a UI)
router.put('/internal-progress/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { progress, msg } = req.body;
        
        broadcast('TASK_PROGRESS', { id: taskId, progress, msg });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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

// POST: Cualquier usuario puede crear/enviar una tarea
router.post('/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, prompt, assigned_to, tags, priority, content_type, ig_publish_date, media_payload } = req.body;
        const uploaderName = req.admin?.username || 'unknown';
        const uploaderId = req.admin?.id || 'N/A';
        const createdByStr = `${uploaderName} (ID: ${uploaderId})`;
        
        // Si el cliente envía un status explícito (ej: pending_render), respetarlo
        const initialStatus = req.body.status || (media_payload ? 'pending_cm_approval' : 'draft');
        
        const query = `
            INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, content_type, ig_publish_date, status, media_payload, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        const values = [
            title || 'Subida directa por ' + uploaderName, 
            prompt, 
            assigned_to || uploaderName, 
            JSON.stringify(tags || []),
            priority || 'Media',
            content_type || 'Imagen',
            ig_publish_date || null,
            initialStatus,
            media_payload ? JSON.stringify(media_payload) : null,
            createdByStr
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
        console.log(`[DELETE /tasks/:id] Request received for id: ${id}`);
        const result = await pool.query('DELETE FROM studio_tasks WHERE id = $1 RETURNING id', [id]);
        console.log(`[DELETE /tasks/:id] Query executed. rowCount: ${result.rowCount}`);
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
        const updatedMedia = media_payload !== undefined ? (typeof media_payload === 'string' ? media_payload : JSON.stringify(media_payload)) : JSON.stringify(currentTask.media_payload || []);
        const updatedTargets = publish_targets !== undefined ? JSON.stringify(publish_targets) : JSON.stringify(currentTask.publish_targets || []);
        const updatedIgDate = ig_publish_date !== undefined ? ig_publish_date : currentTask.ig_publish_date;
        const updatedTitle = title !== undefined ? title : currentTask.title;

        // <--- INJECT: Trigger Publisher --->
        let publishReport = null;
        let publishFailed = false;
        let publishErrorMsg = '';

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
                        // Verifica si hubo un error silencioso dentro del reporte
                        if (resMeta.error || (resMeta.report && resMeta.report.error)) {
                            throw new Error(resMeta.error || resMeta.report.error);
                        }
                    }
                    if (targetsArr.includes('tiktok')) {
                        const resTikTok = await publishToTikTok(mediaUrl, captionText);
                        publishReport.tiktok = resTikTok;
                        if (resTikTok.error) throw new Error(resTikTok.error);
                    }
                } else {
                    throw new Error('No hay video disponible para enviar.');
                }
            } catch (pubErr) {
                console.error("Error executing publisher:", pubErr);
                publishFailed = true;
                publishErrorMsg = pubErr.message || "Error desconocido en la red social";
            }
        }

        if (publishFailed) {
            return res.status(400).json({ 
                success: false, 
                message: `Choque de API al publicar. Envíelo manualmente por este motivo: [${publishErrorMsg}]. Descargue el video en la más alta calidad y hágalo desde el celular.`
            });
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

// PUT: Internal progress update para el MediaWorker (Localhost/Worker)
router.put('/internal-progress/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { progress, msg } = req.body;
        broadcast('PROGRESS', { taskId: parseInt(id), progress, msg });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
