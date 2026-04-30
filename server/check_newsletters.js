import pool from './config/db.js';

async function check() {
    try {
        const res = await pool.query("SELECT id, subject, status, sent_at, created_at FROM newsletters ORDER BY id DESC LIMIT 5");
        console.log("Latest Newsletters:", JSON.stringify(res.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
