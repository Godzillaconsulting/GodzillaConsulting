import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('🔧 Agregando columna google_calendar_event_id si no existe...');
await pool.query(`
  ALTER TABLE citas 
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT DEFAULT NULL
`);

console.log('🧹 Auditando citas sin ID de Calendar (nodos huérfanos)...');
const orphans = await pool.query(`
  SELECT id, nombre_completo, email, fecha, hora, created_at
  FROM citas
  WHERE google_calendar_event_id IS NULL
  ORDER BY created_at DESC
`);
console.log(`\nCitas sin google_calendar_event_id (${orphans.rows.length} total):`);
console.table(orphans.rows);

await pool.end();
console.log('\n✅ Schema listo.');
