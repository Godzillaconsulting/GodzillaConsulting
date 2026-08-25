import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});
import { GoogleGenAI } from '@google/genai';

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.list();
        for await (const model of response) {
            if (model.name.includes('imagen')) {
                console.log(model.name);
            }
        }
        console.log("Done");
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
