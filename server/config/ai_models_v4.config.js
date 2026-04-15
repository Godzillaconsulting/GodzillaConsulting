// ai_models_v4.config.js — Plan Ultra Google (Mayo 2026)
// Todos los IDs son los más recientes disponibles via Gemini API con key Ultra

export const AI_MODELS = {

    // ══════════════════════════════════════════════
    //  IMÁGENES — Google Imagen + Gemini Image Gen
    // ══════════════════════════════════════════════
    // Imagen 3 Ultra: máxima calidad, fotorrealismo, sin filtros de seguridad duros
    'Imagen 4 Ultra': 'imagen-3.0-generate-001',
    // Imagen 3 Fast: misma arquitectura, generación 3x más rápida
    'Imagen 4 Pro': 'imagen-3.0-fast-generate-001',
    // Gemini 2.0 Flash con image output — multimodal, acepta imagen de referencia
    'Gemini 3.1 Flash Image': 'gemini-2.0-flash-preview-image-generation',

    // ══════════════════════════════════════════════
    //  VIDEO — Google Veo 2
    // ══════════════════════════════════════════════
    // Veo 2: calidad cinematográfica 1080p, física realista, 5-8 segundos
    'Veo 3': 'veo-2.0-generate-001',
    // Veo 2 también en ruta fast (mismo modelo, la diferencia la pone la config)
    'Veo 3 Fast': 'veo-2.0-generate-001',

    // ══════════════════════════════════════════════
    //  VIDEO — Higgsfield Cosmos
    // ══════════════════════════════════════════════
    'Higgsfield Cosmos': 'higgsfield-cosmos',

};

export const getModelId = (uiEngineName) => {
    return AI_MODELS[uiEngineName] || null;
};
