import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        console.log("Connecting to:", process.env.DATABASE_URL.split('@')[1]?.split('/')[0]);
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables in database:");
        for (const row of res.rows) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
            console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}
run();
