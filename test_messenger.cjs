const http = require('http');

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
            "text": "Hola Zilla, prueba desde Messenger"
          }
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
