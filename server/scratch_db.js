import pool from './config/db.js';

async function resetTask() {
    try {
        await pool.query("UPDATE studio_tasks SET status = 'pending_cm_approval' WHERE id = 3");
        console.log("Task 3 reset a pending_cm_approval");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
resetTask();
