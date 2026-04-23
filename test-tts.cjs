require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function run() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Habla como un locutor de radio y dime: Hola, esta es una prueba de voz de Gemini para Godzilla Consulting.',
            config: {
                responseModalities: ["AUDIO"]
            }
        });
        
        console.log(response);
        if (response.candidates && response.candidates[0].content.parts) {
            const part = response.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType.includes('audio'));
            if (part) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync('test_tts_gemini.wav', buffer);
                console.log('Audio saved to test_tts_gemini.wav');
            } else {
                console.log('No audio part found.');
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}
run();
