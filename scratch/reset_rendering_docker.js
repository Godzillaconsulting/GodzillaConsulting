import pool from '../server/config/db.js';
async function main() {
    try {
        const res = await pool.query("UPDATE studio_tasks SET status = 'pending_render_docker' WHERE status = 'rendering_docker'");
        console.log(`✅ Reset ${res.rowCount} tasks to pending_render_docker.`);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
