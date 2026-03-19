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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const msgs = [
  { role: 'user', text: 'Agenda cita: nombre Test3 User, correo test3@test.com, tel 6561111111, servicio IA, fecha 2026-03-27, hora 11:00, notas prueba DB' },
];

const t1 = await post(msgs);
msgs.push({ role: 'model', text: t1.body.reply });
msgs.push({ role: 'user', text: 'Si, confirmo todo, es correcto, procede a agendar' });

const t2 = await post(msgs);
msgs.push({ role: 'model', text: t2.body.reply });
msgs.push({ role: 'user', text: 'Si es correcto, agenda ahora mismo' });

const t3 = await post(msgs);
msgs.push({ role: 'model', text: t3.body.reply });
msgs.push({ role: 'user', text: 'Correcto, agenda' });

const t4 = await post(msgs);

console.log('T1:', t1.body.reply?.substring(0, 100));
console.log('T2:', t2.body.reply?.substring(0, 100));
console.log('T3:', t3.body.reply?.substring(0, 100));
console.log('\nT4 FINAL:', t4.body.reply);
