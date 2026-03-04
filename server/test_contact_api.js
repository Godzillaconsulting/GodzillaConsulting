async function sendTestLead() {
    try {
        const res = await fetch('https://godzillaconsulting.ai/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: 'Test API Live',
                email: 'test_api_live@example.com',
                telefono: '5551234567',
                preferencia_sesion: 'video',
                fecha: '2026-03-04',
                hora: '15:00'
            })
        });
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            console.log("Response JSON:", data);
        } catch (e) {
            console.log("Response text:", text);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}
sendTestLead();
