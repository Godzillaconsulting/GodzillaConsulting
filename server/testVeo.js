import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
    const res = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: 'A futuristic city'
    });
    console.log("Success", res);
} catch (e) {
    console.error("Error generating video:", e);
}
