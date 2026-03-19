import fetch from 'node-fetch';

async function testWebhookVercel() {
    console.log('🔍 Verificando webhook de WhatsApp en Vercel...\n');

    // Test del verify token (handshake Meta)
    const url = 'https://godzillaconsulting.ai/api/webhook?hub.mode=subscribe&hub.verify_token=GodzillaSecret2026&hub.challenge=LIVE_TEST_12345';
    
    try {
        const res = await fetch(url);
        const text = await res.text();
        
        console.log('Status:', res.status);
        console.log('Respuesta:', text);
        
        if (text === 'LIVE_TEST_12345') {
            console.log('\n✅ ¡WEBHOOK VERCEL OPERATIVO!');
            console.log('→ Configura en Meta Developers:');
            console.log('   URL: https://godzillaconsulting.ai/api/webhook');
            console.log('   Verify Token: GodzillaSecret2026');
        } else {
            console.log('\n⚠️  Respuesta inesperada del webhook');
        }
    } catch (err) {
        console.error('\n❌ Error:', err.message);
    }
}

testWebhookVercel();
