/**
 * /api/calendar — Router del Calendario Colaborativo en Tiempo Real
 *
 * Endpoints:
 *   GET    /api/calendar/events           → Traer todos los eventos (filtros opcionales)
 *   POST   /api/calendar/events           → Crear nuevo evento (CM/Superadmin)
 *   PUT    /api/calendar/events/:id       → Actualizar evento
 *   PUT    /api/calendar/events/:id/reschedule → Mover fecha (Drag-and-Drop)
 *   DELETE /api/calendar/events/:id       → Eliminar evento (Superadmin)
 *   POST   /api/calendar/events/:id/comments  → Agregar comentario
 *   GET    /api/calendar/events/stream    → SSE — push en tiempo real
 */

import express from 'express';
import pool from '../config/db.js';
import {
    verifyAdminToken as authenticateToken,
    requireCM,
    requireSuperAdmin
} from '../middleware/adminAuth.js';

const router = express.Router();

// ─── SSE: Registro de clientes conectados ────────────────────────────────────
const sseClients = new Set();

/**
 * Envía un mensaje a TODOS los clientes SSE conectados.
 * @param {string} type  CREATE | UPDATE | DELETE | RESCHEDULE
 * @param {object} event El evento completo que cambió
 */
function broadcast(type, event) {
    const payload = JSON.stringify({ type, event });
    for (const client of sseClients) {
        try {
            client.res.write(`data: ${payload}\n\n`);
        } catch (e) {
            // Si el cliente se desconectó silenciosamente, lo quitamos
            sseClients.delete(client);
        }
    }
}

