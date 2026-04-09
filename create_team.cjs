const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function createTeam() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla'
    });
    
    try {
        const hash = await bcrypt.hash('@Godzilla2026!', 10);
        
        const usersToCreate = [
            { username: 'alex', role: 'editor', is_superadmin: false },
            { username: 'judith', role: 'admin', is_superadmin: false },
            { username: 'dani', role: 'superadmin', is_superadmin: true },
            { username: 'oscar', role: 'superadmin', is_superadmin: true }
        ];

        for (const user of usersToCreate) {
            await pool.query(
                "INSERT INTO admins (username, password_hash, role, is_superadmin) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role, is_superadmin = EXCLUDED.is_superadmin",
                [user.username, hash, user.role, user.is_superadmin]
            );
            console.log(`Usuario '${user.username}' configurado correctamente (Rol: ${user.role}, SuperAdmin: ${user.is_superadmin}).`);
        }

        // Asegurar que Jorge (JareG) tiene todos los permisos correctos
        await pool.query(
            "UPDATE admins SET role = 'superadmin', is_superadmin = true WHERE username ILIKE 'jareg'"
        );
        console.log("Usuario 'JareG' (Jorge) actualizado a God Mode.");

    } catch (e) {
        console.error("Error creando el equipo:", e);
    } finally {
        pool.end();
    }
}
createTeam();
