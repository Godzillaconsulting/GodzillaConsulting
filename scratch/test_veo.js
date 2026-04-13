import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const testVeo = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: 'cinematic pan of a futuristic neon city',
        });
        console.log("SUCCESS:", res);
    } catch(err) {
        console.error("ERROR:", err);
    }
};
testVeo();
