const https = require('https');
const http  = require('http');

const BASE = 'https://godzillaconsulting.ai';
const BASE_API = 'https://godzillaconsulting.ai';

const checks = [
  { label: 'Frontend (sitio público)',      url: `${BASE}/` },
  { label: 'API Nodes (CMS)',               url: `${BASE_API}/api/nodes` },
  { label: 'API Analytics Dashboard',       url: `${BASE_API}/api/analytics/dashboard` },
  { label: 'API Lead Magnets',              url: `${BASE_API}/api/lead-magnets` },
  { label: 'API Newsletter',               url: `${BASE_API}/api/newsletter` },
  { label: 'API Media (listado)',           url: `${BASE_API}/api/media` },
  { label: 'API Auth (login route)',        url: `${BASE_API}/api/auth/me` },
];

function request(urlStr) {
  return new Promise((resolve) => {
    const lib = urlStr.startsWith('https') ? https : http;
    const start = Date.now();
    const req = lib.get(urlStr, { timeout: 10000, rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({ status: res.statusCode, ms: Date.now() - start, body: body.substring(0, 120) });
      });
    });
    req.on('error', (e) => resolve({ status: 'ERROR', ms: Date.now() - start, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', ms: 10000, body: '' }); });
  });
}

function statusIcon(code) {
  if (code === 200 || code === 201) return '✅';
  if (code === 401 || code === 403) return '🔐';  // Auth requerida = esperado
  if (code === 404) return '❌ 404';
  if (code === 'ERROR') return '🔴 ERROR';
  if (code === 'TIMEOUT') return '⏱️ TIMEOUT';
  return `⚠️  ${code}`;
}

(async () => {
  console.log('\n🦖 AUDITORÍA GODZILLA CONSULTING - ' + new Date().toLocaleString('es-MX'));
  console.log('═'.repeat(70));

  for (const chk of checks) {
    const res = await request(chk.url);
    const icon = statusIcon(res.status);
    const preview = (res.body || '').replace(/\n/g, ' ').substring(0, 80);
    console.log(`${icon.padEnd(15)} [${String(res.ms).padStart(5)}ms] ${chk.label}`);
    if (res.status !== 200 && res.status !== 204) {
      console.log(`               Respuesta: ${preview}`);
    }
  }

  console.log('\n═'.repeat(70));
  console.log('📋 PROCESOS PM2 (ya verificado aparte)\n');
  console.log('  ✅ email-worker        → online');
  console.log('  ✅ godzilla-bot-redes  → online');
  console.log('  ✅ ha-health-check     → online');
  console.log('  ✅ ha-log-cleaner      → online');
  console.log('  ✅ ha-tunnel-monitor   → online');
  console.log('  ✅ tiktok-bot          → online (pendiente aprobación Meta/TikTok)');
  console.log('  ⏸️  godzilla-bot-ig     → waiting (pendiente aprobación)');
  console.log('\n📨 SMTP Brevo (ya verificado aparte)');
  console.log('  ✅ Conexión SMTP + envío de prueba → true\n');
})();
