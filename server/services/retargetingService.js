/**
 * RETARGETING SERVICE
 * ────────────────────────────────────────────────────────────────
 * Evalúa reglas de retargeting y encola correos para descargadores
 * de lead magnets. Se llama automáticamente desde emailWorker.js
 * cada hora.
 */
import pool from '../config/db.js';
import { sendNewsletterEmail } from './emailService.js';

/**
 * Evalúa todas las reglas activas y encola correos que correspondan.
 * @param {boolean} dryRun - Si true, solo cuenta sin enviar
 * @returns {number} Cantidad de correos encolados/enviados
 */
export async function checkAndEnqueue(dryRun = false) {
    const client = await pool.connect();
    let totalSent = 0;

    try {
        // 1. Obtener reglas activas
        const rulesRes = await client.query(
            `SELECT * FROM retargeting_rules WHERE active = true`
        );

        for (const rule of rulesRes.rows) {
            // 2. Encontrar destinatarios que cumplan la condición
            //    y NO hayan recibido este correo antes
            const recipientsRes = await client.query(`
                SELECT s.email, s.name, s.subscribed_at
                FROM subscribers s
                WHERE s.status = 'active'
                  AND s.source = 'lead_magnet'
                  AND s.subscribed_at + (${rule.delay_hours} * INTERVAL '1 hour') <= NOW()
                  AND NOT EXISTS (
                      SELECT 1 FROM retargeting_sent rs
                      WHERE rs.rule_id = $1 AND rs.email = s.email
                  )
            `, [rule.id]);

            if (recipientsRes.rows.length === 0) continue;

            console.log(`🎯 [Retargeting] Regla "${rule.name}": ${recipientsRes.rows.length} destinatarios`);

            for (const recipient of recipientsRes.rows) {
                if (dryRun) {
                    console.log(`   [DRY RUN] → ${recipient.email}`);
                    totalSent++;
                    continue;
                }

                // 3. Enviar correo
                const ok = await sendNewsletterEmail({
                    to:            recipient.email,
                    subject:       rule.subject,
                    bodyHtml:      rule.body_html,
                    attachmentUrl: null,
                });

                if (ok) {
                    // 4. Registrar en retargeting_sent para no duplicar
                    await client.query(
                        `INSERT INTO retargeting_sent (rule_id, email) VALUES ($1, $2)
                         ON CONFLICT (rule_id, email) DO NOTHING`,
                        [rule.id, recipient.email]
                    );
                    console.log(`   ✉️  Retargeting enviado → ${recipient.email} (regla: ${rule.name})`);
                    totalSent++;
                } else {
                    console.error(`   ❌ Falló retargeting → ${recipient.email}`);
                }

                // Pequeña pausa entre envíos para no saturar
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    } catch (err) {
        console.error('❌ [Retargeting] Error en checkAndEnqueue:', err.message);
    } finally {
        client.release();
    }

    return totalSent;
}
