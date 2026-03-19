import { GoogleGenerativeAI } from "@google/generative-ai";

// En Vercel serverless cada invocacion es independiente.
// Creamos el modelo fresco por request para evitar estado
// corrupto entre llamadas (especialmente tool declarations).
export const getGeminiModel = (apiKey, systemInstruction, chatTools) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: chatTools }]
    });
    return { model, sessions: new Map() };
};
