import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
console.log('API Key length:', apiKey ? apiKey.length : 0);
if (!apiKey) {
    console.error('No API Key found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
    try {
        console.log('Testing with gemini-1.5-flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('ping');
        console.log('Response content:', result.response.text());
        console.log('✅ Local API Test Successful');
    } catch (e) {
        console.error('❌ Local API Test Failed:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Details:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

test().catch(console.error);
