const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla'
});

async function run() {
    try {
        console.log("Añadiendo columnas faltantes a la tabla 'admins'...");
        await pool.query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
        `);
        console.log("✅ Columnas añadidas exitosamente.");
    } catch (e) {
        console.error("❌ Error al añadir columnas:", e);
    } finally {
        pool.end();
    }
}

run();
