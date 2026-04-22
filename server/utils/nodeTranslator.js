import pool from '../config/db.js';

export const ensureNodesTranslation = async (rows, targetLng) => {
    // Si el lenguaje base es espanol o no se requiere traduccion compleja, retornar
    if (!targetLng || targetLng === 'es') return rows;
    
    // Importar dinamicamente SDK Gemini para evitar peso si no se ocupa
    const { GoogleGenAI } = await import('@google/genai');
    const aiSDK = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
    
    if (!aiSDK) {
        console.warn('[NODES JIT] Gemini no configurado. Fallback natural a Español.');
        return rows;
    }

    let modified = false;

    // Procesamos en paralelo limitado o secuencial para nodos de marketing
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.id === 'paquetes' || row.id.startsWith('paquete-')) {
            const pubData = row.published_data || {};
            const translations = pubData.translations || {};

            // Si no existe la traduccion para targetLng, JIT translate
            if (!translations[targetLng]) {
                console.log(`[NODES JIT] Auto-traduciendo nodo ${row.id} al idioma: ${targetLng}`);
                
                // Creamos una copia limpia para traducir (basada en el contenido original español)
                const payloadToTranslate = { ...pubData };
                delete payloadToTranslate.translations;

                const instruction = `You are a world-class professional copywriter and marketing director. 
Translate the provided Spanish JSON into High-Converting ${targetLng.toUpperCase()} language.
Rules:
- Retain the exact same keys, array depth, and structure.
- Only translate string values that contain text.
- Do not translate URLs, numeric values, keys, or boolean values.
- Ensure the ${targetLng} text sounds natural, persuasive, professional, and is oriented to high-ticket B2B consulting sales.
- Ensure 'features', 'guarantee', 'cardTitle', 'heroTitle' and 'planTarget' sound impactful.
- CRITICAL: Return purely the JSON.`;

                try {
                    const response = await aiSDK.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [
                            { role: 'user', parts: [{ text: instruction }, { text: JSON.stringify(payloadToTranslate) }] }
                        ],
                        config: { temperature: 0.1, responseMimeType: "application/json" }
                    });

                    let translatedObj = null;
                    if (response.text) {
                        try {
                            const cleanJson = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
                            translatedObj = JSON.parse(cleanJson);
                        } catch (parseError) {
                            console.error(`[NODES JIT] Error parseando JSON de Gemini para ${row.id}:`, parseError.message);
                        }
                    }

                    if (translatedObj) {
                        pubData.translations = { ...pubData.translations, [targetLng]: translatedObj };
                        modified = true;
                        await pool.query(`UPDATE site_nodes SET published_data = $1 WHERE id = $2`, [pubData, row.id]);
                        console.log(`[NODES JIT] Nodo ${row.id} traducido al ${targetLng} guardado correctamente.`);
                    } else {
                        // FALLBACK SAFETY LOCK: Prevent infinite loops if Gemini fails to return valid JSON
                        pubData.translations = { ...pubData.translations, [targetLng]: { ...payloadToTranslate, _jitFailed: true } };
                        await pool.query(`UPDATE site_nodes SET published_data = $1 WHERE id = $2`, [pubData, row.id]);
                        console.warn(`[NODES JIT] Salvavidas activado para ${row.id}: Se guardó el idioma original para evitar loops de facturación.`);
                    }
                } catch (e) {
                    console.error(`[NODES JIT] Fallo al traducir ${row.id} a ${targetLng}:`, e);
                    // FALLBACK SAFETY LOCK on Network Error
                    pubData.translations = { ...pubData.translations, [targetLng]: { ...payloadToTranslate, _jitFailed: true } };
                    await pool.query(`UPDATE site_nodes SET published_data = $1 WHERE id = $2`, [pubData, row.id]).catch(()=>{});
                }
            }
        }
    }

    return rows;
};
