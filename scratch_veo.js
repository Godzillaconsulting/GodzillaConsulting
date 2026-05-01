import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function testVeo() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log("Iniciando Veo...");
        // Veo model usually called veo-2.0-generate-001 or similar
        const response = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: 'A beautiful sunset over the ocean, highly cinematic, 4k',
        });
        
        console.log(response);
    } catch (e) {
        console.error("Error calling Veo:", e.message);
    }
}
testVeo();
