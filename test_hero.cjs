require('dotenv').config({path: './server/.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function go(){
    try {
        const r = await pool.query("SELECT id, draft_data, published_data FROM site_nodes WHERE id='hero'");
        console.log("Hero DB Row:", JSON.stringify(r.rows, null, 2));
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        pool.end();
    }
}
go();
