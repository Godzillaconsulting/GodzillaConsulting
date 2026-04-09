import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // or load locally

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'godzilla_db',
    password: process.env.DB_PASSWORD || 'Oq4A12B2$',
    port: 5432,
});

async function run() {
    try {
        const res = await pool.query("SELECT section_id FROM site_content WHERE section_id LIKE 'paquete-%'");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
