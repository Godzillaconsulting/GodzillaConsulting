// ai_models_v4.config.js
export const AI_MODELS = {
    // ---- Modelos de Imagen ----
    'Imagen 4 Ultra': 'imagen-4.0-ultra-generate-001',
    'Imagen 4 Pro': 'imagen-4.0-generate-001',
    'GotSora T2I': 'gotsora-t2i-local',
    'Gemini 3.1 Flash Image': 'gemini-3.1-flash-image-preview',
    
    // ---- Modelos de Video ----
    'Veo 3': 'veo-3.0-generate-001',
    'Veo 3 Fast': 'veo-3.0-fast-generate-001',
    'Higgsfield Cosmos': 'higgsfield-cosmos',
    'GotSora Video': 'gotsora-v2t-local'
};

export const getModelId = (uiEngineName) => {
    return AI_MODELS[uiEngineName] || null;
};
