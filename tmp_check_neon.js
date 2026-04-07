import pool from './server/config/db.js';
async function main() {
    const r = await pool.query("SELECT id, published_data FROM site_nodes WHERE id = 'hero'");
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}
main();
