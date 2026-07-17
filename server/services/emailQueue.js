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
            // FIX: Atomic lock to prevent race condition when multiple workers fetch the same row
            const lockRes = await client.query(
                `UPDATE queue_log 
                 SET status = 'processing', attempts = attempts + 1, last_attempt = NOW() 
                 WHERE id = $1 AND status = 'pending' 
                 RETURNING id`,
                [node.queueLogId]
            );

            // If row wasn't updated, another process already sent it. Safely abort.
            if (lockRes.rowCount === 0) {
                return;
            }

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

        const translationsDict = typeof nl.translations_json === 'string' ? JSON.parse(nl.translations_json) : (nl.translations_json || {});
        const dBase = typeof nl.base_json === 'string' ? JSON.parse(nl.base_json) : (nl.base_json || {});

        if (subs.length === 0) {
            console.log('⚠️  No hay suscriptores activos.');
            return 0;
        }

        await client.query(
            `UPDATE newsletters SET total_recipients = $1, status = 'sending' WHERE id = $2`,
            [subs.length, newsletterId]
        );

        for (const sub of subs) {
            let queueLogId;
            const existingRes = await client.query(
                `SELECT id, status FROM queue_log WHERE newsletter_id = $1 AND subscriber_email = $2`,
                [newsletterId, sub.email]
            );

            if (existingRes.rows.length > 0) {
                queueLogId = existingRes.rows[0].id;
                // If it's already sent or processing, we don't enqueue it again
                if (existingRes.rows[0].status === 'sent' || existingRes.rows[0].status === 'processing') {
                    continue; 
                }
            } else {
                const logRes = await client.query(
                    `INSERT INTO queue_log (newsletter_id, subscriber_email, status)
                     VALUES ($1, $2, 'pending') RETURNING id`,
                    [newsletterId, sub.email]
                );
                queueLogId = logRes.rows[0].id;
            }

            const lang = sub.language || 'es';
            const dataForLang = (lang === 'es') ? dBase : (translationsDict[lang] || dBase);

            let finalSubject = nl.subject;
            try { const jSub = JSON.parse(nl.subject); finalSubject = lang === 'en' ? (jSub.en || jSub.es) : (jSub.es || nl.subject); } catch(e){}

            // 1. COVER
            let coverHtml = '';
            if (nl.cover_url) {
                coverHtml = `<div style="margin-bottom:0px;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:2px solid #CC0000;background:#000;"><img src="${nl.cover_url}" alt="Godzilla AI Cover" style="width:100%;height:auto;display:block;max-height:450px;object-fit:cover;min-height:200px;" /></div>`;
            }

            // 2. TEASER (Hook)
            const teaserText = dataForLang.miniSummary_es || dataForLang.miniSummary_en || dataForLang.pdfIntro || '';
            const teaserHtml = teaserText ? `<div style="background:#111;padding:25px;border-radius:0 0 12px 12px;margin-bottom:30px;border:1px solid #333;border-top:none;"><p style="margin:0;font-size:16px;color:#fff;font-style:italic;line-height:1.6;font-weight:600;">"${teaserText}"</p></div>` : '';

            // 3. NEWS HOOK (List of articles to bait PDF download)
            let newsHtml = `<h2 style="color:#CC0000; font-size: 20px; text-transform: uppercase;">${lang === 'en' ? "Today's Executive Briefing" : 'Inteligencia Ejecutiva de Hoy'}</h2><ul style="padding-left: 20px;">`;
            if (dataForLang.pdfSections && Array.isArray(dataForLang.pdfSections)) {
                dataForLang.pdfSections.slice(0, 3).forEach(sec => {
                    newsHtml += `<li style="margin-bottom: 20px; font-size: 15px; color: #e5e5e5;"><strong style="color: #fff; font-size: 16px;">${sec.heading}:</strong> <br/><span style="color: #aaa; font-size: 14px;">${sec.content.substring(0, 160)}...</span></li>`;
                });
            }
            newsHtml += `</ul>`;

            // 4. DATA VISUALIZATION CHART
            let chartHtml = '';
            if (dataForLang.pdfChart && dataForLang.pdfChart.data) {
                const cData = dataForLang.pdfChart.data;
                const colors = ['#CC0000', '#990000', '#660000', '#330000'];
                const title = dataForLang.pdfChart.title || (lang === 'en' ? 'Market Topology' : 'Topología de Mercado');
                
                chartHtml += `<div style="margin-top:40px;padding:25px;background:#18181b;border-left:4px solid #CC0000;border-radius:0 12px 12px 0;border:1px solid #333;border-left:4px solid #CC0000;">`;
                chartHtml += `<h4 style="margin:0 0 20px 0;font-size:14px;color:#fff;text-transform:uppercase;letter-spacing:1px;font-weight:900;">${title}</h4>`;
                cData.forEach((item, idx) => {
                    const c = colors[idx % colors.length];
                    chartHtml += `
                    <div style="margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:5px;font-weight:bold;">
                            <span style="font-family:Arial,sans-serif">${item.label}</span><span style="color:#fff; float:right;">${item.value}%</span>
                        </div>
                        <div style="width:100%;background:#000;height:6px;border-radius:3px;overflow:hidden;">
                            <div style="width:${item.value}%;background:${c};height:100%;"></div>
                        </div>
                    </div>`;
                });
                chartHtml += `</div>`;
            }

            // 5. AUTO DEPLOY NOTE (If enforced)
            let extraNote = '';
            try {
                const jBody = JSON.parse(nl.body_html);
                const rawHtml = lang === 'en' ? (jBody.en || jBody.es) : (jBody.es || nl.body_html);
                if (rawHtml && rawHtml.includes('AUTO-DESPLIEGUE ACTIVO')) {
                    const match = rawHtml.match(/<div style="background-color: #f9f9f9;[^>]+>([\s\S]+?)<\/div>/);
                    if (match) extraNote = `<br><hr><br><div style="background-color: #111; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 4px;">${match[1]}</div>`;
                }
            } catch(e){}

            // ASSEMBLE FINAL HTML
            const finalBodyHtml = coverHtml + teaserHtml + newsHtml + chartHtml + extraNote;

            let finalAttachmentUrl = nl.attachment_url;
            if(finalAttachmentUrl) finalAttachmentUrl = `${finalAttachmentUrl}?lang=${lang}`;

            emailQueue.enqueue(
                sub.email,
                newsletterId,
                queueLogId,
                finalSubject,
                finalBodyHtml,
                finalAttachmentUrl
            );
        }

        await emailQueue.process();
        await pool.query(
            `UPDATE newsletters SET status = 'done' WHERE id = $1`,
            [newsletterId]
        );

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
