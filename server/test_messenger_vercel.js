import fetch from 'node-fetch';

async function testMessengerVercel() {
    console.log('📘 TEST MESSENGER → VERCEL WEBHOOK\n');
    console.log('='.repeat(50));

    // Simulo un mensaje real de Messenger enviando al webhook de Vercel
    const mockBody = {
        object: 'page',
        entry: [{
            id: '109675814777716',
            messaging: [{
                sender: { id: '7612345678901234' },   // PSID simulado realista
                recipient: { id: '109675814777716' },
                timestamp: Date.now(),
                message: {
                    mid: 'mid.test.1234567890',
                    text: 'Hola Zilla, quiero información sobre sus servicios'
                }
            }]
        }]
    };

    console.log('\n1️⃣  Enviando evento Messenger a Vercel webhook...');
    try {
        const r = await fetch('https://godzillaconsulting.ai/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockBody)
        });
        console.log('   Status:', r.status, r.status === 200 ? '✅ Webhook recibió el mensaje' : '❌');
        if (r.status !== 200) {
            const t = await r.text();
            console.log('   Respuesta:', t.substring(0, 300));
        }
    } catch(e) {
        console.error('   ❌ Error:', e.message);
    }

    // Esperar 5 segundos y ver si el bot respondió en algún log
    console.log('\n2️⃣  El intent de respuesta ocurrirá en Vercel (no en local).');
    console.log('   Verifica en: https://vercel.com → tu proyecto → Functions → Logs');
    console.log('   Busca si aparece el error: "PAGE_ACCESS_TOKEN no encontrado"');
    console.log('   o si dice: "Respuesta enviada satisfactoriamente"');

    // También prueba el health de Vercel
    console.log('\n3️⃣  Estado del servidor Vercel:');
    try {
        const r = await fetch('https://godzillaconsulting.ai/api/health');
        const d = await r.json();
        console.log('   Health:', r.status === 200 ? `✅ Uptime: ${d.uptime}s` : '❌');
    } catch(e) {
        console.error('   ❌', e.message);
    }

    console.log('\n' + '='.repeat(50));
}

testMessengerVercel();
