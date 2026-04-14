import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

async function testSDK() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Let's try gemini-3.1-flash-image-preview
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });

        console.log("Calling model generateContent...");
        const result = await model.generateContent("a cinematic photo of a cyberpunk city");
        
        console.log("Result received!");
        // The image is usually returned in candidates[0].content.parts[0].inlineData.data
        const candidates = result.response.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            if (parts && parts.length > 0 && parts[0].inlineData) {
                console.log("Inline Data Found! Data length:", parts[0].inlineData.data.length);
            } else {
                console.log("No inlineData found. Parts:", JSON.stringify(parts, null, 2));
            }
        }
    } catch (e) {
        console.error("SDK Error:", e);
    }
}
testSDK();
