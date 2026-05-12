import pool from '../config/db.js';
import { enqueueNewsletter } from './emailQueue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ARCHIVOS_PESADOS_DIR } from '../routes/media.js';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = ARCHIVOS_PESADOS_DIR;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const cleanJsonStr = (text) => {
    if (!text) return "{}";
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return "{}";
    let t = text.substring(start, end + 1);
    // Sanitizar saltos de línea literales dentro de los valores string generados por la IA
    t = t.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '') + '"';
    });
    return t;
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

import { executeAiWaterfall } from '../utils/aiWaterfall.js';

const generateWithRetry = async (modelName, options, maxRetries = 3) => {
    // Capa 1 y Capa 2: Primero el modelo solicitado, luego el fallback ultra-barato de 8b.
    const modelsToTry = [modelName, 'gemini-2.5-flash-8b'];
    
    for (const currentModel of modelsToTry) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                await sleep(2000 + Math.random() * 2000); // Base jitter
                return await ai.models.generateContent({
                    model: currentModel,
                    ...options
                });
            } catch (e) {
                attempt++;
                console.error(`⚠️ Error Gemini (${currentModel}) Intento ${attempt}:`, e.message);
                if (e.message.includes('503') || e.message.includes('429') || e.message.includes('fetch failed')) {
                    if (attempt >= maxRetries) {
                        console.log(`❌ ${currentModel} agotó sus intentos por saturación.`);
                        break; // Sale del while y pasa al siguiente modelo del for
                    }
                    const waitTime = 5000 * attempt;
                    console.log(`⏳ [JITTER] Esperando ${waitTime}ms antes del próximo intento con ${currentModel}...`);
                    await sleep(waitTime);
                } else {
                    if (attempt >= maxRetries) break;
                }
            }
        }
    }
    
    // Capa 3: Emergencia total fuera de Google
    console.log(`🚨 Toda la red de Google falló. Activando FALLBACK (Groq / SambaNova / Llama 3.3)...`);
    const systemPrompt = options.config?.systemInstruction || "Eres un analista experto.";
    const userPrompt = typeof options.contents === 'string' ? options.contents : JSON.stringify(options.contents);
    const isJson = options.config?.responseMimeType === "application/json";
    
    try {
        const fallbackRes = await executeAiWaterfall([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            mode: 'noTools',
            jsonMode: isJson,
            temperature: 0.4
        });
        
        return {
            text: fallbackRes.content
        };
    } catch (fallbackError) {
        throw new Error(`Todos los fallbacks fallaron. Error final: ${fallbackError.message}`);
    }
};

