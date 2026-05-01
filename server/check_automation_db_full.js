import pool from './config/db.js';

async function check() {
    try {
        const res = await pool.query('SELECT id, name, nodes, edges FROM automation_flow');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
