import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('ALTER TABLE downloads ADD COLUMN IF NOT EXISTS recurso_slug VARCHAR(255);');
        console.log('✅ Column recurso_slug added to downloads table.');
    } catch(e) {
        console.error('Error alter table:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
