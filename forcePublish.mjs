import jwt from "jsonwebtoken";
import https from "https";

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const token = jwt.sign({ id: 1, username: 'admin', role: 'admin', is_superadmin: true }, JWT_SECRET, { expiresIn: '1h' });

const options = {
  hostname: 'godzillaconsulting.ai',
  port: 443,
  path: '/api/nodes/paquete-control-ia/publish',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
});

req.on('error', (e) => console.error(e));
req.end();
