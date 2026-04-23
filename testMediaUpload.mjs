/**
 * testMediaUpload.mjs
 * Prueba un upload de imagen pequeña directo al servidor de producción
 * para ver el error real de la DB.
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const token = jwt.sign(
  { id: 1, username: 'admin', role: 'admin', is_superadmin: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Crear una imagen PNG de prueba mínima (1x1 px rojo)
const PNG_1PX = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
  '2e00000000c49444154789c6260f8cfc00000000200019e221bc40000000049454e44ae426082',
  'hex'
);

const boundary = '----FormBoundary' + Date.now();
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-logo.png"\r\nContent-Type: image/png\r\n\r\n`),
  PNG_1PX,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const options = {
  hostname: 'bot.godzillaconsulting.ai',
  port: 443,
  path: '/api/media/upload',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  }
};

console.log('Enviando imagen de prueba (1px PNG) al servidor...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data);
  });
});

req.on('error', e => console.error('Error de red:', e.message));
req.write(body);
req.end();
