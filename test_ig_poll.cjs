// Prueba polling de conversaciones Instagram via Graph API
// Si funciona, reemplaza webhooks sin necesitar App Review
require('dotenv').config({ path: require('path').join(__dirname, 'server', '.env') });

const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_ID = '109675814777716';  // FB Page ID (me)
const IG_ID   = '17841476174280544'; // Instagram Business ID

async function testPolling() {
    console.log('\n🔍 Test polling de Instagram DMs...\n');

    // Intento 1: desde la FB Page con platform=instagram
    const r1 = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?platform=instagram&fields=participants,messages{message,from,created_time}&access_token=${PAGE_TOKEN}`)
        .then(r => r.json());
    console.log('[1] PAGE/conversations?platform=instagram:');
    if (r1.error) console.log('    ❌', r1.error.code, r1.error.message);
    else console.log('    ✅ Conversaciones:', r1.data?.length || 0);

    // Intento 2: desde /me (el page token hace que /me = la página)
    const r2 = await fetch(`https://graph.facebook.com/v19.0/me/conversations?platform=instagram&fields=participants,messages{message,from,created_time}&access_token=${PAGE_TOKEN}`)
        .then(r => r.json());
    console.log('[2] /me/conversations?platform=instagram:');
    if (r2.error) console.log('    ❌', r2.error.code, r2.error.message);
    else {
        console.log('    ✅ Conversaciones:', r2.data?.length || 0);
        r2.data?.forEach(c => console.log('    -', JSON.stringify(c)));
    }

    // Intento 3: desde el IG Business Account ID
    const r3 = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/conversations?fields=participants,messages{message,from,created_time}&access_token=${PAGE_TOKEN}`)
        .then(r => r.json());
    console.log('[3] IG_ID/conversations:');
    if (r3.error) console.log('    ❌', r3.error.code, r3.error.message);
    else console.log('    ✅ Conversaciones:', r3.data?.length || 0);

    // Intento 4: inbox via /me/messages
    const r4 = await fetch(`https://graph.facebook.com/v19.0/me/messages?fields=id,from,message,created_time&access_token=${PAGE_TOKEN}`)
        .then(r => r.json());
    console.log('[4] /me/messages:');
    if (r4.error) console.log('    ❌', r4.error.code, r4.error.message);
    else console.log('    ✅ Mensajes:', r4.data?.length || 0, JSON.stringify(r4.data?.[0]));
}

testPolling().catch(e => console.error('Error:', e.message));
