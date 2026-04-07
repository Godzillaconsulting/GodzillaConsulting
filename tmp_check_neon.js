import pool from './server/config/db.js';
async function main() {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'goyi_learning'");
    console.log(r.rows);
    process.exit(0);
}
main();
