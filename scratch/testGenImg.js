import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() { 
    try { 
        const res = await ai.models.generateContent({ 
            model: 'gemini-3.1-flash-image-preview', 
            contents: 'a cute cat', 
            config: { 
                responseModalities: ['IMAGE']
            } 
        }); 
        
        console.dir(res, {depth: null}); 
    } catch(e) { 
        console.error(e) 
    } 
} 
test();
