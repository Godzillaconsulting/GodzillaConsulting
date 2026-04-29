import pool from './config/db.js';

async function check() {
    try {
        await pool.query("UPDATE studio_tasks SET status = 'pending_cm_approval' WHERE id = 2");
        const tRes = await pool.query("SELECT id, title, status, assigned_to, media_payload FROM studio_tasks ORDER BY id DESC LIMIT 2");
        console.log("TASKS:", JSON.stringify(tRes.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
