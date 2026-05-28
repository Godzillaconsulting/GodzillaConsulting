import pool from '../server/config/db.js';

async function main() {
    try {
        const res = await pool.query('SELECT id, title, status, updated_at FROM studio_tasks WHERE id = 9');
        if (res.rows.length > 0) {
            console.log(`Task 9 Status: ${res.rows[0].status} (last updated: ${res.rows[0].updated_at})`);
        } else {
            console.log('Task 9 not found in database yet.');
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