// ==========================================
// GENERADOR PRINCIPAL
// ==========================================
export async function generateAndSendAutoNewsletter(feedback = null) {
    console.log("🤖 Iniciando Generador Godzilla (WATERFALL METHOD & MEGA-DICTIONARY)...");
    
    const systemInstruction = "Eres Godzilla AI, consultor estratégico. Escribes reportes ejecutivos dirigidos de 'tú a tú' a líderes empresariales, emprendedores y entusiastas de la tecnología. Prohibido usar relleno paja.\nREGLA JSON CRÍTICA: Tu salida será consumida por JSON.parse() estricto. LAS CLAVES Y VALORES DEL ESQUEMA PADRE DEBEN USAR COMILLAS DOBLES (\"). Pero DENTRO del texto, si necesitas citar algo, usa SOLAMENTE comillas simples (''). NUNCA uses saltos de línea literales; si necesitas un salto de línea, escribe estrictamente '\\n'. Jamás metas comillas dobles internas sin escapar.\nREGLA ANTI-ALUCINACIÓN (ROJA): Es una ofensa inaceptable inventar rutas web y dar errores 404. Jamás fabriques URLs largas.";

    let fdbkStr = feedback ? `\n[ATENCIÓN ORDEN DEL CEO: Corrige el borrador anterior aplicando esto: "${feedback}"]\n` : '';
    const currentDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });

    // 0. FETCH CONTEXTO REAL (NOTICIAS DE HOY) PARA EVITAR ALUCINACIONES
    let realNewsContext = "";
    try {
        console.log("📰 Obteniendo contexto de noticias reales para inyectar en el cerebro de Godzilla...");
        const rssRes = await fetch('https://news.google.com/rss/search?q=Inteligencia+Artificial+OR+Startups+OR+Tecnologia+when:1d&hl=es-419&gl=MX&ceid=MX:es-419');
        const xml = await rssRes.text();
        const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 15).map(m => m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
        realNewsContext = "\nCONTEXTO DE NOTICIAS REALES DE LAS ÚLTIMAS 24 HORAS (Úsalo como base obligatoria para tu análisis):\n- " + titles.join("\n- ");
        console.log("📰 " + titles.length + " titulares inyectados al prompt.");
    } catch(e) {
        console.error("❌ Fallo obteniendo RSS de noticias:", e.message);
    }

    // 0.5. FASE 1: EXTRAER INFO CON GEMINI Y JITTER (Evitar 429)
    console.log("🧠 [Fase 1] Extrayendo y resumiendo contexto crudo usando Gemini...");
    const rawPrompt = `HOY ES ${currentDate}. Revisa estas noticias extraídas hace 1 segundo de internet. Extrae un resumen crudo en texto plano (bullet points) de las 3 más importantes sobre Inteligencia Artificial, Startups o Negocios. REGLA ESTRICTA: Las noticias deben ser frescas, no inventes eventos pasados ni repitas noticias viejas. Solo usa el contexto provisto.\n\n${realNewsContext}`;
    
    let rawNewsSummary = "";
    try {
        const rawRes = await generateWithRetry('gemini-2.5-flash', {
            contents: rawPrompt
        });
        rawNewsSummary = rawRes.text || '';
        console.log("✅ [Fase 1] Resumen crudo obtenido.");
    } catch(e) {
        console.error("⚠️ Fallo en la fase 1, usando contexto original crudo.", e.message);
        rawNewsSummary = realNewsContext;
    }

    // 1. FASE 2: GENERAR JSON FINAL (ESPAÑOL) CON IA PREMIUM
    const premiumPrompt = `Crea el boletín de inteligencia estratégica del día de HOY (${currentDate}).${fdbkStr}
    
AQUÍ TIENES LOS HECHOS CLAVE FRESCOS DE HOY (Recopilados de internet hace un instante):
${rawNewsSummary}

TAREA CRÍTICA: Eres un analista Senior de primer nivel. El contenido generado debe ser PROFUNDO y detallado basándose ÚNICAMENTE en los hechos provistos. ESTÁ TOTALMENTE PROHIBIDO alucinar noticias viejas o reciclar temas de la semana pasada. Explica el contexto actual y el impacto real. Ve al grano estratégico.

DEVUELVE ÚNICAMENTE UN STRING JSON VÁLIDO PURAMENTE (sin markdown \`\`\`json) CON ESTA ESTRUCTURA BASE (TODO EN ESPAÑOL POR AHORA):
{
    "subject_es": "Asunto (con emoji)",
    "miniSummary_es": "Misterio y valor agresivo de 2 renglones para que abran el PDF.",
    "coverPrompt": "English prompt for text2image merging the day's topics in 'TIME magazine cover' style...",
    "emailHTML_es": "<h2>Lo que debes saber hoy</h2><ul><li><strong>Noticia: </strong>1 o 2 oraciones de alto impacto.</li></ul>",
    "pdfTitle": "DIARIO GODZILLA AI",
    "pdfSubtitle": "Inteligencia Ejecutiva Diaria",
    "pdfIntro": "Un editorial inicial extenso (al menos 2 párrafos) hablando de tú a tú, analizando el panorama macro actual. (Solo plain text, nada de HTML)",
    "pdfMetrics": [ { "label": "Impacto a Productividad (%)", "value": 85 } ],
    "pdfChart": { "title": "Adopción de Mercado", "data": [ {"label": "Líder", "value": 60}, {"label": "Rival", "value": 40} ] },
    "pdfSections": [ { "heading": "Título Noticia", "content": "Detalle analítico profundo de al menos 2 párrafos explicando el por qué, el cómo y el impacto en los negocios. (Solo plain text)" } ],
    "pdfQuote": "Insight profundo de supervivencia tecnológica o reflexión de un líder de la industria.",
    "pdfConclusion": "Conclusión estratégica orientada al ROI, pasos a seguir o predicciones para el resto de la semana."
}`;

    console.log("🧠 [Fase 2] Enviando resumen a Gemini para diseño de Copywriting Premium...");
    let data;
    try {
        const baseResponse = await generateWithRetry('gemini-2.5-flash', {
            contents: premiumPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });
        const jsonText = cleanJsonStr(baseResponse.text);
        data = JSON.parse(jsonText);
        console.log("✅ Contenido IA Base Generado.");
    } catch(err) {
        console.error("❌ Fallo en la Fase 2 con Gemini:", err.message);
        throw new Error("No se pudo generar el contenido base del newsletter.");
    }

    // 2. MEGA-DICCIONARIO 11 IDIOMAS — Traducción con Gemini + Jitter (Bloques)
    const targetLangs = ['en', 'fr', 'pt', 'de', 'ja', 'it', 'zh', 'ko', 'ar', 'ru'];
    const translationsJson = { "es": data };
    
    console.log("🌍 Iniciando Traducción de Diccionario por Bloques con Jitter...");
    for (const lang of targetLangs) {
        console.log(`   Traduciendo a [${lang}]...`);
        const transPrompt = `Translate the following JSON precisely into ISO language code [${lang}]. Keep EXACT JSON keys and schema. Do not change structure. Return ONLY pure valid JSON:\n\n${JSON.stringify(data)}`;
        try {
            const transRes = await generateWithRetry('gemini-2.5-flash', {
                contents: transPrompt,
                config: {
                    systemInstruction: "You are a perfect JSON translator. Reply only with valid JSON.",
                    responseMimeType: "application/json"
                }
            });
            const transResultStr = cleanJsonStr(transRes.text);
            translationsJson[lang] = JSON.parse(transResultStr);
            console.log(`   ✅ [${lang}] Traducido con Gemini.`);
        } catch (err) {
            console.error(`   ❌ Fallo traduciendo a ${lang}, usando español por defecto.`, err.message);
            translationsJson[lang] = data; // Último recurso
        }
    }
    console.log("✅ Mega-Diccionario Guardado (8 Idiomas Listos).");

    // 3. GENERAR PORTADA (Con IA dinámica, omitido si no hay llave)
    let visualCoverUrl = null;
    if (data.coverPrompt && process.env.GEMINI_API_KEY) {
        // En caso de que se resuelva la disputa, Gemini hará la imagen. 
        // TODO: Migrar a Pollinations Image si la disputa persiste.
        try {
            const imgRes = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: data.coverPrompt,
                config: { numberOfImages: 1, outputMimeType: 'image/png' }
            });

            if (imgRes.generatedImages?.[0]?.image?.imageBytes) {
                const b64 = imgRes.generatedImages[0].image.imageBytes;
                const buffer = Buffer.from(b64, 'base64');
                const fileName = `newsletter_cover_${Date.now()}.png`;
                const savePath = path.join(ASSETS_DIR, fileName);
                fs.writeFileSync(savePath, buffer);
                const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
                visualCoverUrl = `${botBase}/api/media/${fileName}`;
                console.log("📸 Portada TIME Generada:", visualCoverUrl);
            }
        } catch(e) {
            console.error("❌ Fallo generando portada (Probablemente por disputa Gemini):", e.message);
        }
    }

    if (!visualCoverUrl) {
        // Fallback a Pollinations Image
        console.log("📸 Usando Pollinations Image como Fallback para la Portada...");
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent("Award-winning TIME magazine cover, photorealistic, shot on 35mm lens, authentic corporate documentary style, professional photography, hyper-realistic, natural lighting, highly detailed, no CGI, no 3D render, no cartoon, lifelike texture. " + data.coverPrompt)}?width=1080&height=1920&nologo=true&model=flux-realism&enhance=true`;
        visualCoverUrl = fallbackUrl;
    }

    try {
        await pool.query(`ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS base_json TEXT;`);
        await pool.query(`ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS cover_url TEXT;`);
        await pool.query(`ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS translations_json JSONB;`);
    } catch(err) {}

    const stringifiedHtml = JSON.stringify({ 
        es: translationsJson['es'].emailHTML_es || '', 
        en: translationsJson['en'].emailHTML_es || '' // Reusamos la llave porque el traductor conserva las llaves
    });
    const stringifiedSubject = JSON.stringify({ 
        es: translationsJson['es'].subject_es || 'Boletín IA', 
        en: translationsJson['en'].subject_es || 'AI Newsletter' 
    });

    const nlRes = await pool.query(
        `INSERT INTO newsletters (subject, body_html, attachment_url, status, base_json, cover_url, translations_json)
         VALUES ($1, $2, null, 'draft', $3, $4, $5) RETURNING id`,
        [stringifiedSubject, stringifiedHtml, JSON.stringify(data), visualCoverUrl, JSON.stringify(translationsJson)]
    );

    const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
    const attachmentUrl = `${botBase}/api/premium/download/${nlRes.rows[0].id}`;

    await pool.query(`UPDATE newsletters SET attachment_url = $1 WHERE id = $2`, [attachmentUrl, nlRes.rows[0].id]);

    return { 
        newsletterId: nlRes.rows[0].id, total: 0, attachmentUrl, 
        subject: data.subject_es, 
        bodyHtml: stringifiedHtml 
    };
}
