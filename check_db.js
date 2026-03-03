import pool from './server/config/db.js';

async function checkTable() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'citas';
        `);
        console.log("Citas table schema:");
        console.log(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkTable();
