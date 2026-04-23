require('dotenv').config({path: './server/.env'});
const { GoogleGenAI } = require('@google/genai');

async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemPrompt = `Genera un JSON con un array 'plan' que contenga 30 objetos. Cada objeto debe tener 16 propiedades de texto largo (20 palabras cada una). Devuelve solo el JSON.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: {
                temperature: 0.85,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json'
            }
        });
        console.log('Success, response length:', response.candidates[0].content.parts[0].text.length);
        const data = JSON.parse(response.candidates[0].content.parts[0].text);
        console.log('Array length:', data.plan ? data.plan.length : 'no plan');
    } catch(e) {
        console.error('Error:', e.message);
    }
}
test();
