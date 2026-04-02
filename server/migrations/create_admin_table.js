import pkg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  } 
});

async function migrateAdmins() {
  const client = await pool.connect();
  try {
    console.log("Creando tabla admins...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabla admins creada exitosamente.");

    // Revisar si ya existe el usuario
    const res = await client.query(`SELECT username FROM admins WHERE username = $1`, ['admin']);
    
    if (res.rows.length === 0) {
      console.log("Creando usuario admin default...");
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Godzilla2026', salt);
      
      await client.query(`
        INSERT INTO admins (username, password_hash)
        VALUES ($1, $2)
      `, ['admin', hash]);
      console.log("✅ Usuario admin con contraseña 'Godzilla2026' encriptada exitosamente.");
    } else {
      console.log("⚠️ El usuario admin ya existe en la base de datos.");
    }

  } catch (err) {
    console.error("❌ ERROR EN MIGRACIÓN ADMIN:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAdmins();
