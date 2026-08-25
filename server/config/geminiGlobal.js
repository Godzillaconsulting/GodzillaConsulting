import { GoogleGenerativeAI } from "@google/generative-ai";

// En Vercel serverless cada invocacion es independiente.
// Creamos el modelo fresco por request para evitar estado
// corrupto entre llamadas (especialmente tool declarations).
export const getGeminiModel = (apiKey, systemInstruction, chatTools) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const config = {
        model: "gemini-3.6-flash",
        systemInstruction: systemInstruction
    };
    if (chatTools && chatTools.length > 0) {
        config.tools = [{ functionDeclarations: chatTools }];
    }
    const model = genAI.getGenerativeModel(config);
    return { model, sessions: new Map() };
};
