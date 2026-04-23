import pool from '../config/db.js';
import { publishToMeta, publishToTikTok } from '../services/socialPublisher.js';

let isPublishing = false;

async function checkAndPublish() {
    if (isPublishing) return;

    try {
        isPublishing = true;
        console.log(`\n[AutoPublisher] 📅 Verificando calendario de publicaciones...`);

        // Buscar tareas que estén listas (published) y cuya fecha de publicación sea hoy o anterior
        // status = 'published' significa que el MediaWorker ya terminó el video.
        const res = await pool.query(`
            SELECT * FROM studio_tasks 
            WHERE status = 'published' 
            AND ig_publish_date IS NOT NULL 
            AND ig_publish_date <= CURRENT_DATE
            AND (publish_targets IS NOT NULL AND publish_targets != '[]'::jsonb)
        `);

        if (res.rowCount === 0) {
            console.log(`[AutoPublisher] Nada programado para publicar hoy.`);
            return;
        }

        console.log(`[AutoPublisher] Encontradas ${res.rowCount} tareas pendientes para hoy.`);

        for (const task of res.rows) {
            console.log(`[AutoPublisher] 🚀 Disparando publicación para tarea #${task.id}: ${task.title}`);

            const payload = typeof task.media_payload === 'string' ? JSON.parse(task.media_payload) : task.media_payload;
            const targets = typeof task.publish_targets === 'string' ? JSON.parse(task.publish_targets) : task.publish_targets;
            
            // Para la publicación automática, necesitamos una URL pública accesible por Meta/TikTok.
            // Si media_payload.url empieza con /outputs/, construiremos la URL completa.
            let mediaUrl = payload?.url;
            if (mediaUrl && mediaUrl.startsWith('/')) {
                // Usamos la URL pública configurada en .env (BOT_MEDIA_URL o FRONTEND_URL)
                const baseUrl = process.env.BOT_MEDIA_URL || process.env.FRONTEND_URL || 'https://godzillaconsulting.ai';
                mediaUrl = `${baseUrl}${mediaUrl}`;
            }

            if (!mediaUrl) {
                console.error(`[AutoPublisher] ❌ Tarea #${task.id} no tiene URL de medio. Omitiendo.`);
                continue;
            }

            const captionText = task.prompt || task.title || 'Studio AutoPublish';
            let publishReport = {};

            const metaNetworks = targets.filter(t => t === 'instagram' || t === 'facebook');
            if (metaNetworks.length > 0) {
                console.log(`[AutoPublisher] Enviando a Meta: ${mediaUrl}`);
                const resMeta = await publishToMeta(mediaUrl, captionText, metaNetworks);
                publishReport = { ...publishReport, ...resMeta.report };
            }

            if (targets.includes('tiktok')) {
                console.log(`[AutoPublisher] Enviando a TikTok: ${mediaUrl}`);
                const resTikTok = await publishToTikTok(mediaUrl, captionText);
                publishReport.tiktok = resTikTok;
            }

            // Cambiar el estado a "archived" o "completed" para que no se vuelva a publicar mañana.
            await pool.query(`
                UPDATE studio_tasks 
                SET status = 'archived', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [task.id]);

            console.log(`[AutoPublisher] ✅ Tarea #${task.id} publicada y archivada. Reporte:`, publishReport);
        }

    } catch (error) {
        console.error(`[AutoPublisher] ❌ Error en el cron:`, error.message);
    } finally {
        isPublishing = false;
    }
}

// Ejecutar cada 60 minutos (3600000 ms)
console.log('[AutoPublisher] 🕒 Iniciado. Revisando calendario cada 60 minutos...');
setInterval(checkAndPublish, 3600000);

// Ejecutar una vez al iniciar
checkAndPublish();
