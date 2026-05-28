import pool from '../config/db.js';

async function main() {
    try {
        const res = await pool.query("SELECT * FROM studio_tasks WHERE title LIKE '%Mexicana%' OR id = 8");
        console.log('Mexico tasks in database:', res.rows);
    } catch (e) {
        console.error('Query error:', e);
    } finally {
        await pool.end();
    }
}
main();
