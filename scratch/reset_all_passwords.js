import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function resetAll() {
    try {
        const hash = await bcrypt.hash('Godzilla2026!', 10);
        // Resetear contraseñas de todos los admins a Godzilla2026!
        const result = await pool.query('UPDATE admins SET password_hash = $1 RETURNING username', [hash]);
        const usernames = result.rows.map(r => r.username);
        console.log('✅ Contraseñas reseteadas exitosamente para:', usernames.join(', '));
        
        // Limpiar intentos fallidos para desbloquear a todos
        await pool.query('DELETE FROM login_attempts');
        await pool.query('UPDATE admins SET is_locked = FALSE');
        console.log('✅ Firewall de Login purgado. Todos los bloqueos levantados.');
    } catch (e) {
        console.error('Error al resetear contraseñas:', e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
resetAll();
