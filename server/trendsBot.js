import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import fetch from 'node-fetch';
import pool from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const BOT_NAME = 'Trends Bot (Nativo)';
console.log(`[${BOT_NAME}] 🚀 Inicializado exitosamente y desconectado de Antigravity.`);
console.log(`[${BOT_NAME}] 🕒 Sincronizando reloj interno...`);

const KEYWORDS = [
    "Marketing Digital",
    "Publicidad Creativa",
    "Tecnología",
    "Inteligencia Artificial",
    "Emprendimiento",
    "Redes Sociales",
    "Tendencias Virales"
];

// Preguntas comunes para emular AnswerThePublic y buscar lo viral
const MODIFIERS = [
    "qué es", "cómo hacer", "tendencias en", "lo más nuevo de", "viral en", "herramientas para"
];

const fetchGoogleAutocomplete = async (query) => {
    try {
        const url = `http://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&hl=es&gl=mx`;
        const res = await fetch(url);
        const data = await res.json();
        // data[1] contiene el array de sugerencias
        return data[1] || [];
    } catch (e) {
        console.error(`❌ Error consultando Google para "${query}":`, e.message);
        return [];
    }
};

export const runTrendsScraper = async () => {
    console.log(`[${BOT_NAME}] 🔍 Iniciando Scraping Masivo (AnswerThePublic Engine)...`);
    
    let allRawQuestions = [];
    let structuredQuestions = {};

    for (const keyword of KEYWORDS) {
        structuredQuestions[keyword] = [];
        for (const mod of MODIFIERS) {
            const query = `${mod} ${keyword}`;
            const suggestions = await fetchGoogleAutocomplete(query);
            // Filtramos las que realmente contengan la palabra clave para evitar basura
            const valid = suggestions.filter(s => s.toLowerCase().includes(keyword.toLowerCase().split(' ')[0]));
            structuredQuestions[keyword].push(...valid);
            allRawQuestions.push(...valid);
            // Delay para no saturar a Google
            await new Promise(r => setTimeout(r, 500));
        }
        // Deduplicar
        structuredQuestions[keyword] = [...new Set(structuredQuestions[keyword])];
    }

    const uniqueQuestions = [...new Set(allRawQuestions)];
    console.log(`[${BOT_NAME}] ✅ Se obtuvieron ${uniqueQuestions.length} preguntas crudas reales.`);

    if (uniqueQuestions.length === 0) return;

    // Síntesis con Cascada IA (2-STEP BLOCK)
    console.log(`[${BOT_NAME}] 🧠 Analizando tendencias con Motor de Cascada IA (Bloque 2-Pasos)...`);
    let generatedScenes = null;
    let summaryText = "";
    
    try {
        const { executeAiWaterfall } = await import('./utils/aiWaterfall.js');
        
        // FASE 1: IA Gratuita extrae los temas clave
        console.log(`[${BOT_NAME}] 🔍 Fase 1: IA Gratuita resumiendo búsquedas...`);
        let baseContext = "";
        try {
            const rawRes = await executeAiWaterfall([
                { role: 'user', content: `Resume estas búsquedas en las 3 tendencias más interesantes para un video: ${uniqueQuestions.slice(0, 50).join(', ')}` }
            ], { mode: 'compression' });
            baseContext = rawRes.content || '';
        } catch(e) {
            console.warn(`[${BOT_NAME}] ⚠️ Fallo Fase 1, usando datos crudos.`);
            baseContext = uniqueQuestions.slice(0, 30).join(', ');
        }

        // FASE 2: Gemini Premium genera el JSON perfecto
        console.log(`[${BOT_NAME}] 🧠 Fase 2: Gemini Premium redactando Guion JSON...`);
        const systemPrompt = `Eres el Director Creativo de Godzilla Consulting. Tu misión es crear un guion de 5 escenas para TikTok basado en estas tendencias: ${baseContext}
REGLAS:
1. Crea un guion sobre la tendencia más interesante.
2. MEMORIA TEMPORAL Y ACTUALIDAD: Hoy es mayo de 2026. El gran acontecimiento del momento es la Copa Mundial de la FIFA 2026 que comenzará el próximo mes en México, Estados Unidos y Canadá. Usa esta actualidad si es relevante para enriquecer el contexto del video.
3. PROHIBICIÓN DE SITIO WEB EN CTA: En la escena 5 (CTA), NUNCA menciones nombres de páginas web, URLs o dominios (ej. "visita Godzilla Consulting punto IA", ".ia", etc.). Usa llamados a la acción interactivos o sociales en su lugar.
4. Responde ÚNICAMENTE con un JSON válido con este formato:
{
  "title": "título corto del video",
  "scenes": [
    { "visual": "hyper-detailed english prompt for image generation, cinematic lighting, ultra realistic", "narration": "texto corto en español para la voz en off" }
  ]
} (Exactamente 5 escenas, la 5 es CTA)`;

        const waterfallRes = await executeAiWaterfall([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: "Genera el JSON de 5 escenas ahora." }
        ], { jsonMode: true, mode: 'premium' });
        
        const jsonMatch = waterfallRes.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            generatedScenes = parsed.scenes;
            summaryText = parsed.title;
        } else {
            throw new Error("El modelo no devolvió un JSON válido.");
        }
        console.log(`[${BOT_NAME}] ✅ Guion Premium generado exitosamente.`);
    } catch (e) {
        console.error(`[${BOT_NAME}] ❌ Fallo en la síntesis de IA:`, e.message);
        return; // Detener si falla la IA
    }

    // Preparar payload para el MediaWorker
    const scenesPayload = {};
    generatedScenes.forEach((scene, i) => {
        const n = i + 1;
        const isLast = n === generatedScenes.length;
        const narKey = isLast ? `NARRACION ESCENA ${n} (CTA)` : `NARRACION ESCENA ${n}`;
        scenesPayload[`VISUAL ESCENA ${n} (Prompt Imagen Detallado)`] = scene.visual || '';
        scenesPayload[narKey] = scene.narration || '';
    });
    
    const VOICES = [
        'edge:es-MX-JorgeNeural',
        'fakeyou:adal-ramones',
        'fakeyou:alucard-latino',
        'fakeyou:ballas-gta',
        'piper:es_MX-ald-medium',
        'bark:v2/es_speaker_0'
    ];
    const selectedVoice = VOICES[Math.floor(Math.random() * VOICES.length)];
    const mediaPayload = JSON.stringify({ scenes: scenesPayload, voice: selectedVoice });

    // Inyectar en Base de Datos
    const client = await pool.connect();
    try {
        // 1. Tareas en el CEO Studio (Asignadas a 'auto' para el MediaWorker)
        const taskTitle = `🔥 AUTO-VIDEO: ${summaryText}`;
        
        // Formatear el prompt para que el CEO lo pueda leer en la interfaz (Guion Aprobado)
        let readableScript = `🎥 GUION DEL VIDEO:\n\n`;
        generatedScenes.forEach((s, i) => {
            readableScript += `Escena ${i+1}:\n🎤 Voz: ${s.narration}\n👁️ Visual: ${s.visual}\n\n`;
        });
        const taskPrompt = readableScript.trim();
        
        await client.query(
            `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date, media_payload, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '2 hours', $8, $9)`,
            [taskTitle, taskPrompt, 'test', JSON.stringify(['Tendencias Virales', 'AutoVideo']), 'alta', 'pending_render', 'video', mediaPayload, 'trends_bot']
        );
        console.log(`[${BOT_NAME}] 🎬 Tarea inyectada en DB. El MediaWorker la comenzará a procesar pronto.`);

        // 2. Inyectar datos crudos en la tabla search_trends para el Radar B2B (AnswerThePublic Engine)
        await client.query(
            `INSERT INTO search_trends (keywords, aggregated_questions, summary, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [JSON.stringify(KEYWORDS), JSON.stringify(structuredQuestions), summaryText]
        );
        console.log(`[${BOT_NAME}] 🌐 Datos guardados en search_trends para el Dashboard Analítico.`);


    } catch (err) {
        console.error(`[${BOT_NAME}] ❌ Error guardando en BD:`, err.message);
    } finally {
        client.release();
    }
};

// Mantener el proceso vivo y mostrar latido
setInterval(() => {
    // Latido silencioso para mantener PM2 activo
}, 60000);

// Ejecutar todos los días a las 8:00 AM (Cd. Juarez)
cron.schedule('0 8 * * *', async () => {
    await runTrendsScraper();
}, {
    scheduled: true,
    timezone: "America/Ciudad_Juarez"
});
console.log(`[${BOT_NAME}] ⏰ Cron configurado a las 8:00 AM diarios.`);

// Descomentar para probar inmediatamente al arrancar:
// setTimeout(runTrendsScraper, 3000);

// Manejo de señales de PM2
process.on('SIGINT',  () => { console.log(`🛑 [${BOT_NAME}] Detenido por SIGINT`);  process.exit(0); });
process.on('SIGTERM', () => { console.log(`🛑 [${BOT_NAME}] Detenido por SIGTERM`); process.exit(0); });
