import pool from '../config/db.js';

async function main() {
    try {
        const res = await pool.query(`
            UPDATE studio_tasks 
            SET status = 'pending_render' 
            WHERE id = 8
        `);
        console.log(`Task 8 reset to pending_render.`);
    } catch (e) {
        console.error('Error resetting task 8:', e);
    } finally {
        await pool.end();
    }
}
main();
