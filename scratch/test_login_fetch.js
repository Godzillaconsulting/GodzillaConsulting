fetch('https://godzillaconsulting.ai/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'JareG', password: 'Godzilla2026!' })
}).then(async r => {
    console.log('Status:', r.status);
    console.log('Headers:', r.headers);
    const text = await r.text();
    console.log('Body:', text);
}).catch(console.error);
