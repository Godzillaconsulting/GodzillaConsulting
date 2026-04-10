import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
    try {
        console.log("Fetching models...");
        let r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        let data = await r.json();
        
        const txtModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        console.log("Text generation models available:");
        txtModels.map(m => m.name).forEach(m => console.log(m));
    } catch (e) {
        console.error(e);
    }
}
listModels();
