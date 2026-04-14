import pool from './server/config/db.js';

async function main() {
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_type='BASE TABLE'
            ORDER BY table_name ASC;
        `;
        const result = await pool.query(query);
        console.log("SUCCESS!", result.rows);
    } catch(e) {
        console.error("FAIL:", e);
    }
    process.exit(0);
}
main();
