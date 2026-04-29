const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });
pool.query("SELECT media_payload FROM studio_tasks WHERE title LIKE '%San Andreas%'").then(res => {
    console.log(JSON.stringify(res.rows[0], null, 2));
    pool.end();
});
