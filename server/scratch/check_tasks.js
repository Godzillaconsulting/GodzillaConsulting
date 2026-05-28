import pool from '../config/db.js';

async function main() {
    try {
        const res = await pool.query('SELECT * FROM studio_tasks ORDER BY id DESC LIMIT 5');
        console.log('Last 5 tasks:', res.rows);
    } catch (e) {
        console.error('Query error:', e);
    } finally {
        await pool.end();
    }
}
main();
