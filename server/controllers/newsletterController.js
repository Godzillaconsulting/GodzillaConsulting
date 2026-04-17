import pool from '../config/db.js';
import { enqueueNewsletter } from '../services/emailQueue.js';

// ── POST /api/newsletter/subscribe ──────────────────────────────────────────
export const subscribe = async (req, res) => {
    try {
        const email  = req.body.email?.trim().toLowerCase();
        const name   = req.body.name?.trim() || null;
        const source = req.body.source || 'website';

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido.' });
        }

        const language = req.body.language || 'es';

        // Upsert: si ya existe y estaba desuscrito, lo reactiva
        const result = await pool.query(`
            INSERT INTO subscribers (email, name, source, status, language, subscribed_at)
            VALUES ($1, $2, $3, 'active', $4, NOW())
            ON CONFLICT (email) DO UPDATE
              SET status        = 'active',
                  subscribed_at = NOW(),
                  language      = EXCLUDED.language,
                  name          = COALESCE(EXCLUDED.name, subscribers.name)
            RETURNING id, email, status
        `, [email, name, source, language]);

        const isNew = result.rows[0].status === 'active';
        return res.json({
            success: true,
            message: isNew ? 'Suscrito exitosamente.' : 'Suscripción reactivada.',
            subscriber: result.rows[0]
        });
    } catch (err) {
        console.error('[Newsletter] Error al suscribir:', err.message);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ── GET /api/newsletter/unsubscribe?email=xxx ────────────────────────────────
export const unsubscribe = async (req, res) => {
    try {
        const email = req.query.email?.trim().toLowerCase();
        if (!email) return res.status(400).send('Email requerido.');

        await pool.query(
            `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE email = $1`,
            [email]
        );

        // Respuesta HTML amigable para quien llega desde el link del correo
        return res.send(`
            <!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:60px;background:#111;color:#fff;">
            <h2 style="color:#CC0000;">🦖 Godzilla Consulting</h2>
            <h3>Te has desuscrito exitosamente.</h3>
            <p style="color:#aaa;">El correo <strong>${email}</strong> ya no recibirá boletines.</p>
            <a href="https://godzillaconsulting.ai" style="color:#CC0000;">Volver al sitio</a>
            </body></html>
        `);
    } catch (err) {
        console.error('[Newsletter] Error al desuscribir:', err.message);
        return res.status(500).send('Error del servidor.');
    }
};

// ── GET /api/newsletter/subscribers ─────────────────────────────────────────
export const getSubscribers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, email, name, status, source, subscribed_at FROM subscribers ORDER BY subscribed_at DESC`
        );
        return res.json({ success: true, total: result.rows.length, subscribers: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /api/newsletter/send ────────────────────────────────────────────────
export const sendNewsletter = async (req, res) => {
    try {
        const { id, subject, bodyHtml, attachmentUrl } = req.body;

        if (!subject || !bodyHtml) {
            return res.status(400).json({ success: false, message: 'subject y bodyHtml son requeridos.' });
        }

        let newsletterId = id;

        if (newsletterId) {
            // Es un borrador que se está aprobando
            await pool.query(
                `UPDATE newsletters SET subject = $1, body_html = $2, attachment_url = $3, status = 'draft' WHERE id = $4`,
                [subject, bodyHtml, attachmentUrl || null, newsletterId]
            );
        } else {
            // 1. Crear nuevo registro del newsletter
            const nlRes = await pool.query(
                `INSERT INTO newsletters (subject, body_html, attachment_url, status)
                 VALUES ($1, $2, $3, 'draft') RETURNING id`,
                [subject, bodyHtml, attachmentUrl || null]
            );
            newsletterId = nlRes.rows[0].id;
        }

        // 2. Encolar envío (regresa inmediatamente, el envío es async)
        const totalRecipients = await enqueueNewsletter(newsletterId);

        return res.json({
            success: true,
            message: `Newsletter encolado para ${totalRecipients} suscriptores. Procesando en segundo plano.`,
            newsletterId,
            totalRecipients
        });
    } catch (err) {
        console.error('[Newsletter] Error al enviar:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/newsletter/history ──────────────────────────────────────────────
export const getHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, subject, body_html, attachment_url, sent_at, total_recipients, sent_count, failed_count, status
             FROM   newsletters ORDER BY sent_at DESC NULLS FIRST, id DESC LIMIT 50`
        );
        return res.json({ success: true, newsletters: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
