import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook?hub.mode=subscribe&hub.verify_token=GodzillaSecret2026&hub.challenge=1234567890',
  method: 'GET'
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

req.end();
