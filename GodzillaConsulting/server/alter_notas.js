import pool from './config/db.js';

async function fixNotas() {
    try {
        console.log("Adding notas_adicionales...");
        await pool.query("ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas_adicionales TEXT");
        console.log("✅ Column notas_adicionales added.");
    } catch (e) {
        console.error("❌ Error adding column:", e);
    } finally {
        process.exit();
    }
}
fixNotas();
