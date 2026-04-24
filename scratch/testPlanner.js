import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ username: 'jareg', role: 'admin' }, 'Godzilla_Secret_Key_2026_!@#');

async function test() {
    console.log("Generando request con JWT:", token.substring(0,20) + "...");
    try {
        const res = await fetch('http://localhost:5000/api/studio/generate-monthly-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                niche: 'videojuegos',
                month: 'Mayo',
                year: 2026,
                testMode: true
            })
        });
        const data = await res.json();
        console.log("Response:", data);

        if (data.taskId) {
            console.log("Polling status for taskId:", data.taskId);
            let done = false;
            while (!done) {
                await new Promise(r => setTimeout(r, 2000));
                const statRes = await fetch(`http://localhost:5000/api/studio/plan-status/${data.taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const statData = await statRes.json();
                console.log("Status:", statData);
                if (statData.status === 'completed' || statData.status === 'error') {
                    done = true;
                }
            }
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
test();
