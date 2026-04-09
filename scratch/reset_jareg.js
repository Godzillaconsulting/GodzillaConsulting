import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function resetPass() {
    try {
        const hash = await bcrypt.hash('Godzilla2026!', 10);
        await pool.query('UPDATE admins SET password_hash = $1 WHERE username = $2', [hash, 'JareG']);
        console.log('Password reset to Godzilla2026! para JareG');
        
        // También limpar intentos para que no lo bloquee el firewall interno
        await pool.query('DELETE FROM login_attempts WHERE username = $1', ['JareG']);
        await pool.query('UPDATE admins SET is_locked = FALSE WHERE username = $1', ['JareG']);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
resetPass();
