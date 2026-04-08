import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargamos el .env desde el folder actual (server)
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function unlockJareg() {
  const client = await pool.connect();
  try {
    // Buscar si existe
    const res = await client.query('SELECT * FROM admins WHERE username ILIKE $1', ['JareG']);
    console.log('Jareg status in DB:', res.rows[0]);
    if (res.rows.length > 0) {

    }
    
    // Desbloquear a todos

    console.log('Bloqueos de cuenta reseteados.');

    // Limpiar ip_blocks
    try {
       await client.query('DELETE FROM login_attempts');
       console.log('login_attempts reseteados.');
    } catch (e) {
       console.log('Error deleting login_attempts', e.message);
    }

  } catch (err) {
    console.error('Error desbloqueando a JareG:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

unlockJareg();
