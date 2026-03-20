import https from 'https';

// Test 1: env-check
function get(path) {
  return new Promise((resolve) => {
    const req = https.request({ hostname: 'godzillaconsulting.ai', path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { console.log(`\n=== GET ${path} ===`); try { console.log(JSON.stringify(JSON.parse(data), null, 2)); } catch { console.log(data); } resolve(); });
    });
    req.on('error', e => { console.error('Error:', e.message); resolve(); });
    req.end();
  });
}

await get('/api/env-check');
