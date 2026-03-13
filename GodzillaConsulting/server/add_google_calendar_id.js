import pool from './config/db.js';

async function migracionCitas() {
    console.log("Iniciando migración de base de datos...");
    const queries = [
        "ALTER TABLE citas ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255);",
        "ALTER TABLE citas_whatsapp ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255);",
        "ALTER TABLE citas_facebook_ig ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255);"
    ];

    for (const q of queries) {
        try {
            await pool.query(q);
            console.log("Exito:", q);
        } catch (e) {
            console.error("Error en query:", q, " -> ", e.message);
        }
    }
    console.log("Migración finalizada.");
    process.exit(0);
}

migracionCitas();
