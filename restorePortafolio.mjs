/**
 * restorePortafolio.mjs
 * Restaura el nodo "portafolio" con todos los datos correctos.
 * Uso: node restorePortafolio.mjs
 */
import jwt from "jsonwebtoken";
import https from "https";

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const token = jwt.sign(
  { id: 1, username: 'admin', role: 'admin', is_superadmin: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Datos completos del portafolio (logoUrl vacío → el frontend resuelve por nombre)
const draft_data = {
  caso1Nombre:   'Facemaker',
  caso1Category: 'Clínica Estética',
  caso1LogoUrl:  '',
  caso1Link:     'https://www.behance.net/gallery/141627437/Videos-Facemaker',

  caso2Nombre:   'Circle One',
  caso2Category: 'Hotelería',
  caso2LogoUrl:  '',
  caso2Link:     'https://www.behance.net/gallery/237537945/Videos-Bluebay',

  caso3Nombre:   'CEO Cuts',
  caso3Category: 'Barbería',
  caso3LogoUrl:  '',
  caso3Link:     'https://www.behance.net/gallery/167882931/Cliente-Barberia-CEO-CUTS',

  caso4Nombre:   'Medhaus',
  caso4Category: 'Sector Médico',
  caso4LogoUrl:  '',
  caso4Link:     'https://www.behance.net/gallery/243411113/Contenido-en-redes-Medhaus',

  caso5Nombre:   'Artika',
  caso5Category: 'Heladerías',
  caso5LogoUrl:  '',
  caso5Link:     'https://www.behance.net/gallery/167882391/Cliente-Artika',

  caso6Nombre:   'Grupo MRG',
  caso6Category: 'Banquetes y Eventos',
  caso6LogoUrl:  '',
  caso6Link:     'https://www.behance.net/gallery/167886795/Cliente-Grupo-MRG',

  caso7Nombre:   'Nutrisa',
  caso7Category: 'Sector Alimenticio',
  caso7LogoUrl:  '',
  caso7Link:     'https://www.behance.net/gallery/154725623/Creacion-de-logotipo-Nutrisa',

  caso8Nombre:   'San Antonio',
  caso8Category: 'Sector Médico',
  caso8LogoUrl:  '',
  caso8Link:     '',

  caso9Nombre:   'Don Elote',
  caso9Category: 'Sector Alimenticio',
  caso9LogoUrl:  '',
  caso9Link:     'https://www.behance.net/gallery/150619269/Diseno-de-posts-Don-Elote',

  caso10Nombre:   'EP Lighting',
  caso10Category: 'Iluminación / Arquitectura',
  caso10LogoUrl:  '',
  caso10Link:     'https://www.behance.net/gallery/243410623/Diseno-editorial-EP-Lighting',
};

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
  // El API espera { draft_data: {...} }
  const body = JSON.stringify({ draft_data });

  console.log('1. Guardando draft con datos correctos...');
  const draftResult = await makeRequest('PUT', '/api/nodes/portafolio/draft', body);
  console.log('PUT DRAFT STATUS:', draftResult.status);
  if (draftResult.status !== 200) {
    console.error('❌ Error:', draftResult.data.substring(0, 300));
    return;
  }

  console.log('\n2. Publicando...');
  const pubResult = await makeRequest('POST', '/api/nodes/portafolio/publish', '{}');
  console.log('PUBLISH STATUS:', pubResult.status);

  console.log('\n✅ Portafolio restaurado correctamente.');
  console.log('   Los logos se resolverán por nombre del cliente en el frontend.');
}

run().catch(console.error);
