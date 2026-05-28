import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function main() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error('❌ ELEVENLABS_API_KEY is not defined in server/.env');
        return;
    }

    try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': apiKey }
        });
        if (!response.ok) {
            console.error(`❌ ElevenLabs API error: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log('--- ELEVENLABS VOICES ---');
        data.voices.forEach(v => {
            console.log(`- ID: ${v.voice_id}`);
            console.log(`  Name: ${v.name}`);
            console.log(`  Preview: ${v.preview_url}`);
            console.log(`  Category: ${v.category}`);
        });
    } catch (err) {
        console.error('❌ Error fetching voices:', err);
    }
}

main();
