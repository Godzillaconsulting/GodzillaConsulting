import pool from './config/db.js';

async function verify() {
    try {
        const result = await pool.query("SELECT * FROM citas ORDER BY created_at DESC LIMIT 5");
        console.log("Últimas citas JSON:", JSON.stringify(result.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
verify();
