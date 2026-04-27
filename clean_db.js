import pool from './server/config/db.js';
async function clean() {
    try {
        const res = await pool.query("DELETE FROM studio_tasks WHERE title LIKE '%[Trending]%'");
        console.log('Borrados', res.rowCount, 'registros.');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
clean();
