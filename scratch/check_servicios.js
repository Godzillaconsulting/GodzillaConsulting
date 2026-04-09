import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

pool.query("SELECT published_data FROM site_nodes WHERE id = 'servicios'")
    .then(res => { console.log(JSON.stringify(res.rows[0], null, 2)); pool.end(); })
    .catch(err => { console.error(err); pool.end(); });
