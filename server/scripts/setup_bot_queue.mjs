import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    console.log('Creando tabla bot_outbound_queue...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_outbound_queue (
        id SERIAL PRIMARY KEY,
        bot_name VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        error_log TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );
    `);
    
    // Create an index for faster polling
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bot_queue_status 
      ON bot_outbound_queue(bot_name, status);
    `);
    
    console.log('✅ Tabla bot_outbound_queue creada y/o verificada con éxito.');
  } catch (err) {
    console.error('❌ Error creando tabla:', err);
  } finally {
    await pool.end();
  }
}

main();
