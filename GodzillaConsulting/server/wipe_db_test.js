import pool from './config/db.js';

async function wipeDatabase() {
    console.log("Iniciando limpieza total de tablas para pruebas...");
    const queries = [
        "DELETE FROM citas;",
        "DELETE FROM citas_whatsapp;",
        "DELETE FROM citas_facebook_ig;",
        "DELETE FROM sesiones_chat;"
    ];

    for (const q of queries) {
        try {
            await pool.query(q);
            console.log("Limpiado:", q);
        } catch (e) {
            console.error("Error en query:", q, " -> ", e.message);
        }
    }
    console.log("¡Todo limpio!");
    process.exit(0);
}

wipeDatabase();
