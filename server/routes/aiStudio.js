import express from 'express';
import { generateRenderJob, checkRenderStatus } from '../controllers/aiStudioController.js';
import { verifyAdminToken as authenticateToken, requireCM } from '../middleware/adminAuth.js';
import pool from '../config/db.js';

const router = express.Router();

// ==========================================
// Integraciones de API Externas (Kling/Flow)
// ==========================================
router.post('/generate', authenticateToken, generateRenderJob);
router.get('/status/:taskId', authenticateToken, checkRenderStatus);

// ==========================================
// Tareas del Studio (Neon DB)
// ==========================================

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

// POST: Admin crea una nueva tarea (Script/Guion)
router.post('/tasks', authenticateToken, requireCM, async (req, res) => {
    try {
        const { title, prompt, assigned_to, tags, priority, content_type, ig_publish_date } = req.body;
        
        const query = `
            INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, content_type, ig_publish_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        
        const values = [
            title, 
            prompt, 
            assigned_to || 'alex_cockers', 
            JSON.stringify(tags || []),
            priority || 'Media',
            content_type || 'Video',
            ig_publish_date || null
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, task: result.rows[0] });
    } catch (error) {
        console.error('Error POST /tasks:', error);
        res.status(500).json({ success: false, message: 'Error al crear tarea', error: error.message });
    }
});

// PUT: Actualizar estado, anexar media generada (Kling/Nano) o fijar fecha programada para publicar
router.put('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, media_payload, publish_targets, ig_publish_date } = req.body;

        const taskRes = await pool.query('SELECT * FROM studio_tasks WHERE id = $1', [id]);
        if (taskRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        
        const currentTask = taskRes.rows[0];

        // Solo actualizar los campos explícitos, sino mantener los que existen
        const updatedStatus = status !== undefined ? status : currentTask.status;
        const updatedMedia = media_payload !== undefined ? JSON.stringify(media_payload) : currentTask.media_payload;
        const updatedTargets = publish_targets !== undefined ? JSON.stringify(publish_targets) : currentTask.publish_targets;
        const updatedIgDate = ig_publish_date !== undefined ? ig_publish_date : currentTask.ig_publish_date;

        const query = `
            UPDATE studio_tasks 
            SET status = $1, media_payload = $2, publish_targets = $3, ig_publish_date = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *;
        `;

        const values = [updatedStatus, updatedMedia, updatedTargets, updatedIgDate, id];
        const result = await pool.query(query, values);

        res.json({ success: true, task: result.rows[0] });
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
