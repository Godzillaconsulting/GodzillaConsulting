/**
 * patchPortafolioLogos.mjs
 * Actualiza el nodo "portafolio" en la DB para reemplazar
 * los paths de Vite compilados (que cambian con cada deploy)
 * con URLs estables del servidor de media.
 * 
 * Uso: node patchPortafolioLogos.mjs
 */
import jwt from "jsonwebtoken";
import https from "https";

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const token = jwt.sign(
  { id: 1, username: 'admin', role: 'admin', is_superadmin: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Mapa de logos estables en el servidor de media
const MEDIA_BASE = 'https://bot.godzillaconsulting.ai/api/media/assets';
const LOGO_URLS = {
  'Facemaker':   `${MEDIA_BASE}/Facemaker Logo@2x.png`,
  'Circle One':  `${MEDIA_BASE}/Circle One Logo@2x.png`,
  'CEO Cuts':    `${MEDIA_BASE}/CEO Cuts Logo@2x.png`,
  'Medhaus':     `${MEDIA_BASE}/Medhaus Logo@2x.png`,
  'Artika':      `${MEDIA_BASE}/Artika Logo@2x.png`,
  'Grupo MRG':   `${MEDIA_BASE}/Grupo MRG Logo@2x.png`,
  'Nutrisa':     `${MEDIA_BASE}/Nutrisa Logo@2x.png`,
  'San Antonio': `${MEDIA_BASE}/San Antonio Logo@2x.png`,
  'Don Elote':   `${MEDIA_BASE}/Don Elote Logo@2x.png`,
  'EP Lighting': `${MEDIA_BASE}/EP Lighting Logo@2x.png`,
};

// Construir el payload con las URLs correctas para cada caso
const patchData = {};
for (let i = 1; i <= 10; i++) {
  // Los nombres los tomamos del estado conocido de la DB
  const nombres = [
    null, // índice 0 vacío
    'Facemaker', 'Circle One', 'CEO Cuts', 'Medhaus', 'Artika',
    'Grupo MRG', 'Nutrisa', 'San Antonio', 'Don Elote', 'EP Lighting'
  ];
  const nombre = nombres[i];
  if (nombre && LOGO_URLS[nombre]) {
    patchData[`caso${i}LogoUrl`] = LOGO_URLS[nombre];
    patchData[`caso${i}Nombre`] = nombre;
  }
}

console.log('Patch data a enviar:');
console.log(JSON.stringify(patchData, null, 2));

const body = JSON.stringify(patchData);

// 1. Primero: actualizar el draft con PATCH
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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
  try {
    console.log('\n1. Actualizando draft del nodo portafolio...');
    const draftResult = await makeRequest('PUT', '/api/nodes/portafolio/draft', body);
    console.log('PUT DRAFT STATUS:', draftResult.status);
    console.log('PUT DRAFT RESPONSE:', draftResult.data.substring(0, 300));

    if (draftResult.status !== 200) {
      console.error('❌ Error actualizando draft. Abortando.');
      return;
    }

    console.log('\n2. Publicando nodo portafolio...');
    const publishResult = await makeRequest('POST', '/api/nodes/portafolio/publish', '{}');
    console.log('PUBLISH STATUS:', publishResult.status);
    console.log('PUBLISH RESPONSE:', publishResult.data.substring(0, 300));

    console.log('\n✅ ¡Listo! El portafolio ha sido actualizado con URLs estables.');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
