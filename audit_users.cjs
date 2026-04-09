const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function main() {
    const users = await pool.query('SELECT id, username, role, is_superadmin, is_godzilla_bot FROM admins ORDER BY id');
    console.log(JSON.stringify(users.rows, null, 2));
    pool.end();
}
main().catch(console.error);
