import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const aiSDK = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const translateNodePayload = async (payload, nodeId) => {
    if (!aiSDK) {
        console.warn('[TRANSLATION] GEMINI_API_KEY no configurada. Saltando traducción.');
        return null;
    }

    try {
        console.log(`[TRANSLATION] Traduciendo automáticamente los textos para ${nodeId}...`);
        const instruction = `You are a world-class professional copywriter and marketing director. 
Translate the provided Spanish JSON into High-Converting English.
Rules:
- Retain the exact same keys, array depth, and structure.
- Only translate string values that contain text.
- Do not translate URLs, numeric values, keys, or boolean values.
- Ensure the English sounds natural, persuasive, professional, and is oriented to high-ticket B2B consulting sales.
- Ensure 'features', 'guarantee', 'cardTitle', 'heroTitle' and 'planTarget' sound impactful.
- CRITICAL: Return purely the JSON.`;

        const response = await aiSDK.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [
                    { text: instruction },
                    { text: JSON.stringify(payload) }
                ]}
            ],
            config: {
                temperature: 0.2,
                responseMimeType: "application/json"
            }
        });

        const translatedText = response.text;
        const translatedObj = JSON.parse(translatedText);
        console.log(`[TRANSLATION] Traducción de ${nodeId} finalizada exitosamente.`);
        return translatedObj;
    } catch (error) {
        console.error(`[TRANSLATION] Error crítico traduciendo nodo ${nodeId}:`, error);
        return null;
    }
};
