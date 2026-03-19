import fetch from 'node-fetch';

const res = await fetch('https://godzillaconsulting.ai/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'cockers', password: 'pussyniggabitch' })
});

console.log('Status:', res.status);
const text = await res.text();
console.log('Body:', text);
