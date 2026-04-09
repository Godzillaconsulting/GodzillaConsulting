require('dotenv').config();
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_ID = '17841476174280544'; // @godzilla_consulting
const PAGE_ID = '109675814777716';  // Godzilla Consulting FB Page

async function fix() {
    console.log('\n🔧 Suscribiendo cuenta IG al webhook de Messenger Platform...\n');

    // Método 1: Suscribir el IG account business account
    const r1 = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: PAGE_TOKEN })
    }).then(r => r.json());
    console.log('IG subscribed_apps POST:', JSON.stringify(r1));

    // Método 2: Configurar el webhook via el Page con Instagram linked
    const r2 = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: PAGE_TOKEN,
            subscribed_fields: 'messages,messaging_postbacks,message_echoes,message_reads'
        })
    }).then(r => r.json());
    console.log('Page subscribed_apps POST (updated fields):', JSON.stringify(r2));

    // Verificar estado final
    const check = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps?access_token=${PAGE_TOKEN}`).then(r => r.json());
    console.log('\n✅ Estado final subscrición página:', JSON.stringify(check.data?.[0]?.subscribed_fields));
}

fix().catch(e => console.error(e.message));
