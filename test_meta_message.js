import http from 'http';

const postData = JSON.stringify({
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "12345678901"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Usuario de Prueba Vercel"
                },
                "wa_id": "5215555555555"
              }
            ],
            "messages": [
              {
                "from": "5215555555555",
                "id": "wamid.HBgLNTIxNTU1NTU1NTU1FRQQ...",
                "timestamp": "1631555555",
                "text": {
                  "body": "Hola Zilla, estoy probando que todo mi chat fluya aunque falte el token final."
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
