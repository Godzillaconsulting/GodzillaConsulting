import pool from '../server/config/db.js';

async function main() {
    try {
        const res = await pool.query('SELECT * FROM studio_tasks ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
