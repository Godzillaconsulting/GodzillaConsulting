import pool from './config/db.js';

async function checkRecent() {
    try {
        const res = await pool.query(`SELECT id, created_at, status FROM newsletters ORDER BY id DESC LIMIT 5`);
        console.log("Recent newsletters:", res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkRecent();
