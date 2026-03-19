import bcrypt from 'bcrypt';
import pool from './config/db.js';

const creds = [
  { username: 'admin',          password: 'admin123' },   // contraseña original desconocida, mostrará fallo si es diferente
  { username: 'godzilla_admin', password: 'Godzilla2026!' },
  { username: 'admin_prueba',   password: 'GodzillaTest2026' },
  { username: 'cockers',        password: 'pussyniggabitch' },
];

const rows = (await pool.query('SELECT username, password_hash FROM admins ORDER BY id')).rows;

console.log('\n🔐 Validando usuarios admin:\n');
for (const cred of creds) {
  const row = rows.find(r => r.username === cred.username);
  if (!row) { console.log(`❌ ${cred.username} — NO encontrado en BD`); continue; }
  const ok = await bcrypt.compare(cred.password, row.password_hash);
  console.log(`${ok ? '✅' : '❌'} ${cred.username.padEnd(20)} → ${ok ? 'OK' : 'FALLA (contraseña incorrecta o desconocida)'}`);
}

await pool.end();
