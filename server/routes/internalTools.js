// ============================================================
// server/routes/internalTools.js
// Endpoints internos protegidos — solo accesibles desde Vercel
// Ejecutan operaciones de DB, Calendar y Email, y GOYI context
// ============================================================

import express from 'express';
import pool from '../config/db.js';
import { agendarEnGoogleCalendar } from '../services/calendarService.js';
import { sendCitaConfirmationEmail } from '../services/emailService.js';

const router = express.Router();
const INTERNAL_SECRET = process.env.PROXY_SECRET || 'Zilla-5uper-S3cr3t-2026';

// ── Middleware: solo acepta requests del proxy de Vercel ──────
router.use((req, res, next) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== INTERNAL_SECRET) {
        console.warn('[Internal] Acceso denegado desde:', req.ip);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
});

// ── POST /api/internal/execute-tool ──────────────────────────
router.post('/execute-tool', async (req, res) => {
    const { name, args = {} } = req.body;
    let fRes = { error: 'Tool desconocida' };

    try {
        if (name === 'check_availability') {
            const { fecha, hora } = args;
            const start = new Date(`${fecha}T${hora}:00`);
            const end   = new Date(start.getTime() + 60 * 60 * 1000);
            const r = await pool.query(
                `SELECT id FROM appointments WHERE fecha = $1 AND hora = $2 AND status != 'cancelled'`,
                [fecha, hora]
            );
            fRes = { disponible: r.rows.length === 0, fecha, hora, mensaje: r.rows.length === 0 ? '✅ Horario disponible.' : '❌ Ese horario ya está ocupado. Sugiere otro.' };

        } else if (name === 'save_appointment') {
            const { nombre, correo, telefono, servicio, fecha, hora, notas } = args;
            const startDate = new Date(`${fecha}T${hora}:00-06:00`);
            const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000);

            let calendarId = null;
            try {
                calendarId = await agendarEnGoogleCalendar({ nombre, correo, telefono, servicio, fecha, hora, notas, startDate, endDate });
            } catch (calErr) {
                console.error('[Internal] Calendar error:', calErr.message);
            }

            const r = await pool.query(
                `INSERT INTO appointments (nombre, correo, telefono, servicio, fecha, hora, notas, google_event_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirmed') RETURNING id`,
                [nombre, correo, telefono, servicio, fecha, hora, notas || '', calendarId]
            );

            try {
                await sendCitaConfirmationEmail({ nombre, correo, servicio, fecha, hora });
            } catch (mailErr) {
                console.error('[Internal] Email error:', mailErr.message);
            }

            fRes = { success: true, appointment_id: r.rows[0].id, calendar_event_id: calendarId, message: `✅ Cita confirmada para ${nombre} el ${fecha} a las ${hora}.` };

        } else if (name === 'cancel_appointment') {
            const { telefono } = args;
            const r = await pool.query(
                `UPDATE appointments SET status='cancelled' WHERE telefono=$1 AND status='confirmed' RETURNING id`,
                [telefono]
            );
            fRes = r.rows.length > 0
                ? { success: true, message: '✅ Cita cancelada.' }
                : { success: false, message: '❌ No se encontró cita activa para ese teléfono.' };

        } else if (name === 'reschedule_appointment') {
            const { telefono, nueva_fecha, nueva_hora } = args;
            const r = await pool.query(
                `UPDATE appointments SET fecha=$1, hora=$2 WHERE telefono=$3 AND status='confirmed' RETURNING id`,
                [nueva_fecha, nueva_hora, telefono]
            );
            fRes = r.rows.length > 0
                ? { success: true, message: `✅ Cita reagendada al ${nueva_fecha} a las ${nueva_hora}.` }
                : { success: false, message: '❌ No se encontró cita activa para reagendar.' };

        } else if (name === 'get_available_downloads') {
            const r = await pool.query('SELECT title, slug FROM lead_magnets');
            fRes = { resources: r.rows };
        }
    } catch (err) {
        console.error(`[Internal] Error en tool "${name}":`, err.message);
        fRes = { error: err.message };
    }

    res.json(fRes);
});

// ── GET /api/internal/goyi-context ───────────────────────────
router.get('/goyi-context', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT original_prompt, improved_prompt FROM goyi_learning WHERE context_type='goyi_chat' ORDER BY id DESC LIMIT 6`
        );
        res.json(r.rows.reverse());
    } catch (e) {
        res.json([]);
    }
});

// ── POST /api/internal/goyi-learn ────────────────────────────
router.post('/goyi-learn', async (req, res) => {
    const { prompt, response } = req.body;
    try {
        await pool.query(
            `INSERT INTO goyi_learning (original_prompt, improved_prompt, context_type) VALUES ($1, $2, 'goyi_chat')`,
            [prompt, response]
        );
        res.json({ ok: true });
    } catch (e) {
        res.json({ ok: false });
    }
});

export default router;
