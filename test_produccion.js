import https from 'https';

const postData = JSON.stringify({
  "object": "page",
  "entry": [
    {
      "id": "123456789_page_id",
      "time": 1458692752478,
      "messaging": [
        {
          "sender": {
            "id": "987654321_user_id"
          },
          "recipient": {
            "id": "123456789_page_id"
          },
          "timestamp": 1458692752478,
          "message": {
            "mid": "mid.1457764197618:41d102a3e1ae206a38",
            "text": "Hola Zilla, estoy probando si el servidor oficial de Vercel recibe y contesta mis mensajes. (Test de Producción)"
          }
        }
      ]
    }
  ]
});

const options = {
  hostname: 'godzillaconsulting.ai',
  port: 443,
  path: '/api/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS (Producción): ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Error de conexión al servidor de Vercel: ${e.message}`);
});

req.write(postData);
req.end();
