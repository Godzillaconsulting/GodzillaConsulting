import pool from './config/db.js';

async function check() {
    try {
        const res = await pool.query('SELECT id, name, jsonb_array_length(nodes) as nodes_count FROM automation_flow');
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
