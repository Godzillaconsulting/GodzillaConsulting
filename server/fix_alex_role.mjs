import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

// Asegurarse que alex y cualquier usuario GD tenga role=admin
const r = await pool.query("UPDATE admins SET role = 'admin' WHERE username ILIKE '%alex%' AND role != 'superadmin' RETURNING id, username, role");
if (r.rows.length > 0) {
    console.log('Alex actualizado:', r.rows);
} else {
    console.log('Alex no encontrado o ya tiene role correcto - mostrando todos los usuarios:');
}

const all = await pool.query('SELECT id, username, is_superadmin, role, status FROM admins ORDER BY id');
all.rows.forEach(u => console.log(JSON.stringify(u)));

await pool.end();
