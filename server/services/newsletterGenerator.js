import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../config/db.js';
import { enqueueNewsletter } from './emailQueue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ARCHIVOS_PESADOS_DIR } from '../routes/media.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = ARCHIVOS_PESADOS_DIR;

const getClient = () => {
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const cleanHtmlStr = (str) => {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '); 
};

export async function generateAndSendAutoNewsletter(feedback = null) {
    console.log("🤖 Iniciando Generador Godzilla (Versatilidad Referencial y Anti-Ghosting)...");
    
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Eres Godzilla AI, consultor B2B. Escribes reportes ejecutivos dirigidos de 'tú a tú' al líder empresarial. Prohibido usar relleno paja.\nREGLA JSON CRÍTICA: Tu salida será consumida por JSON.parse() estricto. LAS CLAVES Y VALORES DEL ESQUEMA PADRE DEBEN USAR COMILLAS DOBLES (\"). Pero DENTRO del texto de tus noticias o asuntos, si necesitas citar algo, usa SOLAMENTE comillas simples (''). Nunca metas comillas dobles internas sin escapar, ni saltos de línea crudos, o corromperás el JSON.\nREGLA ANTI-ALUCINACIÓN (ROJA): Es una ofensa inaceptable inventar rutas web y dar errores 404 al usuario. Jamás fabriques URLs largas adivinando artículos.",
        tools: [
            { googleSearch: {} }
        ]
    });

    let fdbkStr = feedback ? `\n[ATENCIÓN ORDEN DEL CEO: Corrige el borrador anterior aplicando esto: "${feedback}"]\n` : '';

    const prompt = `Crea el boletín de inteligencia B2B del día de HOY.${fdbkStr}
TAREA CRÍTICA: Busca las 2 o 3 noticias y herramientas de IA más valiosas empresariales HOY. No hagas reportes aburridos. Ve al grano.

MISIÓN A (Email "Skimmable"): Puros Bullet Points en resúmenes ejecutivos en formato HTML (<h2>, <ul>, <li>, <b>).
MISIÓN B (PDF "Socios"): Escribe DIRECTAMENTE al usuario. PROHIBIDO GENERAR MÁS DE 3 NOTICIAS/SECCIONES (Para no rellenar hojas).
EXTRAORDINARIA ATENCIÓN CON LAS REFERENCIAS WEB Y URLs: Para cada sección, entrega la URL de la Institución/Empresa (ej: https://openai.com o https://www.bloomberg.com). PROHIBIDO INTENTAR ADIVINAR LA RUTA O SUBDIRECTORIO DEL ARTÍCULO (Eso genera siempre Alucinaciones y errores 404 letales en los PDFs). Coloca SIEMPRE el Link general limpio y oficial hacia la fuente principal matriz, sin saltos de directorio.

DEVUELVE ÚNICAMENTE UN STRING JSON VÁLIDO PURAMENTE (sin markdown \`\`\`json) CON ESTA ESTRUCTURA:
{
    "subject_es": "Asunto en ES (con emoji)",
    "subject_en": "Asunto en EN (con emoji)",
    "emailHTML_es": "<h2>Lo que debes saber hoy en IA</h2><ul><li><strong>Empresa: </strong>1 oración.</li></ul>",
    "emailHTML_en": "<h2>What you need to know today in AI</h2><ul><li><strong>Company: </strong>1 sentence.</li></ul>",
    "pdfTitle": "DIARIO GODZILLA AI",
    "pdfSubtitle": "Inteligencia Ejecutiva Diaria",
    "pdfIntro": "Párrafo introductorio hablando de tú a tú. (Solo plain text, nada de HTML)",
    "pdfMetrics": [
        { "label": "Impacto a Productividad (%)", "value": 85 }
    ],
    "pdfChart": { 
        "title": "Adopción de Mercado",
        "data": [ {"label": "Líder", "value": 60}, {"label": "Rival", "value": 40} ] 
    },
    "pdfSections": [
        { 
          "heading": "Título Noticia", 
          "content": "Detalle analítico B2B. (Solo plain text)",
          "sourceName": "TechCrunch / Microsoft Blog",
          "url": "https://techcrunch.com"
        }
    ],
    "pdfQuote": "Insight de supervivencia tecnológica.",
    "pdfConclusion": "Conclusión orientada al ROI."
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/i, '').replace(/```/i, '').trim();
    const data = JSON.parse(text);

    console.log("✅ Contenido IA con Referencias Oficiales Generado. Guardando Semilla JSON en BD...");

    let attachmentUrl = null;
    
    // Inyección de migración instantánea (Cero downtime)
    try {
        await pool.query(`ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS base_json TEXT;`);
    } catch(err) { console.error("Ignorable alter:", err.message) }

    const stringifiedHtml = JSON.stringify({ es: data.emailHTML_es || '', en: data.emailHTML_en || '' });
    const stringifiedSubject = JSON.stringify({ es: data.subject_es || 'Boletín IA', en: data.subject_en || 'AI Newsletter' });

    const nlRes = await pool.query(
        `INSERT INTO newsletters (subject, body_html, attachment_url, status, base_json)
         VALUES ($1, $2, null, 'draft', $3) RETURNING id`,
        [stringifiedSubject, stringifiedHtml, JSON.stringify(data)]
    );

    const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
    attachmentUrl = `${botBase}/api/premium/download/${nlRes.rows[0].id}`;

    await pool.query(`UPDATE newsletters SET attachment_url = $1 WHERE id = $2`, [attachmentUrl, nlRes.rows[0].id]);

    return { 
        newsletterId: nlRes.rows[0].id, total: 0, attachmentUrl, 
        subject: data.subject_es, 
        bodyHtml: stringifiedHtml 
    };
}
