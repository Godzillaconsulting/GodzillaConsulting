import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function diagMessenger() {
    console.log('📘 DIAGNÓSTICO COMPLETO — MESSENGER BOT\n');
    console.log('='.repeat(55));

    const pageToken = process.env.PAGE_ACCESS_TOKEN;
    const verifyToken = process.env.MY_VERIFY_TOKEN;

    // 1. Variables de entorno
    console.log('\n1️⃣  VARIABLES DE ENTORNO:');
    console.log('   PAGE_ACCESS_TOKEN:', pageToken ? `✅ Presente (${pageToken.length} chars)` : '❌ FALTANTE');
    console.log('   MY_VERIFY_TOKEN:  ', verifyToken ? `✅ "${verifyToken}"` : '❌ FALTANTE');

    // 2. Webhook local — handshake
    console.log('\n2️⃣  WEBHOOK LOCAL (puerto 3000):');
    try {
        const r = await fetch(`http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=MESSENGER_CHECK`);
        const t = await r.text();
        console.log('   Status:', r.status);
        console.log('   Handshake:', t === 'MESSENGER_CHECK' ? '✅ CORRECTO' : `❌ Devolvió: "${t}"`);
    } catch (e) {
        console.error('   ❌ No se puede conectar:', e.message);
    }

    // 3. Webhook Vercel — handshake
    console.log('\n3️⃣  WEBHOOK VERCEL (godzillaconsulting.ai):');
    try {
        const r = await fetch(`https://godzillaconsulting.ai/api/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=VERCEL_CHECK`);
        const t = await r.text();
        console.log('   Status:', r.status);
        console.log('   Handshake:', t === 'VERCEL_CHECK' ? '✅ CORRECTO' : `❌ Devolvió: "${t}"`);
    } catch (e) {
        console.error('   ❌ Error:', e.message);
    }

    // 4. Token de Meta — Graph API
    console.log('\n4️⃣  PAGE_ACCESS_TOKEN (Meta Graph API):');
    try {
        const r = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${pageToken}`);
        const d = await r.json();
        if (d.error) {
            console.error('   ❌ TOKEN INVÁLIDO:', d.error.message);
            console.error('   Código:', d.error.code, '| Tipo:', d.error.type);
            if (d.error.code === 190) {
                console.error('   ⚠️  TOKEN EXPIRADO — necesitas generar un nuevo Page Access Token en Meta Developers');
            }
        } else {
            console.log('   ✅ Token válido. Página:', d.name, '| ID:', d.id);
        }
    } catch (e) {
        console.error('   ❌ Error consultando Meta:', e.message);
    }

    // 5. Simulación POST de mensaje Messenger
    console.log('\n5️⃣  SIMULACIÓN POST — Mensaje Messenger:');
    const mockBody = {
        object: 'page',
        entry: [{
            id: '123456789',
            messaging: [{
                sender: { id: '987654321' },
                recipient: { id: '123456789' },
                timestamp: Date.now(),
                message: { mid: 'test-mid', text: 'Hola Zilla test Messenger' }
            }]
        }]
    };
    try {
        const r = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockBody)
        });
        console.log('   Status POST:', r.status, r.status === 200 ? '✅' : '❌');
        if (r.status !== 200) {
            const t = await r.text();
            console.log('   Respuesta:', t.substring(0, 200));
        }
    } catch (e) {
        console.error('   ❌ Error:', e.message);
    }

    console.log('\n' + '='.repeat(55));
    console.log('Diagnóstico completado.\n');
}

diagMessenger();
