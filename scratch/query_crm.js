import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function queryNode() {
    try {
        const res = await pool.query("SELECT * FROM site_nodes WHERE identifier LIKE '%crm%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(e) {
        console.error(e);
    }
    await pool.end();
}
queryNode();
