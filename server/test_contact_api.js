async function sendTestLead() {
    try {
        const res = await fetch('http://localhost:3000/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: 'Test API',
                email: 'test_api@example.com',
                telefono: '5551234567',
                preferencia_sesion: 'video',
                fecha: '2026-03-04',
                hora: '15:00'
            })
        });
        const data = await res.json();
        console.log("Response:", data);
    } catch (err) {
        console.error("Error:", err);
    }
}
sendTestLead();
