import pool from '../server/config/db.js';

async function main() {
    try {
        const res = await pool.query('SELECT * FROM studio_tasks WHERE id = 8');
        if (res.rows.length > 0) {
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('Task 8 not found');
            const res2 = await pool.query('SELECT id, title, status FROM studio_tasks ORDER BY id DESC LIMIT 10');
            console.log('Last tasks:', res2.rows);
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
