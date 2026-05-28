import pool from '../config/db.js';

async function main() {
    try {
        const res = await pool.query(`
            UPDATE studio_tasks 
            SET status = 'hold' 
            WHERE status IN ('pending_local_test', 'pending_render') AND id != 8
        `);
        console.log(`Paused ${res.rowCount} older tasks.`);
    } catch (e) {
        console.error('Error updating tasks:', e);
    } finally {
        await pool.end();
    }
}
main();
