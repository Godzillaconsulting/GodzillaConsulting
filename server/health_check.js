import fetch from 'node-fetch';

const BASE = 'https://godzillaconsulting.ai';
const tests = [
  { name: 'Sitio principal',     url: `${BASE}/`,                       method: 'GET' },
  { name: 'API Health',          url: `${BASE}/api/health`,             method: 'GET' },
  { name: 'API Nodes',           url: `${BASE}/api/nodes`,              method: 'GET' },
  { name: 'Login API',           url: `${BASE}/api/auth/login`,         method: 'POST', body: { username: 'godzilla_admin', password: 'Godzilla2026!' } },
  { name: 'Login godzilla_admin',url: `${BASE}/api/auth/login`,         method: 'POST', body: { username: 'godzilla_admin', password: 'Godzilla2026!' } },
  { name: 'Login cockers',       url: `${BASE}/api/auth/login`,         method: 'POST', body: { username: 'cockers',        password: 'pussyniggabitch' } },
];

console.log('\n🦖 GODZILLA CONSULTING — HEALTH CHECK PRE-LIVE\n' + '═'.repeat(50));

for (const t of tests) {
  try {
    const opts = { method: t.method, headers: { 'Content-Type': 'application/json' } };
    if (t.body) opts.body = JSON.stringify(t.body);
    const r = await fetch(t.url, opts);
    const ok = r.status < 400;
    const icon = ok ? '✅' : '❌';
    let extra = '';
    if (t.name.startsWith('Login') && ok) {
      const d = await r.json();
      extra = d.token ? ' → TOKEN OK' : ' → SIN TOKEN';
    } else if (t.name === 'API Nodes' && ok) {
      const d = await r.json();
      extra = ` → ${d.length} nodos`;
    }
    console.log(`${icon} ${t.name.padEnd(25)} HTTP ${r.status}${extra}`);
  } catch(e) {
    console.log(`❌ ${t.name.padEnd(25)} ERROR: ${e.message}`);
  }
}
console.log('\n' + '═'.repeat(50));
console.log('🚀 Sitio: https://godzillaconsulting.ai');
console.log('🔐 Admin: https://godzillaconsulting.ai/login');
