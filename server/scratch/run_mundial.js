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
    const prompt = `Eres un experto estratega de contenido viral en México.
    Tema: "Mundial 2026 de la FIFA".
    Genera un guion para un video viral educativo/informativo con EXACTAMENTE 8 a 12 escenas hiper-cortas (3 a 4 segundos de retención).
    Devuelve EXACTAMENTE este JSON sin markdown extra:
    {
       "script": "Texto completo del narrador (emocionante, ritmo rápido, no vendas nada, solo info brutal sobre el mundial)",
       "scenes": [
           { "narrator": "texto escena 1", "visual": "descripción visual para el scraper (ej. fifa world cup 2026 stadium, messi, mbappe, soccer ball)" }
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
        VALUES ($1, $2, $3, 'pending_render', $4)
        RETURNING id
    `;
    
    const mediaPayload = {
        ai_script: parsed.script,
        ai_scenes: parsed.scenes,
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
