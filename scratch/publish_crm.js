import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function publishCRM() {
    try {
        const res = await pool.query(`
            UPDATE site_nodes
            SET published_data = draft_data, updated_at = NOW()
            WHERE id = 'servicio-crm'
            RETURNING *
        `);
        console.log("Published service CRM:", res.rows[0].id);
    } catch(e) {
        console.error(e);
    }
    await pool.end();
}
publishCRM();
