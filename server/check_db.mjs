import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true // usually true for neon/vercel postgres
});

async function check() {
    const client = await pool.connect();
    try {
        const res = await client.query(`SELECT * FROM site_nodes WHERE id = 'paquetes'`);
        console.log(JSON.stringify(res.rows[0].published_data, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
check();
