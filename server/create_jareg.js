import pkg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function createSuperAdmin() {
  const client = await pool.connect();
  try {
    const username = 'JareG';
    const password = '@J1a2p3h4@';
    
    // Generar hash seguro
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    // Upsert (insert or update si ya existe JareG)
    const query = `
      INSERT INTO admins (username, password_hash, is_superadmin)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, 
          is_superadmin = TRUE
      RETURNING id, username;
    `;
    
    const res = await client.query(query, [username, hash]);
    console.log('✅ SuperAdmin creado/actualizado exitosamente:', res.rows[0]);
    
    // Asegurarse de que el usuario original también tenga permisos (por si acaso el script anterior falló)
    await client.query(`UPDATE admins SET is_superadmin = TRUE WHERE username IN ('admin', 'godzilla_admin')`);
    
  } catch (err) {
    console.error('❌ Error creando SuperAdmin:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

createSuperAdmin();
