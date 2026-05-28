import pool from '../config/db.js';

async function main() {
    try {
        const res = await pool.query(`
            UPDATE studio_tasks 
            SET status = 'hold' 
            WHERE id = 4
        `);
        console.log(`Task 4 set to hold.`);
    } catch (e) {
        console.error('Error resetting task 4:', e);
    } finally {
        await pool.end();
    }
}
main();
