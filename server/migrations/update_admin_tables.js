import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  } 
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Iniciando migración de sistema Multi-Admin y Auditoría...");

    // 1. Alterar la tabla admins
    console.log("Añadiendo columnas a tabla admins (si no existen)...");
    await client.query(`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) DEFAULT '',
      ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);

    // Actualizar el admin original (usualmente 'admin' o 'godzilla_admin') para que sea superadmin
    await client.query(`
      UPDATE admins 
      SET is_superadmin = TRUE 
      WHERE username IN ('admin', 'godzilla_admin');
    `);

    // 2. Crear tabla de logs (admin_logs)
    console.log("Creando tabla admin_logs...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Migración completada exitosamente.");
  } catch (err) {
    console.error("❌ ERROR EN MIGRACIÓN:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
