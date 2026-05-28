import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({path: path.join(__dirname, '../../.env')});

import pool from '../config/db.js';
import { executeAiWaterfall } from '../utils/aiWaterfall.js';

async function run() {
    console.log("Generando guion sobre la Selección Mexicana en el Mundial...");
    const prompt = `Escribe un guion dinámico y emocionante para TikTok/Shorts sobre la Selección Mexicana en los Mundiales (por ejemplo, el histórico triunfo contra Alemania en 2018, la pasión de la afición o la expectativa para 2026).
    
    REGLAS DE FORMATO:
    1. Genera exactamente 5 escenas.
    2. Mantén las narraciones cortas (10-15 palabras por escena) para que el video sea rápido y dinámico.
    3. El "visual" debe ser súper genérico y en INGLÉS (ej. "soccer fans cheering", "soccer match stadium", "soccer player running"). NUNCA uses nombres propios.
    4. Devuelve únicamente el JSON con esta estructura exacta, sin texto adicional:
    {
       "script": "Texto completo que une todas las narraciones",
       "scenes": [
           { 
              "narration": "Texto de la escena 1", 
              "visual": "Concepto visual en inglés" 
           },
           { 
              "narration": "Texto de la escena 2", 
              "visual": "Concepto visual en inglés" 
           },
           { 
              "narration": "Texto de la escena 3", 
              "visual": "Concepto visual en inglés" 
           },
           { 
              "narration": "Texto de la escena 4", 
              "visual": "Concepto visual en inglés" 
           },
           { 
              "narration": "Texto de la escena 5", 
              "visual": "Concepto visual en inglés" 
           }
       ]
    }`;

    let parsed = null;
    let attempts = 0;
    
    while (!parsed && attempts < 3) {
        try {
            attempts++;
            console.log(`Intento ${attempts} de llamada a IA...`);
            const aiRes = await executeAiWaterfall([{ role: 'user', content: prompt }], { mode: 'premium', maxTokens: 2048 });
            let text = aiRes.content || '';
            
            const startObj = text.indexOf('{');
            const endObj = text.lastIndexOf('}');
            if (startObj !== -1 && endObj !== -1) {
                text = text.substring(startObj, endObj + 1);
            }
            
            parsed = JSON.parse(text);
        } catch (err) {
            console.error(`Error en intento ${attempts}:`, err.message);
        }
    }

    if (!parsed) {
        console.error("❌ Todos los intentos fallaron al generar un JSON válido.");
        process.exit(1);
    }

    console.log("✅ Guion generado con éxito!");
    console.log("Guion:", parsed.script);
    console.log(JSON.stringify(parsed.scenes, null, 2));

    const taskQuery = `
        INSERT INTO studio_tasks 
        (title, content_type, prompt, status, media_payload) 
        VALUES ($1, $2, $3, 'pending_render', $4)
        RETURNING id
    `;
    
    const mediaPayload = {
        script: parsed.script,
        scenes: parsed.scenes,
        voice: "elevenlabs:pNInz6obbfIdGwnf8p5A" // Voz premium ElevenLabs
    };

    const res = await pool.query(taskQuery, [
        "Selección Mexicana Mundial",
        "video",
        parsed.script,
        JSON.stringify(mediaPayload)
    ]);

    console.log("✅ Tarea de Selección Mexicana insertada con ID:", res.rows[0].id);
    console.log("⏳ El mediaWorker.js la recogerá para renderizarla.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
