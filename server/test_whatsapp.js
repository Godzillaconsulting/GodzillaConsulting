import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testWhatsApp() {
    console.log('📱 Diagnóstico completo de WhatsApp Bot\n');
    console.log('='.repeat(50));

    // 1. Verificar token
    const token = process.env.WP_ACCESS_TOKEN;
    console.log('\n1️⃣  WP_ACCESS_TOKEN:', token ? `Presente (${token.length} chars)` : '❌ FALTANTE');

    // 2. Verificar webhook local
    console.log('\n2️⃣  Verificando handshake del webhook local...');
    try {
        const res = await fetch('http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=GodzillaSecret2026&hub.challenge=TEST123');
        const text = await res.text();
        console.log('   Status:', res.status);
        console.log('   Challenge respondido:', text === 'TEST123' ? '✅ CORRECTO' : `❌ Devolvió: "${text}"`);
    } catch (err) {
        console.error('   ❌ Error conectando al webhook local:', err.message);
    }

    // 3. Verificar que Meta puede llegar al webhook via Cloudflare
    console.log('\n3️⃣  Verificando webhook via Cloudflare tunnel...');
    try {
        const res = await fetch('https://bot.godzillaconsulting.ai/api/webhook?hub.mode=subscribe&hub.verify_token=GodzillaSecret2026&hub.challenge=TUNNEL_TEST');
        if (res.ok) {
            const text = await res.text();
            console.log('   Status:', res.status);
            console.log('   Cloudflare tunnel:', text === 'TUNNEL_TEST' ? '✅ ACTIVO Y FUNCIONAL' : `⚠️ Devolvió: "${text}"`);
        } else {
            console.log('   ❌ Status:', res.status, res.statusText);
        }
    } catch (err) {
        console.error('   ❌ Cloudflare tunnel NO responde:', err.message);
        console.error('   → El DNS bot.godzillaconsulting.ai no resuelve todavía');
    }

    // 4. Verificar token de Meta con Graph API
    console.log('\n4️⃣  Verificando validez del token con Meta Graph API...');
    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
        const data = await res.json();
        if (data.error) {
            console.error('   ❌ Token INVÁLIDO:', data.error.message);
            console.error('   Código:', data.error.code, '| Subtipo:', data.error.error_subcode);
        } else {
            console.log('   ✅ Token VÁLIDO. Cuenta:', data.name || data.id);
        }
    } catch (err) {
        console.error('   ❌ Error consultando Meta API:', err.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Diagnóstico completado.\n');
}

testWhatsApp();
