// Prueba si la sesion del IG private API puede leer DMs del Business account
const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const SESSION_PATH = path.join(__dirname, 'server', '.wwebjs_auth', 'ig_session.json');

async function test() {
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || 'godzilla_consulting');

    // Intentar cargar sesion guardada
    if (fs.existsSync(SESSION_PATH)) {
        console.log('📂 Sesión encontrada, cargando...');
        const session = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
        await ig.state.deserialize(session);
        console.log('✅ Sesión cargada');
    } else {
        console.log('❌ No hay sesión guardada. Ejecuta ig_setup.cjs primero.');
        return;
    }

    try {
        // Test 1: Info del usuario
        console.log('\n🔍 Verificando sesión...');
        const user = await ig.account.currentUser();
        console.log(`✅ Logueado como: @${user.username} (${user.full_name})`);
        console.log(`   Account type: ${user.is_business ? 'Business' : 'Personal'}`);

        // Test 2: Inbox de DMs
        console.log('\n📬 Probando inbox de DMs...');
        const inbox = await ig.feed.directInbox().items();
        console.log(`✅ Threads encontrados: ${inbox.length}`);
        if (inbox.length > 0) {
            inbox.slice(0, 3).forEach(thread => {
                const lastMsg = thread.items?.[0];
                const sender = thread.users?.[0]?.username;
                console.log(`  - @${sender}: "${lastMsg?.text || '(media)'}" [${thread.thread_type}]`);
            });
        } else {
            console.log('   (inbox vacío o Business account con Unified Inbox)');
        }

        // Test 3: Buscar DMs en pending/request inbox
        console.log('\n📥 Buscando pending/requests...');
        try {
            const pending = await ig.feed.directPending().items();
            console.log(`   Pending DMs: ${pending.length}`);
        } catch(e) {
            console.log('   Pending DMs: error -', e.message);
        }

    } catch(err) {
        if (err.name === 'IgNotFoundError' || err.message?.includes('login_required')) {
            console.log('❌ Sesión expirada — ejecuta node server/ig_setup.cjs nuevamente');
        } else if (err.message?.includes('challenge_required')) {
            console.log('❌ Instagram pide verificación — usa ig_setup.cjs');
        } else {
            console.log('❌ Error:', err.name, err.message);
        }
    }
}

test().catch(e => console.error('Fatal:', e.message));
