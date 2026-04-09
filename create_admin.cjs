const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function createAdmin() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla'
    });
    
    try {
        const hash = await bcrypt.hash('@J1a2p3h4@', 10);
        await pool.query(
            "INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
            ['godzilla_admin', hash, 'admin']
        );
        console.log("Usuario godzilla_admin local creado correctamente.");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
createAdmin();
