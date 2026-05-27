import pool from '../server/config/db.js';
import fs from 'fs';
import path from 'path';

async function main() {
    const args = process.argv.slice(2);
    let taskId = null;
    let imagePath = null;
    let feedback = '';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--task' || args[i] === '-t') taskId = args[++i];
        else if (args[i] === '--image' || args[i] === '-i') imagePath = args[++i];
        else if (args[i] === '--feedback' || args[i] === '-f') feedback = args[++i];
    }

    if (!taskId) {
        console.error('\n❌ Error: Debes especificar el ID de la tarea usando --task <id>');
        console.log('Ejemplo: node scripts/rebuild_with_ref.js -t 27 -i "C:\\Users\\admin\\Desktop\\referencia.jpg" -f "Hacer las fotos mas realistas"\n');
        process.exit(1);
    }

    try {
        const taskRes = await pool.query('SELECT * FROM studio_tasks WHERE id = $1', [taskId]);
        if (taskRes.rows.length === 0) {
            console.error(`❌ Error: No se encontró la tarea con ID ${taskId}`);
            process.exit(1);
        }
        const task = taskRes.rows[0];

        let refImage = null;

        if (imagePath) {
            const absolutePath = path.resolve(imagePath);
            if (!fs.existsSync(absolutePath)) {
                console.error(`❌ Error: No se encuentra el archivo de referencia en la ruta: ${absolutePath}`);
                process.exit(1);
            }
            
            console.log(`💾 Leyendo archivo de referencia: ${absolutePath}`);
            const buffer = fs.readFileSync(absolutePath);
            const ext = path.extname(absolutePath).toLowerCase();
            let mimetype = 'image/jpeg';
            if (ext === '.png') mimetype = 'image/png';
            else if (ext === '.gif') mimetype = 'image/gif';
            else if (ext === '.mp4') mimetype = 'video/mp4';
            else if (ext === '.webm') mimetype = 'video/webm';

            if (mimetype.startsWith('video/')) {
                const filename = Date.now() + '-' + path.basename(absolutePath);
                const destPath = path.join('E:/assets', filename);
                fs.copyFileSync(absolutePath, destPath);
                refImage = `/api/media/assets/${filename}`;
                console.log(`✅ Video de referencia guardado en disco: ${refImage}`);
            } else {
                console.log('📥 Guardando imagen de referencia en media_storage de la base de datos...');
                const dbRes = await pool.query(
                    `INSERT INTO media_storage (filename, mimetype, size, file_data) 
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [path.basename(absolutePath), mimetype, buffer.length, buffer]
                );
                const fileId = dbRes.rows[0].id;
                refImage = `/api/media/file/${fileId}`;
                console.log(`✅ Imagen de referencia guardada con ID: ${fileId}`);
            }
        }

        let updatedMediaPayload = task.media_payload;
        if (refImage) {
            const basePayload = typeof task.media_payload === 'string' ? JSON.parse(task.media_payload) : task.media_payload;
            const updated = Array.isArray(basePayload)
                ? basePayload.map((m, idx) => idx === 0 ? { ...m, refImage: refImage } : m)
                : { ...basePayload, refImage: refImage };
            updatedMediaPayload = JSON.stringify(updated);
        }

        console.log(`\n🔄 Actualizando Tarea #${taskId} a estado 'pending_render_docker' para re-renderizado con IA...`);
        await pool.query(
            `UPDATE studio_tasks 
             SET status = 'pending_render_docker', 
                 feedback_notes = $1, 
                 media_payload = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [feedback || 'Rehacer video con referencia visual', updatedMediaPayload, taskId]
        );

        console.log('🚀 ¡Tarea enviada al MediaWorker con éxito! Empezará a renderizar de inmediato.\n');
    } catch (err) {
        console.error('❌ Error ejecutando la actualización:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
