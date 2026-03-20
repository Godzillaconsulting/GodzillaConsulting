import https from 'https';

function post(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ messages });
    const req = https.request({
      hostname: 'godzillaconsulting.ai',
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ reply: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const t1 = await post([
  { role: 'user', text: 'Quiero agendar, soy Luis Ramirez, correo luis@test.mx, tel 6561234567, servicio IA, fecha 2026-03-28, hora 14:00, sin notas' }
]);
console.log('T1:', t1.reply?.substring(0, 150));

const t2 = await post([
  { role: 'user', text: 'Quiero agendar, soy Luis Ramirez, correo luis@test.mx, tel 6561234567, servicio IA, fecha 2026-03-28, hora 14:00, sin notas' },
  { role: 'model', text: t1.reply },
  { role: 'user', text: 'Si confirmo todo, procede' }
]);
console.log('\nT2:', t2.reply);
