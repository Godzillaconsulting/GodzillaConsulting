import fetch from 'node-fetch';

async function testVercelChat() {
    console.log('🌐 Probando Zilla en VIVO desde godzillaconsulting.ai...\n');
    
    try {
        const res = await fetch('https://godzillaconsulting.ai/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', text: 'Hola quiero agendar una cita' }]
            })
        });
        
        const text = await res.text();
        console.log('Status HTTP:', res.status);
        console.log('Respuesta raw:', text.substring(0, 500));
        
        if (res.ok) {
            try {
                const data = JSON.parse(text);
                if (data.reply) {
                    console.log('\n✅ Zilla respondió:\n');
                    console.log(data.reply);
                } else {
                    console.log('\n⚠️ Respuesta sin "reply":', data);
                }
            } catch(e) {
                console.log('\n⚠️ Respuesta no es JSON válido');
            }
        } else {
            console.error('\n❌ Error HTTP', res.status);
        }
    } catch (err) {
        console.error('\n❌ Error de conexión:', err.message);
    }
}

testVercelChat();
