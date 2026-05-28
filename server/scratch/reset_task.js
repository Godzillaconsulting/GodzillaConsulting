import pool from '../config/db.js';

async function main() {
    try {
        console.log('🔄 Resetting task #26 to pending_render_docker...');
        const res = await pool.query("UPDATE studio_tasks SET status = 'pending_render_docker' WHERE id = 26 RETURNING id, status");
        console.log('✅ Task reset output:', res.rows[0]);
    } catch (err) {
        console.error('❌ Error resetting task:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
