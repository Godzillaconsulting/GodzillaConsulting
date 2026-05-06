import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({path: path.join(__dirname, '../../.env')});

import pool from '../config/db.js';
import { executeAiWaterfall } from '../utils/aiWaterfall.js';

async function run() {
    console.log("Generando guion del Mundial 2026...");
    const prompt = `Escribe un guion dinámico para TikTok/Shorts sobre una anécdota o misterio del Mundial.
    REGLAS IMPORTANTES:
    1. Escribe UN SOLO PÁRRAFO fluido y emocionante de 60-80 palabras como si contaras un chisme sin parar.
    2. Usa comas y puntos frecuentemente para el ritmo.
    3. NUNCA describas escenas. Cuenta la historia directamente al espectador.
    4. DIVIDE ESE PÁRRAFO EXACTAMENTE EN 8 PARTES CONTINUAS para las 8 escenas.
    5. Si juntas todas las partes de "narrationText", DEBE leerse como el párrafo original sin interrupciones raras.
    6. MUY IMPORTANTE: El "visualPrompt" DEBE ser súper genérico y en INGLÉS (ej. "soccer stadium", "fans cheering", "sad man", "golden trophy"). NUNCA uses nombres propios, equipos o jugadores (NO pongas Messi, NO pongas Argentina) porque el banco de videos no tiene nombres reales.
    7. Haz 8 escenas en total.
    8. El formato DEBE ser un JSON con esta estructura exacta:
    {
       "script": "Texto completo",
       "scenes": [
           { 
              "narration": "Texto del narrador (aprox 15 palabras). Ej: '¡El Mundial 2026 será el más grande de la historia!'", 
              "visual": "1 o 2 palabras CLAVE en INGLÉS para buscar en bancos de video (ej. 'soccer stadium', 'football fans', 'messi', 'trophy')" 
           }
       ]
    }`;

    const aiRes = await executeAiWaterfall([{ role: 'user', content: prompt }], { mode: 'premium', maxTokens: 2048 });
    let text = aiRes.content || '';
    
    // Remove markdown formatting if present
    const startObj = text.indexOf('{');
    const endObj = text.lastIndexOf('}');
    if (startObj !== -1 && endObj !== -1) {
        text = text.substring(startObj, endObj + 1);
    }
    
    const parsed = JSON.parse(text);
    console.log("Guion generado, total escenas:", parsed.scenes.length);

    const taskQuery = `
        INSERT INTO studio_tasks 
        (title, content_type, prompt, status, media_payload) 
        VALUES ($1, $2, $3, 'pending_local_test', $4)
        RETURNING id
    `;
    
    const mediaPayload = {
        script: parsed.script,
        scenes: parsed.scenes,
        voice: "es-MX-GerardoNeural"
    };

    const res = await pool.query(taskQuery, [
        "Mundial 2026",
        "video",
        parsed.script,
        JSON.stringify(mediaPayload)
    ]);

    console.log("✅ Tarea insertada con ID:", res.rows[0].id);
    console.log("⏳ El mediaWorker.js (dentro de index.js) la recogerá en menos de 30 segundos.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
