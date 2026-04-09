import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await ai.models.generateContent({
             model: 'gemini-1.5-flash-latest', 
             contents: 'hola'
        });
        console.log(result.text);
    } catch(e) { console.error(e.message); }
}
test();
