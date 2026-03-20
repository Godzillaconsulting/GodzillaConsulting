/**
 * EMAIL QUEUE — Lista Enlazada con persistencia en DB
 * ─────────────────────────────────────────────────────
 * Patrón: Linked List de Nodos de Envío
 * Cada nodo contiene: email, newsletterId, queueLogId
 * Persistencia: Neon DB (queue_log) → survive PM2 restarts
 */

import pool from '../config/db.js';
import { sendNewsletterEmail } from './emailService.js';

// ── Nodo de la Lista Enlazada ────────────────────────────────────────────────
class EmailNode {
    constructor(email, newsletterId, queueLogId, subject, bodyHtml, attachmentUrl) {
        this.email         = email;
        this.newsletterId  = newsletterId;
        this.queueLogId    = queueLogId;
        this.subject       = subject;
        this.bodyHtml      = bodyHtml;
        this.attachmentUrl = attachmentUrl;
        this.next          = null;
    }
}

// ── Lista Enlazada de Envíos ─────────────────────────────────────────────────
class EmailQueue {
    constructor() {
        this.head       = null;
        this.tail       = null;
        this.size       = 0;
        this.processing = false;
        this.delayMs    = parseInt(process.env.QUEUE_DELAY_MS || '2000');
    }

    // Agregar nodo al final de la lista
    enqueue(email, newsletterId, queueLogId, subject, bodyHtml, attachmentUrl) {
        const node = new EmailNode(email, newsletterId, queueLogId, subject, bodyHtml, attachmentUrl);
        if (!this.tail) {
            this.head = node;
            this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }
        this.size++;
    }

    // Tomar el primer nodo (FIFO)
    dequeue() {
        if (!this.head) return null;
        const node = this.head;
        this.head = this.head.next;
        if (!this.head) this.tail = null;
        this.size--;
        return node;
    }

    isEmpty() { return this.size === 0; }

    // Procesar la lista de forma escalonada (un correo cada QUEUE_DELAY_MS ms)
    async process() {
        if (this.processing) return;
        this.processing = true;
        console.log(`📬 [Queue] Iniciando procesamiento de ${this.size} correos...`);

        while (!this.isEmpty()) {
            const node = this.dequeue();
            await this._sendNode(node);
            if (!this.isEmpty()) {
                await new Promise(r => setTimeout(r, this.delayMs));
            }
        }

        this.processing = false;
        console.log('✅ [Queue] Cola de correos procesada completamente.');
    }

    // Enviar un nodo individual y actualizar DB
    async _sendNode(node) {
        const client = await pool.connect();
        try {
            // Marcar como intentando
            await client.query(
                `UPDATE queue_log SET attempts = attempts + 1, last_attempt = NOW() WHERE id = $1`,
                [node.queueLogId]
            );

            const ok = await sendNewsletterEmail({
                to:            node.email,
                subject:       node.subject,
                bodyHtml:      node.bodyHtml,
                attachmentUrl: node.attachmentUrl,
            });

            if (ok) {
                await client.query(
                    `UPDATE queue_log SET status = 'sent' WHERE id = $1`,
                    [node.queueLogId]
                );
                await client.query(
                    `UPDATE newsletters SET sent_count = sent_count + 1 WHERE id = $1`,
                    [node.newsletterId]
                );
                console.log(`   ✉️  Enviado → ${node.email}`);
            } else {
                throw new Error('sendNewsletterEmail devolvió false');
            }
        } catch (err) {
            await client.query(
                `UPDATE queue_log SET status = 'failed', error_msg = $1 WHERE id = $2`,
                [err.message, node.queueLogId]
            );
            await client.query(
                `UPDATE newsletters SET failed_count = failed_count + 1 WHERE id = $1`,
                [node.newsletterId]
            );
            console.error(`   ❌ Falló → ${node.email}: ${err.message}`);
        } finally {
            client.release();
        }
    }
}

// ── Singleton de la Queue ────────────────────────────────────────────────────
export const emailQueue = new EmailQueue();

/**
 * Carga desde DB los nodos pendientes (para resume tras reinicio PM2)
 */
export async function resumeQueueFromDB() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT ql.id, ql.subscriber_email, ql.newsletter_id,
                   n.subject, n.body_html, n.attachment_url
            FROM   queue_log ql
            JOIN   newsletters n ON n.id = ql.newsletter_id
            WHERE  ql.status = 'pending'
            ORDER  BY ql.id ASC
        `);

        if (result.rows.length === 0) return;

        console.log(`🔄 [Queue] Reanudando ${result.rows.length} correos pendientes desde DB...`);
        for (const row of result.rows) {
            emailQueue.enqueue(
                row.subscriber_email,
                row.newsletter_id,
                row.id,
                row.subject,
                row.body_html,
                row.attachment_url
            );
        }
        emailQueue.process(); // arrancar procesamiento inmediatamente
    } catch (err) {
        console.error('❌ [Queue] Error al reanudar desde DB:', err.message);
    } finally {
        client.release();
    }
}

/**
 * Encolar un newsletter completo para todos los suscriptores activos
 * @param {number} newsletterId - ID del newsletter en DB
 */
export async function enqueueNewsletter(newsletterId) {
    const client = await pool.connect();
    try {
        // Obtener datos del newsletter
        const nlRes = await client.query(
            `SELECT * FROM newsletters WHERE id = $1`,
            [newsletterId]
        );
        if (nlRes.rows.length === 0) throw new Error('Newsletter no encontrado');
        const nl = nlRes.rows[0];

        // Obtener suscriptores activos (sin duplicados)
        const subsRes = await client.query(
            `SELECT DISTINCT email FROM subscribers WHERE status = 'active'`
        );
        const subs = subsRes.rows;

        if (subs.length === 0) {
            console.log('⚠️  No hay suscriptores activos.');
            return 0;
        }

        // Actualizar total_recipients y status → 'sending'
        await client.query(
            `UPDATE newsletters SET total_recipients = $1, status = 'sending' WHERE id = $2`,
            [subs.length, newsletterId]
        );

        // Crear nodos en queue_log e insertar en Lista Enlazada
        for (const sub of subs) {
            const logRes = await client.query(
                `INSERT INTO queue_log (newsletter_id, subscriber_email, status)
                 VALUES ($1, $2, 'pending') RETURNING id`,
                [newsletterId, sub.email]
            );
            emailQueue.enqueue(
                sub.email,
                newsletterId,
                logRes.rows[0].id,
                nl.subject,
                nl.body_html,
                nl.attachment_url
            );
        }

        // Arrancar procesamiento (no blocking)
        emailQueue.process().then(async () => {
            await pool.query(
                `UPDATE newsletters SET status = 'done' WHERE id = $1`,
                [newsletterId]
            );
        });

        return subs.length;
    } catch (err) {
        await client.query(
            `UPDATE newsletters SET status = 'failed' WHERE id = $1`,
            [newsletterId]
        );
        throw err;
    } finally {
        client.release();
    }
}
