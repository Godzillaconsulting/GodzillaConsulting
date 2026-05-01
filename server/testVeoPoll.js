import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: 'A futuristic city'
    });
    console.log('Started operation:', operation.name);
    let op = await ai.operations.get({operation: operation});
    console.log(JSON.stringify(op, null, 2));
}
run().catch(console.error);
