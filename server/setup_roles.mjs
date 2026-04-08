import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

// 1. Ver usuarios actuales
const users = await pool.query('SELECT id, username, is_superadmin, status FROM admins ORDER BY id');
console.log('=== Usuarios actuales ===');
users.rows.forEach(u => console.log(JSON.stringify(u)));

// 2. Ver si ya existe columna role
const cols = await pool.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'admins' AND column_name = 'role'
`);
const hasRole = cols.rows.length > 0;
console.log('\n=== Columna role existe:', hasRole);

if (!hasRole) {
  // 3. Agregar columna role (por defecto 'editor' para todos excepto quien ya tiene is_superadmin o role CM)
  await pool.query("ALTER TABLE admins ADD COLUMN role VARCHAR(20) DEFAULT 'editor'");
  // CM: Judith = ID 4 (o el username que lleva CM)
  const judith = await pool.query("SELECT id FROM admins WHERE username ILIKE '%judith%' OR username ILIKE '%cm%' LIMIT 1");
  if (judith.rows.length > 0) {
    await pool.query("UPDATE admins SET role = 'cm' WHERE id = $1", [judith.rows[0].id]);
    console.log('Judith actualizada a role=cm, ID:', judith.rows[0].id);
  }
  // Oscar = superadmin = role 'superadmin'
  await pool.query("UPDATE admins SET role = 'superadmin' WHERE is_superadmin = true");
  console.log('SuperAdmins actualizados a role=superadmin');
}

// 4. Ver resultado final
const final = await pool.query('SELECT id, username, is_superadmin, role, status FROM admins ORDER BY id');
console.log('\n=== Resultado final ===');
final.rows.forEach(u => console.log(JSON.stringify(u)));

await pool.end();
