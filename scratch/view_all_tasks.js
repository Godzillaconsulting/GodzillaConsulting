import pool from '../server/config/db.js';

async function main() {
    try {
        const res = await pool.query('SELECT id, title, status, content_type, created_at FROM studio_tasks ORDER BY id DESC');
        console.log('Total tasks:', res.rows.length);
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
