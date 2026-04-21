/**
 * EMAIL QUEUE — Lista Enlazada con persistencia en DB
 * Patrón: Linked List de Nodos de Envío Multi-idioma
 */

import pool from '../config/db.js';
import { sendNewsletterEmail } from './emailService.js';
import { extractOgImageUrl } from './ogScraper.js';

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

class EmailQueue {
    constructor() {
        this.head       = null;
        this.tail       = null;
        this.size       = 0;
        this.processing = false;
        this.delayMs    = parseInt(process.env.QUEUE_DELAY_MS || '2000');
    }

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

    dequeue() {
        if (!this.head) return null;
        const node = this.head;
        this.head = this.head.next;
        if (!this.head) this.tail = null;
        this.size--;
        return node;
    }

    isEmpty() { return this.size === 0; }

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

    async _sendNode(node) {
        const client = await pool.connect();
        try {
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

export const emailQueue = new EmailQueue();

export async function resumeQueueFromDB() {
    const client = await pool.connect();
    try {
        await client.query(`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'es'`);
    } catch(e){}

    try {
        const result = await client.query(`
            SELECT ql.id, ql.subscriber_email, ql.newsletter_id,
                   n.subject, n.body_html, n.attachment_url,
                   s.language
            FROM   queue_log ql
            JOIN   newsletters n ON n.id = ql.newsletter_id
            LEFT JOIN subscribers s ON s.email = ql.subscriber_email
            WHERE  ql.status = 'pending'
            ORDER  BY ql.id ASC
        `);

        if (result.rows.length === 0) return;

        console.log(`🔄 [Queue] Reanudando ${result.rows.length} correos pendientes desde DB (Renderizando en i18n)...`);
        for (const row of result.rows) {
            let finalSubject = row.subject;
            let finalBodyHtml = row.body_html;
            let finalAttachmentUrl = row.attachment_url;
            try { const jSub = JSON.parse(row.subject); finalSubject = row.language === 'en' ? (jSub.en || jSub.es) : (jSub.es || row.subject); } catch(e){}
            try { const jBody = JSON.parse(row.body_html); finalBodyHtml = row.language === 'en' ? (jBody.en || jBody.es) : (jBody.es || row.body_html); } catch(e){}

            if(finalAttachmentUrl) finalAttachmentUrl = `${finalAttachmentUrl}?lang=${row.language || 'es'}`;

            emailQueue.enqueue(
                row.subscriber_email,
                row.newsletter_id,
                row.id,
                finalSubject,
                finalBodyHtml,
                finalAttachmentUrl
            );
        }
        emailQueue.process(); 
    } catch (err) {
        console.error('❌ [Queue] Error al reanudar desde DB:', err.message);
    } finally {
        client.release();
    }
}

export async function enqueueNewsletter(newsletterId) {
    const client = await pool.connect();
    try {
        try { await client.query(`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'es'`); } catch(e) {}

        const nlRes = await client.query(
            `SELECT * FROM newsletters WHERE id = $1`,
            [newsletterId]
        );
        if (nlRes.rows.length === 0) throw new Error('Newsletter no encontrado');
        const nl = nlRes.rows[0];

        const subsRes = await client.query(
            `SELECT email, language FROM subscribers WHERE status = 'active'`
        );
        const subs = subsRes.rows;

        // INYECCIÓN B2B (Foto y Gráficas dentro del Correo antes del envío O(1) Fetching)
        let visualHtml_es = '';
        let visualHtml_en = '';
        try {
            const dBase = typeof nl.base_json === 'string' ? JSON.parse(nl.base_json) : (nl.base_json || {});
            
            let coverHtml = '';
            // Si la IA generó una portada estilo TIME, la usamos.
            if (nl.cover_url) {
                coverHtml = `
                <div style="margin-bottom:0px;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:2px solid #CC0000;background:#000;">
                    <img src="${nl.cover_url}" alt="Godzilla AI Cover" style="width:100%;height:auto;display:block;max-height:450px;object-fit:cover;min-height:200px;" />
                </div>`;
            } else {
                // Fallback a opengraph si por alguna razon falló la IA del cover
                const newsUrl = dBase?.pdfSections?.[0]?.url;
                if (newsUrl) {
                    const ogUrl = await extractOgImageUrl(newsUrl);
                    if (ogUrl) {
                        coverHtml = `
                        <div style="margin-bottom:0px;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 6px 15px rgba(0,0,0,0.5);border:1px solid #333;">
                            <img src="${ogUrl}" alt="Corporate Review" style="width:100%;height:auto;display:block;max-height:280px;object-fit:cover;" />
                        </div>`;
                    }
                }
            }

            // Inyectamos el enganche (teaser) que la IA generó justo debajo de la portada
            const buildTeaser = (text) => text ? `
            <div style="background:#111;padding:25px;border-radius:0 0 12px 12px;margin-bottom:30px;border:1px solid #333;border-top:none;">
                <p style="margin:0;font-size:16px;color:#fff;font-style:italic;line-height:1.6;font-weight:600;">"${text}"</p>
            </div>` : '';

            visualHtml_es = coverHtml + buildTeaser(dBase?.miniSummary_es);
            visualHtml_en = coverHtml + buildTeaser(dBase?.miniSummary_en);
            
            let chartHtml_es = ''; let chartHtml_en = '';
            if (dBase?.pdfChart?.data) {
                const cData = dBase.pdfChart.data;
                const colors = ['#CC0000', '#990000', '#660000', '#330000'];
                
                const buildChart = (title) => {
                    let cHTML = `<div style="margin-top:40px;padding:25px;background:#18181b;border-left:4px solid #CC0000;border-radius:0 12px 12px 0;border:1px solid #333;border-left:4px solid #CC0000;">`;
                    cHTML += `<h4 style="margin:0 0 20px 0;font-size:14px;color:#fff;text-transform:uppercase;letter-spacing:1px;font-weight:900;">${title}</h4>`;
                    cData.forEach((item, idx) => {
                        const c = colors[idx % colors.length];
                        cHTML += `
                        <div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:5px;font-weight:bold;">
                                <span style="font-family:Arial,sans-serif">${item.label}</span><span style="color:#fff">${item.value}%</span>
                            </div>
                            <div style="width:100%;background:#000;height:6px;border-radius:3px;overflow:hidden;">
                                <div style="width:${item.value}%;background:${c};height:100%;"></div>
                            </div>
                        </div>`;
                    });
                    cHTML += `</div>`;
                    return cHTML;
                };
                chartHtml_es = buildChart('Análisis Geométrico de Mercado');
                chartHtml_en = buildChart('Geometric Market Analysis');
            }
            
            nl.chart_es = chartHtml_es;
            nl.chart_en = chartHtml_en;

        } catch(e) { console.error('Error inyectando Visuales HTML en DB: ', e); }

        if (subs.length === 0) {
            console.log('⚠️  No hay suscriptores activos.');
            return 0;
        }

        await client.query(
            `UPDATE newsletters SET total_recipients = $1, status = 'sending' WHERE id = $2`,
            [subs.length, newsletterId]
        );

        for (const sub of subs) {
            const logRes = await client.query(
                `INSERT INTO queue_log (newsletter_id, subscriber_email, status)
                 VALUES ($1, $2, 'pending') RETURNING id`,
                [newsletterId, sub.email]
            );

            // RENDERIZADO DINÁMICO EN VUELO
            let finalSubject = nl.subject;
            let finalBodyHtml = nl.body_html;
            let finalAttachmentUrl = nl.attachment_url;
            const lang = sub.language || 'es';

            try { const jSub = JSON.parse(nl.subject); finalSubject = lang === 'en' ? (jSub.en || jSub.es) : (jSub.es || nl.subject); } catch(e){}
            try { const jBody = JSON.parse(nl.body_html); finalBodyHtml = lang === 'en' ? (jBody.en || jBody.es) : (jBody.es || nl.body_html); } catch(e){}
            
            // CONCATENACIÓN EDITORIAL (Foto Arriba, Texto Medio, Gráfica Abajo)
            finalBodyHtml = (lang === 'en' ? visualHtml_en : visualHtml_es) + finalBodyHtml + (lang === 'en' ? (nl.chart_en || '') : (nl.chart_es || ''));

            if(finalAttachmentUrl) finalAttachmentUrl = `${finalAttachmentUrl}?lang=${lang}`;

            emailQueue.enqueue(
                sub.email,
                newsletterId,
                logRes.rows[0].id,
                finalSubject,
                finalBodyHtml,
                finalAttachmentUrl
            );
        }

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
