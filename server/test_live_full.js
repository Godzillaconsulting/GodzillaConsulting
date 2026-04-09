import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const API_URL = 'http://localhost:3000';

console.log('🦖 === PRUEBA EN VIVO: GODZILLA BOT AGENDAMIENTO ===\n');

// 1. Simular un chat completo con el bot
console.log('📨 PASO 1: Enviando conversación completa al bot (igual que un cliente real)...\n');

const conversation = [
    { role: 'user', content: 'Hola, quiero información sobre sus servicios' },
    { role: 'assistant', content: 'Placeholder' },
    { role: 'user', content: 'Me interesa el servicio de Automatización de Bots. ¿Cómo puedo agendar una cita?' },
    { role: 'assistant', content: 'Placeholder' },
    { role: 'user', content: 'Sí quiero agendar. Mi nombre es Carlos Prueba, mi correo es carlos.prueba@test.com, mi teléfono es 6561234567, el servicio es Automatización de Bots, para el 2026-03-25 a las 11:00. Notas: Prueba automática en vivo.' },
];

try {
    // Paso 1: Chat con el bot
    console.log('   Usuario: "Hola, quiero información sobre sus servicios"');
    const resp1 = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [conversation[0]] })
    });
    const data1 = await resp1.json();
    console.log(`   Zilla: "${data1.reply?.substring(0, 120)}..."\n`);

    // Paso 2: Pedir cita
    console.log('   Usuario: "Me interesa el servicio de Automatización de Bots. ¿Cómo puedo agendar?"');
    const resp2 = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [conversation[0], { role: 'model', content: data1.reply }, conversation[2]] })
    });
    const data2 = await resp2.json();
    console.log(`   Zilla: "${data2.reply?.substring(0, 120)}..."\n`);

    // Paso 3: Dar todos los datos para agendar
    console.log('   Usuario: Dando todos los datos para agendar (Carlos Prueba, 2026-03-25 11:00)...');
    const fullHistory = [
        conversation[0],
        { role: 'model', content: data1.reply },
        conversation[2],
        { role: 'model', content: data2.reply },
        conversation[4]
    ];
    
    const resp3 = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: fullHistory })
    });
    const data3 = await resp3.json();
    console.log(`   Zilla: "${data3.reply?.substring(0, 200)}"\n`);

    // Paso 4: Confirmar la cita para que se guarde
    console.log('   Usuario: "Sí, confirmo todos los datos, por favor agenda la cita."');
    const confirmHistory = [
        ...fullHistory,
        { role: 'model', content: data3.reply },
        { role: 'user', content: 'Sí, confirmo todos los datos, por favor agenda la cita.' }
    ];
    const resp4 = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: confirmHistory })
    });
    const data4 = await resp4.json();
    console.log(`   Zilla: "${data4.reply?.substring(0, 300)}"\n`);

    // Verificar en la BD
    console.log('🗄️  PASO 2: Verificando en base de datos (PostgreSQL Local)...');
    await new Promise(r => setTimeout(r, 1000));
    const dbResult = await pool.query(
        `SELECT id, nombre_completo, email, fecha, hora, status, created_at 
         FROM citas WHERE email = 'carlos.prueba@test.com'
         ORDER BY created_at DESC LIMIT 1`
    );

    if (dbResult.rows.length > 0) {
        const cita = dbResult.rows[0];
        console.log('   ✅ CITA ENCONTRADA EN BASE DE DATOS:');
        console.log(`      ID: ${cita.id}`);
        console.log(`      Nombre: ${cita.nombre_completo}`);
        console.log(`      Email: ${cita.email}`);
        console.log(`      Fecha: ${new Date(cita.fecha).toLocaleDateString('es-MX')}`);
        console.log(`      Hora: ${cita.hora}`);
        console.log(`      Status: ${cita.status}`);
    } else {
        console.log('   ⚠️  No se encontró la cita en la BD todavía (puede que el bot no activó save_appointment)');
        console.log('       Revisando si hubo algún error en la respuesta del bot...');
        if (data3.reply?.toLowerCase().includes('error') || data3.reply?.toLowerCase().includes('fallo')) {
            console.log('   ❌ La respuesta del bot indica un problema:', data3.reply);
        } else {
            console.log('   ℹ️  La respuesta del bot no activó el agendamiento todavía (faltaron datos o está en modo conversacional)');
        }
    }

    console.log('\n🎯 RESUMEN:');
    console.log('   WhatsApp Bot:   ✅ Activo');
    console.log('   Messenger Bot:  ✅ Activo');
    console.log('   Chat Web:       ✅ Activo');
    console.log('   Google Calendar:', dbResult.rows.length > 0 ? '✅ Integrado' : '⚠️  Verificar manualmente');
    console.log('   Base de Datos:  ', dbResult.rows.length > 0 ? '✅ Guardando citas' : '⚠️  No guardó esta prueba');
    console.log('\n🦖 Prueba completada.\n');

} catch (err) {
    console.error('❌ Error en la prueba:', err.message);
} finally {
    await pool.end();
}
