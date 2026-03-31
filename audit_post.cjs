const https = require('https');

function post(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 'ERROR', body: e.message }));
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('\n🔍 Verificando rutas POST...\n');

  // 1. Newsletter subscribe
  const nl = await post('https://godzillaconsulting.ai/api/newsletter/subscribe', {
    email: 'audit@godzilla.test',
    name: 'Audit Test'
  });
  console.log(`Newsletter /subscribe → HTTP ${nl.status}`);
  console.log(`  Respuesta: ${nl.body.substring(0, 120)}\n`);

  // 2. Auth login (credenciales incorrectas a propósito para solo verificar que la ruta responde)
  const auth = await post('https://godzillaconsulting.ai/api/auth/login', {
    username: 'audit_check_only',
    password: 'invalid_123'
  });
  console.log(`Auth /login → HTTP ${auth.status}`);
  console.log(`  Respuesta: ${auth.body.substring(0, 120)}\n`);

  // 3. Contact form
  const contact = await post('https://godzillaconsulting.ai/api/contact', {
    name: 'Audit',
    email: 'audit@godzilla.test',
    message: 'Test de auditoría'
  });
  console.log(`Contact /api/contact → HTTP ${contact.status}`);
  console.log(`  Respuesta: ${contact.body.substring(0, 120)}\n`);
})();
