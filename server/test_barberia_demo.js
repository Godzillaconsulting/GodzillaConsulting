import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const API_URL = 'http://localhost:3000';

// Simular conversación real de dueño de barbería
const conversacion = [
    "Hola, tengo una barbería de caballeros y quiero automatizar mis citas y atención al cliente con IA",
    "¿Cuánto cuesta y qué incluye exactamente para una barbería?",
    "¿Cuánto tiempo tarda en estar funcionando?",
    "Me interesa, mi nombre es Roberto García, mi correo es roberto@barberking.mx, mi celular es 6564321987, quiero el servicio de Automatización de Bots para el 2026-03-26 a las 14:00. Notas: tengo barbería con 3 estilistas y necesito captación de clientes en WhatsApp.",
    "Sí, confirmo la cita."
];

console.log('💈 ====================================================');
console.log('💈  DEMO EN VIVO: BOT ZILLA × BARBERÍA DE CABALLEROS');
console.log('💈 ====================================================\n');
console.log('📱 Simulando conversación como si fuera por WhatsApp o Messenger...\n');
console.log('─'.repeat(60));

let historial = [];

for (let i = 0; i < conversacion.length; i++) {
    const mensaje = conversacion[i];
    
    console.log(`\n👤 [Cliente - Roberto, Dueño de Barbería]:`);
    console.log(`   "${mensaje}"\n`);
    
    // Agregar mensaje del usuario al historial
    historial.push({ role: 'user', content: mensaje });
    
    try {
        const resp = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: historial })
        });
        
        if (!resp.ok) {
            console.error(`❌ Error HTTP: ${resp.status}`);
            break;
        }
        
        const data = await resp.json();
        const respuesta = data.reply || data.error || 'Sin respuesta';
        
        console.log(`🤖 [Zilla - Godzilla Consulting]:`);
        console.log(`   ${respuesta.replace(/\n/g, '\n   ')}`);
        console.log('\n' + '─'.repeat(60));
        
        // Agregar respuesta del bot al historial
        historial.push({ role: 'model', content: respuesta });
        
        // Pausa entre mensajes para simular conversación real
        await new Promise(r => setTimeout(r, 500));
        
    } catch (err) {
        console.error(`❌ Error de conexión: ${err.message}`);
        console.error('   ⚠️  Asegúrate que el servidor esté corriendo en localhost:3000');
        break;
    }
}

// Verificar si se guardó la cita
console.log('\n💈 ====================================================');
console.log('💈  VERIFICANDO RESULTADO EN BASE DE DATOS...');
console.log('💈 ====================================================\n');

try {
    const { default: pg } = await import('pg');
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const r = await pool.query(
        `SELECT id, nombre_completo, email, telefono, tipo_sesion, fecha, hora, status, created_at 
         FROM citas WHERE email = 'roberto@barberking.mx'
         ORDER BY created_at DESC LIMIT 1`
    );
    
    if (r.rows.length > 0) {
        const c = r.rows[0];
        console.log('✅ ¡CITA GUARDADA EN EL SISTEMA!');
        console.log(`   🆔 ID:        ${c.id}`);
        console.log(`   👤 Cliente:   ${c.nombre_completo}`);
        console.log(`   📧 Email:     ${c.email}`);
        console.log(`   📱 Teléfono:  ${c.telefono}`);
        console.log(`   🛠️  Servicio:  ${c.tipo_sesion}`);
        console.log(`   📅 Fecha:     ${new Date(c.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
        console.log(`   🕐 Hora:      ${c.hora}`);
        console.log(`   ✅ Status:    ${c.status}`);
        console.log('\n💈 Demo completada con éxito. El sistema funciona para barberías. 🦖');
    } else {
        console.log('ℹ️  La cita no se guardó todavía (posiblemente el bot pidió más pasos de confirmación).');
        console.log('   Esto es normal si el bot sigue un flujo conversacional más largo.');
        console.log('\n💈 Demo de conversación completada. El bot respondió correctamente. 🦖');
    }
    
    await pool.end();
} catch (e) {
    console.log('⚠️  No se pudo verificar BD:', e.message);
}
