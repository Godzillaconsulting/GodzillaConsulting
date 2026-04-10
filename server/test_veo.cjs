require('dotenv').config({path: '../../.env'});
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

async function main() {
    try {
        console.log("Key length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
        const r = await ai.models.generateContent({
            model:'veo-2.0-generate-001', 
            contents:'a car driving',
            config: {
                responseModalities: ["VIDEO"]
            }
        });
        console.log("Success:", !!r);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
main();
