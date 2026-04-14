import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

async function list() {
    const key = process.env.GEMINI_API_KEY;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if(data.models) {
        console.log("All Imagen Models:", data.models.filter(m => m.name.includes('imagen') || m.name.includes('image')).map(m => m.name));
    } else {
        console.log(data);
    }
}
list();
