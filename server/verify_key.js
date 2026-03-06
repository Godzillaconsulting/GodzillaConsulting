import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY.trim();
console.log('Using Key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("Test connection");
        console.log('Response:', result.response.text());
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