// ─── Helper: mapear fila de DB → shape del cliente ───────────────────────────
function mapRow(row) {
    return {
        id: row.id,
        title: row.title,
        platform: row.platform,
        status: row.status,
        caption: row.caption,
        media_url: row.media_url,
        provider: row.provider,
        start: new Date(row.start_date),
        end: row.end_date ? new Date(row.end_date) : new Date(row.start_date),
        start_date: row.start_date,
        end_date: row.end_date,
        empresa: row.empresa,
        assigned_to: row.assigned_to,
        created_by: row.created_by,
        comments: typeof row.comments === 'string' ? JSON.parse(row.comments) : (row.comments || []),
        is_rescheduled: row.is_rescheduled,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/events/stream  — SSE (DEBE ir ANTES de /:id para no confundir)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/events/stream', (req, res) => {
    // Autenticación via query param (EventSource no soporta headers customizados)
    const token = req.query.token;
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    // Configurar headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Necesario con Nginx/Cloudflare
    res.flushHeaders();

    // Enviar heartbeat inicial para confirmar conexión
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: Date.now() })}\n\n`);

    // Registrar cliente
    const client = { id: Date.now(), res };
    sseClients.add(client);
    console.log(`[SSE Calendar] Cliente conectado. Total: ${sseClients.size}`);

    // Heartbeat cada 25s para prevenir timeout de Cloudflare/proxies
    const heartbeat = setInterval(() => {
        try {
            res.write(`: ping\n\n`);
        } catch (e) {
            clearInterval(heartbeat);
        }
    }, 25000);

    // Cleanup al desconectar
    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(client);
        console.log(`[SSE Calendar] Cliente desconectado. Total: ${sseClients.size}`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/events  — Trae todos los eventos con filtros opcionales
// ─────────────────────────────────────────────────────────────────────────────
router.get('/events', authenticateToken, async (req, res) => {
    try {
        const { platform, empresa, from, to } = req.query;
        let query = 'SELECT * FROM calendar_events WHERE 1=1';
        const values = [];

        if (platform && platform !== 'ALL') {
            values.push(platform);
            query += ` AND platform = $${values.length}`;
        }

        if (empresa) {
            values.push(empresa);
            query += ` AND empresa = $${values.length}`;
        }

        if (from) {
            values.push(from);
            query += ` AND start_date >= $${values.length}`;
        }

        if (to) {
            values.push(to);
            query += ` AND start_date <= $${values.length}`;
        }

        query += ' ORDER BY start_date ASC';

        const result = await pool.query(query, values);
        let events = result.rows.map(mapRow);

        // Fetch CITAS to mix them into the calendar
        let citasQuery = "SELECT * FROM citas WHERE status != 'cancelada'";
        const citasValues = [];
        if (from) { citasValues.push(from); citasQuery += ` AND fecha >= $${citasValues.length}`; }
        if (to) { citasValues.push(to); citasQuery += ` AND fecha <= $${citasValues.length}`; }
        
        try {
            const citasResult = await pool.query(citasQuery, citasValues);
            const citasEvents = citasResult.rows.map(cita => {
                const startDateTime = new Date(`${cita.fecha}T${cita.hora}:00`);
                const endDateTime = new Date(startDateTime.getTime() + 60*60*1000); // +1 hour

                return {
                    id: `cita_${cita.id}`, 
                    title: `📞 VENTA: ${cita.nombre_completo} (${cita.tipo_sesion})`,
                    platform: cita.origen || 'Web',
                    status: 'published', 
                    caption: `📞 Tel: ${cita.telefono}\n📧 Email: ${cita.email}\n📝 Notas: ${cita.notas_adicionales || 'Sin notas'}`,
                    media_url: null,
                    provider: null,
                    start: startDateTime,
                    end: endDateTime,
                    start_date: cita.fecha,
                    end_date: cita.fecha,
                    empresa: 'godzilla',
                    assigned_to: 'oscar',
                    created_by: 'bot',
                    comments: [],
                    is_rescheduled: false,
                    created_at: cita.created_at || startDateTime,
                    updated_at: startDateTime,
                    is_cita: true
                };
            });
            events = events.concat(citasEvents);
        } catch (cErr) {
            console.error('[Calendar] Error fetching citas:', cErr.message);
        }

        // Ordenar todos juntos cronológicamente
        events.sort((a, b) => a.start - b.start);

        res.json({ success: true, events });
    } catch (err) {
        console.error('[Calendar] GET /events error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/events  — Crear nuevo evento
// ─────────────────────────────────────────────────────────────────────────────
router.post('/events', authenticateToken, requireCM, async (req, res) => {
    try {
        const {
            title, platform, status, caption, media_url, provider,
            start_date, end_date, empresa, assigned_to
        } = req.body;

        if (!title || !start_date) {
            return res.status(400).json({ success: false, error: 'title y start_date son requeridos' });
        }

        const created_by = req.user?.username || 'admin';

        const result = await pool.query(
            `INSERT INTO calendar_events
                (title, platform, status, caption, media_url, provider, start_date, end_date, empresa, assigned_to, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                title,
                platform || 'ALL',
                status || 'warning',
                caption || null,
                media_url || null,
                provider || null,
                start_date,
                end_date || start_date,
                empresa || 'godzilla',
                assigned_to || null,
                created_by
            ]
        );

        const newEvent = mapRow(result.rows[0]);

        // 📡 Notificar a todos en tiempo real
        broadcast('CREATE', newEvent);

        res.status(201).json({ success: true, event: newEvent });
    } catch (err) {
        console.error('[Calendar] POST /events error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/events/:id/reschedule  — Mover a nueva fecha (Drag-and-Drop)
// IMPORTANTE: Este route debe ir ANTES de PUT /:id para no ser capturado por él
// ─────────────────────────────────────────────────────────────────────────────
router.put('/events/:id/reschedule', authenticateToken, requireCM, async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.body;

        if (!start_date) {
            return res.status(400).json({ success: false, error: 'start_date requerido' });
        }

        const result = await pool.query(
            `UPDATE calendar_events
             SET start_date = $1, end_date = $2, is_rescheduled = TRUE, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [start_date, end_date || start_date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Evento no encontrado' });
        }

        const updated = mapRow(result.rows[0]);
        broadcast('RESCHEDULE', updated);

        res.json({ success: true, event: updated });
    } catch (err) {
        console.error('[Calendar] PUT /events/:id/reschedule error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/events/:id/comments  — Agregar comentario
// ─────────────────────────────────────────────────────────────────────────────
router.post('/events/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const author = req.user?.username || 'admin';

        if (!text?.trim()) {
            return res.status(400).json({ success: false, error: 'text requerido' });
        }

        const newComment = {
            id: Date.now(),
            author,
            text,
            time: new Date().toISOString()
        };

        // Append al JSONB existente
        const result = await pool.query(
            `UPDATE calendar_events
             SET comments = comments || $1::jsonb, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify([newComment]), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Evento no encontrado' });
        }

        const updated = mapRow(result.rows[0]);
        broadcast('UPDATE', updated);

        res.json({ success: true, event: updated, comment: newComment });
    } catch (err) {
        console.error('[Calendar] POST /events/:id/comments error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/events/:id  — Actualizar evento
// ─────────────────────────────────────────────────────────────────────────────
router.put('/events/:id', authenticateToken, requireCM, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, platform, status, caption, media_url, provider, assigned_to, empresa } = req.body;

        // Traer el evento actual para hacer merge
        const current = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Evento no encontrado' });
        }

        const c = current.rows[0];

        const result = await pool.query(
            `UPDATE calendar_events
             SET title       = $1,
                 platform    = $2,
                 status      = $3,
                 caption     = $4,
                 media_url   = $5,
                 provider    = $6,
                 assigned_to = $7,
                 empresa     = $8,
                 updated_at  = NOW()
             WHERE id = $9
             RETURNING *`,
            [
                title ?? c.title,
                platform ?? c.platform,
                status ?? c.status,
                caption ?? c.caption,
                media_url ?? c.media_url,
                provider ?? c.provider,
                assigned_to ?? c.assigned_to,
                empresa ?? c.empresa,
                id
            ]
        );

        const updated = mapRow(result.rows[0]);
        broadcast('UPDATE', updated);

        res.json({ success: true, event: updated });
    } catch (err) {
        console.error('[Calendar] PUT /events/:id error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/events/:id  — Eliminar evento (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/events/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM calendar_events WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Evento no encontrado' });
        }

        broadcast('DELETE', { id: parseInt(id) });

        res.json({ success: true, deleted: true });
    } catch (err) {
        console.error('[Calendar] DELETE /events/:id error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
