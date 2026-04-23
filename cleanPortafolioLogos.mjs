/**
 * cleanPortafolioLogos.mjs
 * Limpia las URLs rotas en la DB del nodo "portafolio",
 * dejando logoUrl vacío para que el frontend resuelva
 * el logo por nombre del cliente (via LOGO_BY_NAME).
 * 
 * Uso: node cleanPortafolioLogos.mjs
 */
import jwt from "jsonwebtoken";
import https from "https";

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const token = jwt.sign(
  { id: 1, username: 'admin', role: 'admin', is_superadmin: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Limpiar SOLO los LogoUrl — conservar nombres, categorías y links
const cleanData = {};
for (let i = 1; i <= 10; i++) {
  cleanData[`caso${i}LogoUrl`] = ''; // Vacío → el frontend resuelve por nombre
}

console.log('Limpiando todos los caso*LogoUrl a cadena vacía...');

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bot.godzillaconsulting.ai',
      port: 443,
      path,
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const body = JSON.stringify(cleanData);
  
  console.log('\n1. Actualizando draft...');
  const draftResult = await makeRequest('PUT', '/api/nodes/portafolio/draft', body);
  console.log('PUT DRAFT STATUS:', draftResult.status);
  
  if (draftResult.status !== 200) {
    console.error('❌ Error:', draftResult.data.substring(0, 200));
    return;
  }

  console.log('\n2. Publicando...');
  const pubResult = await makeRequest('POST', '/api/nodes/portafolio/publish', '{}');
  console.log('PUBLISH STATUS:', pubResult.status);

  console.log('\n✅ Hecho. Los logoUrls ahora están vacíos y el frontend resolverá por nombre.');
}

run().catch(console.error);
