// Script para agregar los tokens de TikTok a Vercel usando los valores de la DB
require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const { execSync } = require('child_process');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    'SELECT open_id, access_token, refresh_token FROM tiktok_tokens ORDER BY updated_at DESC LIMIT 1'
  );
  await pool.end();

  if (!rows.length) throw new Error('No tokens in DB');
  const { open_id, access_token, refresh_token } = rows[0];

  // Agregar a Vercel usando --value flag
  const vars = [
    ['TIKTOK_OPEN_ID', open_id],
    ['TIKTOK_ACCESS_TOKEN', access_token],
    ['TIKTOK_REFRESH_TOKEN', refresh_token],
  ];

  for (const [name, value] of vars) {
    try {
      execSync(`npx vercel env rm ${name} production --yes`, { stdio: 'pipe' });
    } catch {}
    execSync(`npx vercel env add ${name} production --value "${value}" --yes`, { stdio: 'inherit' });
    console.log(`✅ ${name} agregado a Vercel`);
  }

  // Mostrar los valores para el .env
  console.log('\n📋 Copia esto al server/.env:');
  console.log(`TIKTOK_OPEN_ID=${open_id}`);
  console.log(`TIKTOK_ACCESS_TOKEN=${access_token}`);
  console.log(`TIKTOK_REFRESH_TOKEN=${refresh_token}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
