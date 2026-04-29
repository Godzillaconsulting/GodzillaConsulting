import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import fetch from 'node-fetch';
import pool from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

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

    // Síntesis con Cascada IA (Groq -> Gemini -> Pollinations)
    console.log(`[${BOT_NAME}] 🧠 Analizando tendencias con Motor de Cascada IA...`);
    let summaryText = "";
    try {
        const systemPrompt = `Eres el Director de Estrategia de Datos de Godzilla Consulting. Tu misión es analizar el volumen de búsquedas reales de Google y extraer las tendencias crudas.
REGLAS:
1. Analiza los temas principales que la gente está buscando.
2. Extrae los hashtags o términos de búsqueda más usados y virales.
3. No uses emojis ni relleno. Entrega 3 bloques de puro análisis de datos duros y tendencias B2B/Tech.`;

        const userPrompt = `Búsquedas reales extraídas HOY:\n${uniqueQuestions.slice(0, 80).join(', ')}\n\nGenera los 3 bloques virales.`;
        
        const { executeAiWaterfall } = await import('./utils/aiWaterfall.js');
        
        const waterfallRes = await executeAiWaterfall([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
        
        summaryText = waterfallRes.content || "No se pudo generar la síntesis estructural.";
        console.log(`[${BOT_NAME}] ✅ Síntesis de Cascada IA completada exitosamente.`);
    } catch (e) {
        console.error(`[${BOT_NAME}] ❌ Fallo en la síntesis de IA:`, e.message);
        summaryText = "Fallo de Cascada IA al sintetizar las tendencias.";
    }

    // Inyectar en Base de Datos (Para Analytics y CEO Studio)
    const client = await pool.connect();
    try {
        // 1. Guardar data verdadera para Analytics
        await client.query(
            `INSERT INTO search_trends (keywords, aggregated_questions, summary) VALUES ($1, $2, $3)`,
            [JSON.stringify(KEYWORDS), JSON.stringify(structuredQuestions), summaryText]
        );

        // 2. Tareas en el CEO Studio (Reactivado con Generación Automática de Media)
        const taskTitle = `🔥 TENDENCIA VIRAL HOY: ${KEYWORDS[0]} / ${KEYWORDS[2]}`;
        const taskPrompt = `Crea un video dinámico estilo TikTok basado en estas tendencias virales reales encontradas hoy:\n\n${summaryText}`;
        
        // Generación de Media Automática (MP4 animado o stock)
        const safePrompt = summaryText.substring(0, 200).replace(/\n/g, ' ');
        const mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1080&height=1920&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
        
        const mediaPayload = JSON.stringify([{
            url: mediaUrl,
            provider: 'Auto Pollinations',
            isVideo: false // Se guarda como imagen inicialmente, en el panel pueden refinar/animar
        }]);

        await client.query(
            `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date, media_payload, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '2 hours', $8, $9)`,
            [taskTitle, taskPrompt, 'alex', JSON.stringify(['Tendencias Virales', 'Auto']), 'alta', 'pending_cm_approval', 'video', mediaPayload, 'trends_bot']
        );
        console.log(`[${BOT_NAME}] 💾 Datos inyectados y Media generada exitosamente.`);
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
