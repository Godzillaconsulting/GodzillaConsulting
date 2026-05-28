import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server/.env') });

async function listVoices() {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
        console.error("No ELEVENLABS_API_KEY found, process.env.ELEVENLABS_API_KEY is undefined");
        return;
    }
    console.log("Fetching voices from ElevenLabs with key:", key.substring(0, 10) + "...");
    try {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: { "xi-api-key": key }
        });
        if (!res.ok) {
            console.error("Error from ElevenLabs API:", res.status, await res.text());
            return;
        }
        const data = await res.json();
        console.log("Available Voices:");
        for (const voice of data.voices) {
            console.log(`ID: ${voice.voice_id} | Name: ${voice.name} | Category: ${voice.category} | Gender: ${voice.labels?.gender || voice.labels?.accent || 'unknown'} | Language: ${voice.labels?.language || 'unknown'}`);
        }
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}
listVoices();
