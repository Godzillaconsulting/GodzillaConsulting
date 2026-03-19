import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function diagMessengerPermissions() {
    const token = process.env.PAGE_ACCESS_TOKEN;
    const PAGE_ID = '109675814777716'; // ID detectado en diagnóstico anterior

    console.log('🔍 DIAGNÓSTICO DE PERMISOS MESSENGER\n');
    console.log('='.repeat(55));

    // 1. Verificar permisos del token
    console.log('\n1️⃣  PERMISOS DEL PAGE ACCESS TOKEN:');
    try {
        const r = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`);
        const d = await r.json();
        if (d.error) {
            console.error('   ❌', d.error.message);
        } else {
            const granted = d.data.filter(p => p.status === 'granted').map(p => p.permission);
            const denied  = d.data.filter(p => p.status === 'declined').map(p => p.permission);
            console.log('   ✅ Permisos OTORGADOS:', granted.join(', '));
            if (denied.length) console.log('   ❌ Permisos NEGADOS:', denied.join(', '));
            
            const hasMessaging = granted.includes('pages_messaging');
            console.log('\n   pages_messaging:', hasMessaging ? '✅ PRESENTE' : '❌ FALTA — esto es la causa del error');
        }
    } catch(e) {
        console.error('   ❌ Error:', e.message);
    }

    // 2. Verificar modo de la App (development vs live)
    console.log('\n2️⃣  MODO DE LA APP EN META:');
    try {
        const r = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}?fields=name,tasks&access_token=${token}`);
        const d = await r.json();
        if (d.error) {
            console.error('   ❌', d.error.message);
        } else {
            console.log('   Página:', d.name);
            console.log('   Tasks del token:', d.tasks || '(no disponible)');
        }
    } catch(e) {
        console.error('   ❌ Error:', e.message);
    }

    // 3. Verificar subscripciones del webhook en la página
    console.log('\n3️⃣  SUBSCRIPCIONES WEBHOOK DE LA PÁGINA:');
    try {
        const r = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps?access_token=${token}`);
        const d = await r.json();
        if (d.error) {
            console.error('   ❌', d.error.message);
        } else if (!d.data || d.data.length === 0) {
            console.log('   ⚠️  NINGUNA APP suscrita al webhook de esta página');
            console.log('   → Necesitas suscribir tu app en Meta Developers');
        } else {
            d.data.forEach(app => {
                console.log(`   App: ${app.name || app.id}`);
                console.log(`   Campos suscritos: ${app.subscribed_fields?.join(', ') || 'ninguno'}`);
                const hasMessages = app.subscribed_fields?.includes('messages');
                console.log(`   Campo "messages": ${hasMessages ? '✅' : '❌ FALTA'}`);
            });
        }
    } catch(e) {
        console.error('   ❌ Error:', e.message);
    }

    console.log('\n' + '='.repeat(55));
}

diagMessengerPermissions();
