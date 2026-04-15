import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
        console.log("Testing Imagen 3...");
         const imgRes = await ai.models.generateImages({
             model: 'imagen-3.0-generate-001',
             prompt: 'A red apple on a desk',
             config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
         });
         console.log("Imagen 3 Success!");
    } catch(e) { console.error("Imagen 3 Error:", e.message); }

    try {
        console.log("Testing Gemini Image (Flash)...");
         const gemRes = await ai.models.generateContent({
             model: 'gemini-2.0-flash-exp', // Let's try regular flash or exp
             contents: [{ role: 'user', parts: [{ text: 'Generate an image of a blue sky' }] }],
             config: { responseModalities: ['IMAGE'] }
         });
         console.log("Gemini Flash Success!");
    } catch(e) { console.error("Gemini Flash Error:", e.message); }
}

test();
