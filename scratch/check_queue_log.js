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
        const res = await pool.query(`
            SELECT id, newsletter_id, subscriber_email, status, error_msg, attempts, last_attempt
            FROM queue_log
            ORDER BY id DESC
            LIMIT 20
        `);
        console.log("Last 20 queue_log entries:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Error querying queue_log:", err.message);
    } finally {
        process.exit(0);
    }
}
run();
