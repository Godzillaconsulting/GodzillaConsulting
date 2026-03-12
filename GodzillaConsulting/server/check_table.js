import pool from './config/db.js';

async function check() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'citas'");
        console.log("Citas columns:", res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
