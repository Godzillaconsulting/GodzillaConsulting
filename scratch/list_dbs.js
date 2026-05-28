import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new pg.Pool({
    connectionString: "postgresql://postgres:godzilla2026@127.0.0.1:5432/postgres" // connect to default postgres DB
});

async function run() {
    try {
        const res = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false");
        console.log("Databases on PostgreSQL server:");
        for (const row of res.rows) {
            console.log(`- ${row.datname}`);
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}
run();
