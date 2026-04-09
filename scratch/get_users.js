import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function getUsers() {
    try {
        console.log("--- ADMINS ---");
        const admins = await pool.query('SELECT id, username, role, is_superadmin, created_at FROM admins');
        console.table(admins.rows);

        console.log("\n--- USERS (Si existe y tiene registros) ---");
        const users = await pool.query('SELECT id, username, email, created_at FROM users LIMIT 10');
        console.table(users.rows);
    } catch (e) {
        console.error("Error consultando:", e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

getUsers();
