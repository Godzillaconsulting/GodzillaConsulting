import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'server/.env') });

const PROD_URL = 'https://godzillaconsulting.ai';

console.log('🧪 Test completo del flujo de agendamiento en producción\n');

// Simula exactamente lo que hace el chatbot web (mensajes acumulados)
const messages = [
    {
        role: 'model',
        text: '¡Hola! Soy Zilla, ¿cómo puedo ayudarte?'
    },
    {
        role: 'user',
        text: 'Soy Carlos Mendoza, correo carlos@barbershop.mx, cel 6561234567, quiero Automatizacion de Bots, fecha 2026-04-01, hora 09:00, notas barberia con 5 estilistas en Ciudad Juarez'
    }
];

console.log('📤 Enviando mensaje con todos los datos...');
const r = await fetch(`${PROD_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
});

console.log('   HTTP Status:', r.status);
const data = await r.json();
console.log('   Respuesta del bot:');
console.log('  ', data.reply || '[VACÍO]');
console.log('');

if (data.reply && data.reply.length > 10) {
    console.log('✅ El bot respondió correctamente');
} else {
    console.log('❌ Respuesta vacía - hay un problema');
}
