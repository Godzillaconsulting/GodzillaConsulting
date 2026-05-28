import pool from '../server/config/db.js';
async function main() {
    try {
        const res = await pool.query("UPDATE studio_tasks SET status = 'pending_render' WHERE status = 'rendering'");
        console.log(`✅ Reset ${res.rowCount} tasks to pending_render.`);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
