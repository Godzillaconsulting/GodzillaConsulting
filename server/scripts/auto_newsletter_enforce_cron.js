import pool from '../config/db.js';
import { enqueueNewsletter } from '../services/emailQueue.js';

async function runEnforcement() {
    console.log('⏳ [CRON-ENFORCE] Revisando boletines olvidados en borrador...');
    try {
        // Buscar el último boletín en draft
        const res = await pool.query(
            `SELECT id, body_html FROM newsletters WHERE status = 'draft' ORDER BY id DESC LIMIT 1`
        );
        
        if (res.rows.length === 0) {
            console.log('✅ [CRON-ENFORCE] No hay borradores pendientes. El equipo humano hizo su trabajo de envío o no hay boletines nuevos.');
            process.exit(0);
        }

        const draft = res.rows[0];

        // Añadir notificación administrativa en el HTML
        const autoDeployNote = `
<br><hr><br>
<div style="background-color: #f9f9f9; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px;">
    <p style="color:#f59e0b; font-size:13px; font-weight:bold; margin-top:0;">🤖 AUTO-DESPLIEGUE ACTIVO</p>
    <p style="color:#555; text-align:justify; font-size:12px; margin-bottom:0;">
        Este boletín fue compilado e investigado completamente por la Inteligencia Artificial de Godzilla Consulting.<br>
        Se ha auto-desplegado a toda la base de suscriptores para asegurar la continuidad del reporte al finalizar la ventana de espera de supervisión humana.
    </p>
</div>`;

        await pool.query(
            `UPDATE newsletters SET body_html = $1 WHERE id = $2`,
            [draft.body_html + autoDeployNote, draft.id]
        );

        console.log(`🚀 [CRON-ENFORCE] Forzando envío masivo para boletín [ID: ${draft.id}]...`);
        const total = await enqueueNewsletter(draft.id);
        
        console.log(`🎉 [CRON-ENFORCE] Éxito masivo. El boletín [ID: ${draft.id}] se auto-desplegó para ${total} suscriptores.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ [CRON-ENFORCE] Error:', e.message);
        process.exit(1);
    }
}

runEnforcement();
