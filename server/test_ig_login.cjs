// test_ig_login.cjs — Prueba rápida de login con instagram-private-api
// Ejecutar: node server/test_ig_login.cjs

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { IgApiClient } = require('instagram-private-api');

const USERNAME = process.env.IG_USERNAME;
const PASSWORD = process.env.IG_PASSWORD;

console.log('\n🦖 Test Login Instagram');
console.log('Usuario:', USERNAME);
console.log('Pass length:', PASSWORD?.length, 'chars');

async function run() {
    const ig = new IgApiClient();
    ig.state.generateDevice(USERNAME);

    try {
        console.log('\n🔐 Intentando login...');
        const result = await ig.account.login(USERNAME, PASSWORD);
        console.log('\n✅ LOGIN OK:', result.username, '| PK:', result.pk);
        console.log('✅ instagram-private-api funciona en este Node.js');
    } catch(err) {
        console.error('\n❌ Error tipo:', err.name || err.constructor?.name);
        console.error('   Mensaje:', err.message);
        console.error('   Response:', err.response?.statusCode, err.response?.body?.message);
        
        if (err.name === 'IgCheckpointError' || err.response?.statusCode === 400) {
            console.log('\n📱 CHECKPOINT REQUERIDO — Esta es la situación normal para nuevo dispositivo.');
            console.log('   Pasos:');
            console.log('   1. Abre la app Instagram en tu celular');
            console.log('   2. Busca la notificación "alguien intentó iniciar sesión" → APROBAR');
            console.log('   3. O ve a https://www.instagram.com y aprueba el nuevo acceso');
            console.log('   4. Vuelve a ejecutar este script');
        }
    }
}

run();
