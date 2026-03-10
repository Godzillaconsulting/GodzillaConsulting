const https = require('https');

const postData = JSON.stringify({
  "object": "instagram",
  "entry": [
    {
      "id": "987654321_ig_page_id",
      "time": 1458692752478,
      "messaging": [
        {
          "sender": {
            "id": "123456789_ig_user_id"
          },
          "recipient": {
            "id": "987654321_ig_page_id"
          },
          "timestamp": 1458692752478,
          "message": {
            "mid": "mid.ig:41d102a3e1ae206a38",
            "text": "Hola Zilla, prueba desde Instagram de producción"
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
  console.log(`STATUS (Instagram Test): ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();
