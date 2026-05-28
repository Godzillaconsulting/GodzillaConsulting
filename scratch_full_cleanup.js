import pool from './server/config/db.js';
import fs from 'fs';
import path from 'path';

async function fullCleanup() {
    try {
        // 1. Limpiar base de datos
        const resTasks = await pool.query("DELETE FROM studio_tasks");
        console.log(`✅ Base de datos limpiada. Se eliminaron ${resTasks.rowCount} tareas.`);

        // 2. Limpiar cache de archivos en E:\Godzilla_Studio_Cache\outputs
        const cacheDir = 'E:/Godzilla_Studio_Cache/outputs';
        if (fs.existsSync(cacheDir)) {
            const files = fs.readdirSync(cacheDir);
            let deletedCount = 0;
            for (const file of files) {
                if (file.startsWith('task_')) {
                    try {
                        fs.unlinkSync(path.join(cacheDir, file));
                        deletedCount++;
                    } catch (err) {
                        console.error(`Error al borrar ${file}:`, err.message);
                    }
                }
            }
            console.log(`✅ Directorio de cache limpiado. Se eliminaron ${deletedCount} archivos de la tarea.`);
        }
    } catch (e) {
        console.error("❌ Error en la limpieza:", e.message);
    } finally {
        process.exit(0);
    }
}
fullCleanup();
