import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log("Tablas en la BD:");

        // Get row count for each table to help identify unused ones
        for (const row of res.rows) {
            const table = row.table_name;
            const countRes = await pool.query(`SELECT count(*) as total FROM "${table}"`);
            console.log(`- ${table}: ${countRes.rows[0].total} rows`);
        }

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
