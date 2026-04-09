import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(`
  SELECT id, nombre_completo, email, fecha, hora, tipo_sesion, status, created_at
  FROM citas
  ORDER BY created_at DESC
  LIMIT 10
`);
console.log('Últimas 10 citas en Local:');
console.table(r.rows);
await pool.end();
