import pool from './config/db.js';

async function check() {
    try {
        const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
        console.log("TABLES:", res.rows.map(r => r.table_name).join(', '));
        
        try {
            await pool.query("UPDATE studio_tasks SET status = 'pending_cm_approval' WHERE assigned_to = 'auto'");
            const tRes = await pool.query("SELECT id, title, status, assigned_to FROM studio_tasks WHERE status = 'pending_cm_approval' ORDER BY id DESC LIMIT 5");
            console.log("STUDIO TASKS TABLE:", tRes.rows);
        } catch(e) { console.log("Error querying studio_tasks", e); }
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
