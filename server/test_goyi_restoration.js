

async function testGoyi() {
    const url = 'http://localhost:3000/api/chat';
    
    console.log('--- Testing Packages ---');
    let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [{ role: 'user', content: '¿Cuáles son los paquetes que ofreces?' }]
        })
    });
    let data = await res.json();
    console.log('Goyi Response:', JSON.stringify(data, null, 2));

    console.log('\n--- Testing Downloads ---');
    res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [
                { role: 'user', content: '¿Qué recursos puedo descargar?' }
            ]
        })
    });
    data = await res.json();
    console.log('Goyi Response:', JSON.stringify(data, null, 2));

    console.log('\n--- Testing 7-Field Appointment ---');
    res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [
                { role: 'user', content: 'Quiero agendar una cita. Mi nombre es Juan Pérez, mi correo es juan@example.com, mi cel es 1234567890. Me interesa el plan Élite para el lunes 10 de marzo a las 11:00 am. El motivo es que mi ROAS está bajando y necesito auditoría urgente.' }
            ]
        })
    });
    data = await res.json();
    console.log('Goyi Response:', JSON.stringify(data, null, 2));
}

testGoyi().catch(console.error);
