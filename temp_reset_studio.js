import pool from './server/config/db.js';

async function reset() {
    try {
        const res = await pool.query(
            `UPDATE studio_tasks SET status = 'pending_render_docker' WHERE id = 26 RETURNING id, status`
        );
        console.log("Success! Reset task:", res.rows);
    } catch (dbErr) {
        console.error("FAIL:", dbErr.message);
    } finally {
        process.exit(0);
    }
}
reset();
