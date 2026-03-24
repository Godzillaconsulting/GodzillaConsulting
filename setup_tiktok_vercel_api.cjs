// Agrega tokens TikTok a Vercel usando la REST API (evita problemas de CLI con caracteres especiales)
require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const https = require('https');

async function vercelApiRequest(method, path, body) {
  // Lee el token de Vercel del archivo de config
  const fs = require('fs');
  const configPath = require('os').homedir() + '/.local/share/com.vercel.cli/auth.json';
  const configPath2 = require('os').homedir() + '/AppData/Local/com.vercel.cli/auth.json';
  let vercelToken;
  try {
    vercelToken = JSON.parse(fs.readFileSync(configPath2, 'utf8')).token;
  } catch {
    try {
      vercelToken = JSON.parse(fs.readFileSync(configPath, 'utf8')).token;
    } catch {
      throw new Error('No se pudo leer el token de Vercel. Necesita ejecutar: npx vercel login');
    }
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        'Authorization': 'Bearer ' + vercelToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(responseData) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    'SELECT open_id, access_token, refresh_token FROM tiktok_tokens ORDER BY updated_at DESC LIMIT 1'
  );
  await pool.end();

  if (!rows.length) throw new Error('No tokens in DB');
  const { open_id, access_token, refresh_token } = rows[0];

  // Project ID del proyecto Vercel
  const projectId = 'godzilla-app';

  const envVars = [
    { key: 'TIKTOK_OPEN_ID', value: open_id },
    { key: 'TIKTOK_ACCESS_TOKEN', value: access_token },
    { key: 'TIKTOK_REFRESH_TOKEN', value: refresh_token },
  ];

  for (const { key, value } of envVars) {
    // Intenta eliminar primero
    try {
      // Busca el env var existente
      const listRes = await vercelApiRequest('GET', `/v10/projects/${projectId}/env`, {});
      const existing = listRes.body.envs?.find(e => e.key === key);
      if (existing) {
        await vercelApiRequest('DELETE', `/v10/projects/${projectId}/env/${existing.id}`, {});
        console.log(`🗑️  Eliminado ${key} existente`);
      }
    } catch (e) {}

    // Agrega el nuevo
    const res = await vercelApiRequest('POST', `/v10/projects/${projectId}/env`, {
      key,
      value,
      type: 'encrypted',
      target: ['production']
    });

    if (res.status === 200 || res.status === 201) {
      console.log(`✅ ${key} agregado a Vercel`);
    } else {
      console.error(`❌ Error en ${key}: ${JSON.stringify(res.body)}`);
    }
  }

  console.log('\n✅ Todos los tokens TikTok configurados en Vercel!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
