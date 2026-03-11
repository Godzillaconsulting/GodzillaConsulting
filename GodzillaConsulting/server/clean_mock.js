import pool from "./config/db.js";

async function cleanMockData() {
    try {
        console.log("Limpiando datos de prueba...");
        await pool.query("DELETE FROM citas WHERE nombre_completo = 'Mock User'");
        await pool.query("DELETE FROM sesiones_chat WHERE id_usuario_red LIKE 'MOCK_%'");
        console.log("✅ Datos de prueba borrados de la base de datos.");
    } catch (e) {
        console.error("❌ Error al limpiar:", e);
    } finally {
        process.exit();
    }
}

cleanMockData();
