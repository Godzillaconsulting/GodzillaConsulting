import fetch from 'node-fetch';

async function testChatEndpoint() {
    console.log('🤖 Probando endpoint /api/chat en servidor local...\n');

    const messages = [
        { role: 'user', text: 'Hola, quiero agendar una cita. Mi nombre es Carlos Mendoza.' }
    ];

    try {
        const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        console.log('Status HTTP:', res.status);
        const data = await res.json();

        if (data.reply) {
            console.log('\n✅ Zilla respondió:\n');
            console.log(data.reply);
        } else {
            console.error('\n❌ Error en respuesta:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('\n❌ Error de conexión:', err.message);
    }
}

testChatEndpoint();
