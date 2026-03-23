// Simula exactamente cómo Meta envía un DM de Instagram via Messenger Platform
// (object: page, con el ID real de la página de Facebook)
const https = require('https');

const postData = JSON.stringify({
    "object": "page",
    "entry": [{
        "id": "109675814777716",  // Facebook Page ID real de Godzilla Consulting
        "time": Date.now(),
        "messaging": [{
            "sender": { "id": "7891234567" },      // IGSID del usuario externo
            "recipient": { "id": "109675814777716" }, // Page ID
            "timestamp": Date.now(),
            "message": {
                "mid": `mid.ig:${Date.now()}`,
                "text": "Hola! Vi sus servicios de bots en Instagram, me interesa más información."
            }
        }]
    }]
});

const options = {
    hostname: 'godzillaconsulting.ai',
    port: 443,
    path: '/api/webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Hub-Signature-256': 'test-signature'
    }
};

console.log('📤 Simulando DM de Instagram (vía Messenger Platform / object:page)...');
const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => console.log(`BODY: ${chunk}`));
    res.on('end', () => console.log('✅ Evento enviado. Revisa los logs de Vercel.'));
});

req.on('error', (e) => console.error(`Error: ${e.message}`));
req.write(postData);
req.end();
