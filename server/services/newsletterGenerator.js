import pool from '../config/db.js';
import { enqueueNewsletter } from './emailQueue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ARCHIVOS_PESADOS_DIR } from '../routes/media.js';
import { fileURLToPath } from 'url';
import { executeAiWaterfall } from '../utils/aiWaterfall.js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = ARCHIVOS_PESADOS_DIR;

const cleanJsonStr = (text) => {
    let t = text.replace(/```json/i, '').replace(/```/i, '').trim();
    if (!t.startsWith('{')) t = '{' + t.substring(t.indexOf('{'));
    if (!t.endsWith('}')) t = t.substring(0, t.lastIndexOf('}') + 1);
    // Sanitizar saltos de línea literales dentro de los valores string generados por la IA
    t = t.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '') + '"';
    });
    return t;
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

    const prompt = `Crea el boletín de inteligencia estratégica del día de HOY (${currentDate}).${fdbkStr}${realNewsContext}

TAREA CRÍTICA: Eres un analista Senior de primer nivel. Extrae del CONTEXTO DE NOTICIAS proporcionado las 2 o 3 noticias, herramientas de IA, Startups o Tech más valiosas y disruptivas de HOY. 
IMPORTANTE: El contenido generado debe ser PROFUNDO, EXTENSO y detallado basándose EXCLUSIVAMENTE en las noticias reales. Nada de resúmenes de una línea. Explica el contexto, el impacto real en el mercado y las implicaciones a largo plazo. Piensa como un reporte de McKinsey o Gartner. Ve al grano estratégico, recordando siempre a nuestros "Socios Godzilla".

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
    "pdfSections": [ { "heading": "Título Noticia", "content": "Detalle analítico profundo de al menos 2 párrafos explicando el por qué, el cómo y el impacto en los negocios. (Solo plain text)", "sourceName": "TechCrunch", "url": "https://techcrunch.com" } ],
    "pdfQuote": "Insight profundo de supervivencia tecnológica o reflexión de un líder de la industria.",
    "pdfConclusion": "Conclusión estratégica orientada al ROI, pasos a seguir o predicciones para el resto de la semana."
}`;

    // 1. GENERAR JSON BASE (ESPAÑOL)
    const baseResponse = await executeAiWaterfall([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
    ], { jsonMode: true });
    const jsonText = cleanJsonStr(baseResponse.content);
    const data = JSON.parse(jsonText);
    console.log("✅ Contenido IA Base Generado.");

    // 2. CREACIÓN DEL MEGA-DICCIONARIO MULTI-IDIOMA
    const targetLangs = ['en', 'fr', 'pt', 'de', 'ja', 'it', 'zh'];
    const translationsJson = { "es": data };
    
    console.log("🌍 Iniciando Traducción de Diccionario para Cero Fugas de Tokens...");
    for (const lang of targetLangs) {
        console.log(`   Traduciendo a [${lang}]...`);
        const transPrompt = `Translate the following JSON precisely into ISO language code [${lang}]. Keep EXACT JSON keys and schema. Do not change structure. Return ONLY pure valid JSON:\n\n${JSON.stringify(data)}`;
        try {
            const transRes = await executeAiWaterfall([
                { role: 'system', content: "You are a perfect JSON translator. Reply only with valid JSON." },
                { role: 'user', content: transPrompt }
            ], { jsonMode: true });
            const transResultStr = cleanJsonStr(transRes.content);
            translationsJson[lang] = JSON.parse(transResultStr);
        } catch (err) {
            console.error(`   ❌ Fallo traduciendo a ${lang}, usando español por defecto.`);
            translationsJson[lang] = data; // Fallback to spanish if one fails
        }
    }
    console.log("✅ Mega-Diccionario Guardado (8 Idiomas Listos).");

    // 3. GENERAR PORTADA (Con IA dinámica, omitido si no hay llave)
    let visualCoverUrl = null;
    if (data.coverPrompt && process.env.GEMINI_API_KEY) {
        // En caso de que se resuelva la disputa, Gemini hará la imagen. 
        // TODO: Migrar a Pollinations Image si la disputa persiste.
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const aiImg = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const imgRes = await aiImg.models.generateImages({
                model: 'imagen-3.0-generate-001',
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
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent("magazine cover " + data.coverPrompt)}?width=1080&height=1920&nologo=true`;
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
