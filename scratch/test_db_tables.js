import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function main() {
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_type='BASE TABLE'
            ORDER BY table_name ASC;
        `;
        const res = await pool.query(query);
        console.log("TABLES:", res.rows.map(r => r.table_name));
    } catch(e) {
        console.error("DB ERR:", e);
    }
    process.exit(0);
}
main();
