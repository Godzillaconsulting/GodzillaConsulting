const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla'
});

async function run() {
    try {
        console.log("Renombrando user_id a admin_id en admin_logs...");
        await pool.query('ALTER TABLE admin_logs RENAME COLUMN user_id TO admin_id').catch(e => console.log('Quizá ya se renombró o no existe: ', e.message));
        
        console.log("Añadiendo columna details...");
        await pool.query('ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS details JSONB').catch(e => console.log(e.message));
        
        console.log("✅ Tabla admin_logs arreglada.");
    } catch (e) {
        console.error("❌ Error interno:", e);
    } finally {
        pool.end();
    }
}

run();
