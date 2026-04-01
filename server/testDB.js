import pool from './config/db.js';
async function test() {
    const res = await pool.query("SELECT published_data FROM site_nodes WHERE id = 'recursos'");
    console.log(JSON.stringify(res.rows[0], null, 2));
    process.exit(0);
}
test();
