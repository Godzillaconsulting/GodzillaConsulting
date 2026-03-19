import fetch from 'node-fetch';

async function waitAndCheck() {
    console.log('⏳ Esperando que Vercel depliegue... (90 segundos)\n');
    await new Promise(r => setTimeout(r, 90000));
    
    console.log('🔍 Verificando variables en Vercel...\n');
    try {
        const r = await fetch('https://godzillaconsulting.ai/api/env-check');
        const d = await r.json();
        console.log('Vercel:', d.vercel ? '✅ Sí (serverless)' : '⚠️ No (local)');
        console.log('NODE_ENV:', d.node_env);
        console.log('\nVariables:');
        for (const [k, v] of Object.entries(d.env)) {
            console.log(`  ${k}: ${v}`);
        }
    } catch(e) {
        console.error('❌ Error:', e.message);
    }
}

waitAndCheck();
