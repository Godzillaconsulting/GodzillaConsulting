import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../server/.env') });

const PROD_URL = 'https://godzillaconsulting.ai';

console.log('🌐 Probando API en producción:', PROD_URL);
console.log('');

// Test 1: Health
console.log('1️⃣  GET /api/health...');
const h = await fetch(`${PROD_URL}/api/health`);
const hData = await h.json();
console.log('   Status:', h.status, hData);
console.log('');

// Test 2: Chat simple
console.log('2️⃣  POST /api/chat con mensaje de barbería...');
const r = await fetch(`${PROD_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        messages: [
            { role: 'user', content: 'Hola, tengo una barbería de caballeros, quiero agendar' }
        ]
    })
});

console.log('   HTTP Status:', r.status);
if (r.status === 200) {
    const data = await r.json();
    console.log('   ✅ Respuesta del bot:', data.reply?.substring(0, 150) + '...');
} else {
    const txt = await r.text();
    console.log('   ❌ Error:', txt.substring(0, 300));
}
console.log('');

// Test 3: Agendamiento completo
console.log('3️⃣  POST /api/chat con datos completos de cita...');
const r2 = await fetch(`${PROD_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        messages: [
            { role: 'user', content: 'Hola, quiero agendar. Soy Roberto Garcia, correo roberto@barberking.mx, cel 6564321987, servicio Automatizacion de Bots, fecha 2026-03-27, hora 11:00. Notas: barberia con 3 estilistas.' }
        ]
    })
});

console.log('   HTTP Status:', r2.status);
if (r2.status === 200) {
    const data2 = await r2.json();
    console.log('   ✅ Bot respondió:', data2.reply?.substring(0, 200));
} else {
    const txt2 = await r2.text();
    console.log('   ❌ Error en producción:', txt2.substring(0, 500));
}
