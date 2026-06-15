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
        const timeRes = await pool.query(`SELECT NOW() as db_now`);
        console.log("DB NOW:", timeRes.rows[0].db_now);
        console.log("System NOW (ISO):", new Date().toISOString());
        console.log("System NOW (Local):", new Date().toString());
        
        const res = await pool.query(`
            SELECT id, name, nodes::text as nodes_txt
            FROM automation_flow
        `);
        console.log("All automation flows:");
        console.log(JSON.stringify(res.rows.map(r => ({ id: r.id, name: r.name, has_cron: r.nodes_txt.includes('Reloj') })), null, 2));
    } catch (err) {
        console.error("Error querying newsletters:", err.message);
    } finally {
        process.exit(0);
    }
}
run();
