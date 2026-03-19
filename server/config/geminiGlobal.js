import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiState = {
    genAIInstance: null,
    generativeModel: null,
    userSessions: new Map()
};

export const getGeminiModel = (apiKey, systemInstruction, chatTools) => {
    if (!geminiState.genAIInstance || !geminiState.generativeModel) {
        geminiState.genAIInstance = new GoogleGenerativeAI(apiKey);
        geminiState.generativeModel = geminiState.genAIInstance.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: chatTools }]
        });
        console.log("[Gemini] Se ha inicializado un único Puntero de Memoria para el Modelo IA.");
    }
    return {
        model: geminiState.generativeModel,
        sessions: geminiState.userSessions
    };
};
