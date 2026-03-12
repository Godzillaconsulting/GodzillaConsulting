import pool from './config/db.js';

async function verify() {
    try {
        const result = await pool.query("SELECT * FROM citas ORDER BY created_at DESC LIMIT 5");
        console.log("Últimas 5 citas:");
        console.table(result.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
verify();
