// ai_models_v4.config.js — Plan Ultra Google (Mayo 2026)
// Todos los IDs son los más recientes disponibles via Gemini API con key Ultra

export const AI_MODELS = {

    // ══════════════════════════════════════════════
    //  IMÁGENES — Google Imagen + Gemini Image Gen
    // ══════════════════════════════════════════════
    // Imagen 4 Ultra: máxima calidad, fotorrealismo, sin filtros de seguridad duros
    'Imagen 4 Ultra': 'imagen-4.0-ultra-generate-001',
    // Imagen 4 Pro/Fast: misma arquitectura, generación rápida
    'Imagen 4 Pro': 'imagen-4.0-fast-generate-001',
    // Gemini 3.1 Flash con image output — multimodal, acepta imagen de referencia
    'Gemini 3.1 Flash Image': 'gemini-3.1-flash-image-preview',

    // ══════════════════════════════════════════════
    //  VIDEO — Google Veo 3.1
    // ══════════════════════════════════════════════
    // Veo 3.1: calidad cinematográfica, física realista
    'Veo 3': 'veo-3.1-generate-preview',
    // Veo 3.1 Fast
    'Veo 3 Fast': 'veo-3.1-fast-generate-preview',

    // ══════════════════════════════════════════════
    //  VIDEO E IMÁGENES — Higgsfield Cosmos
    // ══════════════════════════════════════════════
    'Higgsfield Cosmos': 'higgsfield-cosmos',

};

export const getModelId = (uiEngineName) => {
    return AI_MODELS[uiEngineName] || null;
};
