import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(
    `SELECT id, nombre_completo, email, fecha, hora, status, created_at 
     FROM citas 
     ORDER BY created_at DESC 
     LIMIT 10`
);

if (result.rows.length === 0) {
    console.log('❌ No hay citas guardadas en la base de datos.');
} else {
    console.log(`✅ Últimas ${result.rows.length} citas encontradas:\n`);
    console.table(result.rows);
}

await pool.end();
