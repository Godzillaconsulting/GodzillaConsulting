import pool from '../config/db.js';

async function cleanupAppointments() {
    console.log("🧹 Iniciando limpieza de citas fantasma y pasadas...");
    try {
        const queries = [
            // Eliminar citas donde google_calendar_id es nulo (citas fantasma)
            "DELETE FROM citas WHERE google_calendar_id IS NULL AND status != 'cancelada'",
            "DELETE FROM citas_whatsapp WHERE google_calendar_id IS NULL AND status != 'cancelada'",
            "DELETE FROM citas_facebook_ig WHERE google_calendar_id IS NULL AND status != 'cancelada'",
            
            // Opcional: Eliminar citas en el pasado que nunca se concretaron o que ya pasaron
            // "DELETE FROM citas WHERE fecha < CURRENT_DATE",
            // "DELETE FROM citas_whatsapp WHERE fecha_cita < CURRENT_DATE",
            // "DELETE FROM citas_facebook_ig WHERE fecha_cita < CURRENT_DATE"
        ];

        let totalDeleted = 0;
        for (const query of queries) {
            const result = await pool.query(query);
            if (result.rowCount > 0) {
                console.log(`✅ Eliminados ${result.rowCount} registros con: ${query}`);
                totalDeleted += result.rowCount;
            }
        }
        
        console.log(`✨ Limpieza completada. Total de registros eliminados: ${totalDeleted}`);
        process.exit(0);
    } catch (e) {
        console.error("❌ Error en limpieza:", e.message);
        process.exit(1);
    }
}

cleanupAppointments();
