const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function reset() {
    const hash = await bcrypt.hash('@Godzilla2026!', 10);
    await pool.query("UPDATE admins SET password_hash = $1 WHERE username ILIKE 'jareg'", [hash]);
    console.log('RESET EXITOSO');
    pool.end();
}
reset().catch(console.error);
