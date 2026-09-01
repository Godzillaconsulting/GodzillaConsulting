import pool from '../config/db.js';
import { enqueueNewsletter } from './emailQueue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ARCHIVOS_PESADOS_DIR } from '../routes/media.js';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

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

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

import { executeAiWaterfall } from '../utils/aiWaterfall.js';

const callWithTimeout = (promise, ms = 25000) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout de ${ms}ms excedido en Gemini`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

const generateWithRetry = async (modelName, options, maxRetries = 2) => {
    // Modelos oficiales de Google Generative AI
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    
    if (genAI) {
        for (const currentModel of modelsToTry) {
            let attempt = 0;
            while (attempt < maxRetries) {
                try {
                    await sleep(300 + Math.random() * 300);
                    const modelConfig = {
                        model: currentModel,
                    };
                    if (options.config?.systemInstruction) {
                        modelConfig.systemInstruction = options.config.systemInstruction;
                    }
                    if (options.config?.responseMimeType === "application/json") {
                        modelConfig.generationConfig = { responseMimeType: "application/json" };
                    }
                    const model = genAI.getGenerativeModel(modelConfig);
                    const prompt = typeof options.contents === 'string' ? options.contents : JSON.stringify(options.contents);

                    const res = await callWithTimeout(model.generateContent(prompt), 25000);
                    const text = res?.response?.text();
                    if (text && text.trim().length > 0) return { text };
                } catch (e) {
                    attempt++;
                    console.error(`⚠️ Error Gemini (${currentModel}) Intento ${attempt}:`, e.message?.substring(0, 120));
                    break;
                }
            }
        }
    }
    
    // Capa Fallback: Emergencia total fuera de Google — Groq/SambaNova/Cerebras
    console.log(`🚨 Red de Google no disponible. Activando FALLBACK Open Source con tokens extendidos...`);
    const systemPrompt = options.config?.systemInstruction || "Eres un analista experto.";
    const userPrompt = typeof options.contents === 'string' ? options.contents : JSON.stringify(options.contents);
    const isJson = options.config?.responseMimeType === "application/json";
    
    try {
        const fallbackRes = await executeAiWaterfall([
            { role: 'system', content: `${systemPrompt}\n\nResponde SOLO con JSON puro válido sin markdown. El JSON debe estar completo hasta el último }.` },
            { role: 'user', content: userPrompt }
        ], {
            mode: 'noTools',
            jsonMode: isJson,
            temperature: 0.3,
            maxTokens: 6000
        });
        
        return { text: fallbackRes.content };
    } catch (fallbackError) {
        throw new Error(`Todos los fallbacks fallaron. Error final: ${fallbackError.message}`);
    }
};

// ==========================================
// GENERADOR PRINCIPAL
// ==========================================
export async function generateAndSendAutoNewsletter(feedback = null, force = false) {
    console.log("🤖 Iniciando Generador Godzilla (WATERFALL METHOD & MEGA-DICTIONARY)...");
    
    // ==========================================
    // BLOQUEO ANTI-DUPLICADOS (CRITICAL FIX)
    // ==========================================
    const client = await pool.connect();
    try {
        // 1. Lock a nivel de base de datos para evitar race conditions si 2 crons disparan al mismo tiempo
        const lockRes = await client.query('SELECT pg_try_advisory_lock(991122) AS acquired');
        if (!lockRes.rows[0].acquired) {
            console.log("⏭️ [Generador] Otro proceso ya está generando el newsletter en este instante. Cancelando duplicado.");
            return { skipped: true, reason: 'concurrent_generation_locked' };
        }

        // 2. Verificar si ya se envió un newsletter hoy (usando sent_at), a menos que sea forzado o con feedback
        if (!force && !feedback) {
            const checkRes = await client.query(
                `SELECT id FROM newsletters WHERE DATE(sent_at AT TIME ZONE 'America/Mexico_City') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City') LIMIT 1`
            );
            if (checkRes.rows.length > 0) {
                console.log("⏭️ [Generador] El newsletter de hoy ya existe en la base de datos. Evitando envío doble.");
                return { skipped: true, reason: 'already_generated_today' };
            }
        }
    } catch (dbErr) {
        console.error("❌ Error verificando duplicados:", dbErr.message);
    } finally {
        if (client) {
            try { await client.query('SELECT pg_advisory_unlock(991122)'); } catch (e) {}
            client.release();
        }
    }

    const currentDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
    const systemInstruction = `Eres Godzilla AI, consultor estratégico. Escribes reportes ejecutivos dirigidos de 'tú a tú' a líderes empresariales, emprendedores y entusiastas de la tecnología. Prohibido usar relleno paja.\nREGLA JSON CRÍTICA: Tu salida será consumida por JSON.parse() estricto. LAS CLAVES Y VALORES DEL ESQUEMA PADRE DEBEN USAR COMILLAS DOBLES ("). Pero DENTRO del texto, si necesitas citar algo, usa SOLAMENTE comillas simples (''). NUNCA uses saltos de línea literales; si necesitas un salto de línea, escribe estrictamente '\\n'. Jamás metas comillas dobles internas sin escapar.\nREGLA ANTI-ALUCINACIÓN (ROJA): Es una ofensa inaceptable inventar rutas web y dar errores 404. Jamás fabriques URLs largas.\nREGLA ESPACIO-TIEMPO: Hoy es ${currentDate}. Bajo ninguna circunstancia inventes fechas futuras o hables de noticias desactualizadas. Actúa con pleno contexto de esta fecha.`;

    let fdbkStr = feedback ? `\n[ATENCIÓN ORDEN DEL CEO: Corrige el borrador anterior aplicando esto: "${feedback}"]\n` : '';

    // 0. FETCH CONTEXTO REAL CATEGORIZADO DE NOTICIAS DE HOY (4 VERTICALES)
    let realNewsContext = "";
    const usedHeadingsSet = new Set();

    try {
        console.log("🛡️ [Anti-Duplicación] Consultando historial de los últimos 14 días...");
        const pastRes = await client.query(`
            SELECT base_json FROM newsletters 
            WHERE created_at >= NOW() - INTERVAL '14 days'
        `);
        pastRes.rows.forEach(r => {
            try {
                const data = typeof r.base_json === 'string' ? JSON.parse(r.base_json) : r.base_json;
                (data.pdfSections || []).forEach(s => {
                    if (s.heading) usedHeadingsSet.add(s.heading.toLowerCase().trim());
                });
            } catch(e) {}
        });
        console.log(`🛡️ [Anti-Duplicación] ${usedHeadingsSet.size} titulares cargados para prevenir noticias repetidas.`);

        console.log("📰 [Scraper 24h] Obteniendo noticias exclusivas de las últimas 24 horas...");
        const feeds = [
            { url: 'https://news.google.com/rss/search?q=(OpenAI+OR+Nvidia+OR+Anthropic+OR+Gemini+OR+Blackwell+OR+"agentic+AI")+when:1d&hl=en-US&gl=US&ceid=US:en', cat: '1. NUEVOS MODELOS, HARDWARE Y AVANCES TÉCNICOS' },
            { url: 'https://news.google.com/rss/search?q=(cybersecurity+OR+"data+breach"+OR+ransomware+OR+"zero-day")+AI+when:1d&hl=en-US&gl=US&ceid=US:en', cat: '2. CIBERSEGURIDAD, HACKEOS Y VULNERABILIDADES DE IA' },
            { url: 'https://news.google.com/rss/search?q=(healthcare+OR+"clinical+AI"+OR+biotech+OR+medicine)+AI+when:1d&hl=en-US&gl=US&ceid=US:en', cat: '3. MEDICINA, SALUD Y TRABAJO' },
            { url: 'https://news.google.com/rss/search?q=(defense+OR+military+OR+"Pentagon"+OR+regulation+OR+law)+AI+when:1d&hl=en-US&gl=US&ceid=US:en', cat: '4. GEOPOLÍTICA, REGULACIÓN Y USO BÉLICO/MILITAR' }
        ];

        let fullDigest = "";
        let totalCount = 0;
        const fetch = (await import('node-fetch')).default;

        for (const f of feeds) {
            try {
                const res = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
                if (!res.ok) continue;
                const xml = await res.text();
                const matches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<description>(.*?)<\/description>/g)];
                let catItems = [];
                for (const m of matches) {
                    let t = m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
                    let d = m[2].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
                    
                    const lowerT = t.toLowerCase();
                    const isDupe = Array.from(usedHeadingsSet).some(past => past.includes(lowerT.substring(0, 25)) || lowerT.includes(past.substring(0, 25)));
                    if (isDupe) {
                        console.log(`   ⏭️ [Filtro Anti-Repetición] Omitiendo noticia usada en días anteriores: "${t.substring(0, 45)}..."`);
                        continue;
                    }

                    if (t && t.length > 10) {
                        catItems.push(`• [${f.cat}] NOTICIA FRESCA DE HOY: ${t}\n  CONTEXTO/DATOS: ${d.substring(0, 250)}`);
                    }
                    if (catItems.length >= 3) break;
                }
                if (catItems.length > 0) {
                    fullDigest += `\n--- ${f.cat} ---\n` + catItems.join("\n");
                    totalCount += catItems.length;
                }
            } catch(e) {
                console.error(`❌ Error scraping feed ${f.cat}:`, e.message);
            }
        }

        // Complementar con DuckDuckGo Search Scraper para datos directos verificados en tiempo real de HOY
        try {
            const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            console.log(`🔍 [WebScraper] Enriqueciendo hechos de HOY (${todayStr}) con DuckDuckGo Search...`);
            const searchQueries = [
                `latest artificial intelligence news breaking ${todayStr}`,
                `cybersecurity vulnerability breach news ${todayStr}`
            ];
            for (const q of searchQueries) {
                const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
                const res = await fetch(searchUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    signal: AbortSignal.timeout(6000)
                });
                if (res.ok) {
                    const html = await res.text();
                    const $ = cheerio.load(html);
                    const snippets = [];
                    $('.result__snippet').each((i, el) => {
                        const txt = $(el).text().trim();
                        if (txt && snippets.length < 3) snippets.push(txt);
                    });
                    if (snippets.length > 0) {
                        fullDigest += `\n--- BÚSQUEDA WEB EN TIEMPO REAL (${q}) ---\n• ` + snippets.join("\n• ");
                        totalCount += snippets.length;
                    }
                }
            }
        } catch (ddgErr) {
            console.warn("⚠️ Falló DuckDuckGo Search complementario:", ddgErr.message);
        }

        realNewsContext = fullDigest;
        console.log(`📰 [Scraper Híbrido Anti-Duplicados] ${totalCount} noticias NUTRIDAS Y 100% NUEVAS inyectadas.`);
    } catch(e) {
        console.error("❌ Fallo obteniendo RSS de noticias:", e.message);
    }

    // 0.5. FASE 1: RESUMEN ANALÍTICO DE HECHOS REALES
    console.log("🧠 [Fase 1] Extrayendo síntesis ejecutiva de hechos reales...");
    const rawPrompt = `HOY ES ${currentDate}. Revisa estas noticias extraídas hace 1 segundo de internet:
${realNewsContext}

TAREA: Sintetiza estas noticias reales en 4 bloques de datos verificados (uno para cada categoría). No inventes ningún dato, nombres o empresas que no estén arriba. Menciónalos explícitamente.`;
    
    let rawNewsSummary = "";
    try {
        const rawRes = await generateWithRetry('gemini-3.6-flash', { contents: rawPrompt });
        rawNewsSummary = rawRes.text || '';
        console.log("✅ [Fase 1] Síntesis cruda obtenida.");
    } catch(e) {
        console.error("⚠️ Fallo en la fase 1, usando contexto original crudo.", e.message);
        rawNewsSummary = realNewsContext;
    }

    // 1. FASE 2: GENERAR JSON FINAL CON 4 SECCIONES OBLIGATORIAS
    const premiumPrompt = `Crea el boletín de inteligencia estratégica del día de HOY (${currentDate}).${fdbkStr}
    
AQUÍ TIENES LAS NOTICIAS REALES Y COMPROBADAS DE HOY:
${rawNewsSummary}

TAREA CRÍTICA: Eres un analista Senior de tecnología. El contenido generado debe ser PROFUNDO, altamente técnico y 100% basado en los hechos reales arriba provistos.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Usar titulares genéricos como "Avances en Modelos y Hardware" o "Ciberseguridad y Hackeos". CADA TITULAR DEBE SER ESPECÍFICO CON NOMBRE DE EMPRESA Y SUCESO REAL (Ej: "NVIDIA anuncia procesador Blackwell Ultra", "Anthropic lanza Claude 3.5 Sonnet").
2. Repetir noticias anteriores.
3. Generar menos de 4 noticias. DEBES REDACTAR EXACTAMENTE 4 NOTICIAS SEPARADAS.

DEVUELVE ÚNICAMENTE UN STRING JSON VÁLIDO PURAMENTE (sin markdown \`\`\`json) CON ESTA ESTRUCTURA (TODO EN ESPAÑOL POR AHORA):
{
    "subject_es": "Asunto impactante (con emoji)",
    "miniSummary_es": "Resumen ejecutivo de 2 líneas para abrir el PDF.",
    "coverPrompt": "English prompt for text2image merging the day's topics in 'TIME magazine cover' style...",
    "emailHTML_es": "HTML limpio con un saludo formal y una lista <ul> con los 4 titulares del día y 1 línea de impacto por cada uno.",
    "pdfTitle": "DIARIO GODZILLA AI",
    "pdfSubtitle": "Inteligencia Ejecutiva Diaria",
    "pdfIntro": "Editorial extenso (al menos 2 párrafos) analizando el panorama tecnológico actual basado en las noticias reales de hoy.",
    "pdfMetrics": [ { "label": "Adopción Corporativa (%)", "value": 74 }, { "label": "Reducción de Costos (%)", "value": 38 } ],
    "pdfChart": { "title": "Balance de Mercado IA", "data": [ {"label": "EE.UU.", "value": 58}, {"label": "China", "value": 42} ] },
    "pdfSections": [
        { "heading": "Titular Específico Noticia 1 con Nombre de Empresa/Modelo", "content": "Análisis técnico profundo (3+ párrafos de 150+ palabras c/u, separados con \\n\\n). Nombres reales de empresas, modelos y benchmarks. Cero Q&A." },
        { "heading": "Titular Específico Noticia 2 de Ciberseguridad", "content": "Análisis de vulnerabilidades, hackeos o riesgos reales reportados hoy (3+ párrafos separados con \\n\\n)." },
        { "heading": "Titular Específico Noticia 3 de Medicina/Salud", "content": "Análisis sobre uso en medicina, ciencia o impacto laboral real (3+ párrafos separados con \\n\\n)." },
        { "heading": "Titular Específico Noticia 4 de Geopolítica/Regulación", "content": "Análisis sobre uso bélico/militar, regulaciones gubernamentales o NATO/Pentágono (3+ párrafos separados con \\n\\n)." }
    ],
    "pdfQuote": "Reflexión estratégica de un líder tecnológico.",
    "pdfConclusion": "Conclusión orientada al ROI y predicciones para el resto de la semana."
}`;
    
    const finalPrompt = premiumPrompt + `\n\nREGLAS ABSOLUTAMENTE OBLIGATORIAS:
1. DEBES INCLUIR EXACTAMENTE 4 OBJETOS DENTRO DEL ARRAY 'pdfSections'. NO 1, NO 2, SINO EXACTAMENTE 4.
2. Cada titular en 'heading' DEBE SER ESPECÍFICO y mencionar empresas/modelos reales. PROHIBIDO usar nombres de categoría genéricos.
3. BASADO 100% EN LAS NOTICIAS REALES PROVISTAS. Cero alucinaciones. Cero generalidades vagas.
4. PÁRRAFOS: Usa \\n\\n para separar párrafos. Mínimo 3 párrafos por noticia (150+ palabras cada uno).`;

    console.log("🧠 [Fase 2] Enviando resumen a Gemini para diseño de Copywriting Premium...");
    let data;
    
    const parseAndValidate = (rawText) => {
        const jsonText = cleanJsonStr(rawText);
        const parsed = JSON.parse(jsonText);
        if (!parsed || !parsed.subject_es || !parsed.pdfIntro) {
            throw new Error("JSON incompleto: faltan campos clave (subject_es, pdfIntro).");
        }
        const sectionCount = parsed.pdfSections?.length || 0;
        if (sectionCount < 4) {
            throw new Error(`Se generaron sólo ${sectionCount} secciones. Se requieren EXACTAMENTE 4 noticias distintas.`);
        }

        // Rechazar titulares genéricos o repetidos del historial o ausencia de noticias
        const genericKeywords = [
            "no hay noticias", "no se registraron", "no hay incidentes", "no hay avances",
            "no hay novedades", "sin novedades", "avances en modelos", "avances en hardware",
            "ciberseguridad y hackeos", "medicina y salud", "geopolítica", "uso de la ia", "inteligencia artificial"
        ];
        for (const s of parsed.pdfSections) {
            const hLower = (s.heading || '').toLowerCase().trim();
            if (genericKeywords.some(g => hLower.includes(g))) {
                throw new Error(`El titular "${s.heading}" indica ausencia o generalidad de noticias. Exigiendo titulares con empresas y hechos concretos de hoy.`);
            }
            const isDupe = Array.from(usedHeadingsSet).some(past => past.length > 15 && (past.includes(hLower) || hLower.includes(past)));
            if (isDupe) {
                throw new Error(`El titular "${s.heading}" ya fue usado en boletines anteriores. Exigiendo noticia nueva de hoy.`);
            }
        }

        return parsed;
    };

    // Intento 1: Gemini (puede estar limitado)
    try {
        const baseResponse = await generateWithRetry('gemini-2.5-flash', {
            contents: finalPrompt,
            config: { systemInstruction: systemInstruction, responseMimeType: "application/json" }
        });
        const rawText = baseResponse.text || '';
        console.log(`📝 [Fase 2] Gemini OK — ${rawText.length} chars. Preview: ${rawText.substring(0, 120)}`);
        data = parseAndValidate(rawText);
        console.log(`✅ Contenido IA Base Generado (Gemini). Subject: ${data.subject_es} | Noticias: ${data.pdfSections.length}`);
    } catch(geminiErr) {
        console.error(`⚠️ [Fase 2] Gemini falló: ${geminiErr.message}. Activando Waterfall con tokens extendidos...`);
        
        // Intento 2: Waterfall Open Source con maxTokens alto (Groq soporta hasta 8192)
        const groqFallbackPrompt = `${finalPrompt}

INSTRUCCIÓN CRÍTICA PARA GROQ/LLAMA: Debes generar un JSON COMPLETO con EXACTAMENTE 4 objetos en pdfSections. 
El JSON debe terminar con }. No lo truncues. Usa el contexto de noticias provisto para rellenar las 4 secciones con empresas y hechos concretos reales.`;

        try {
            const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
            const fallbackRes = await executeAiWaterfall([
                { role: 'system', content: `${systemInstruction}\n\nResponde SOLO con JSON puro válido. Sin markdown. Sin texto adicional. El JSON debe estar completo hasta el último }.` },
                { role: 'user', content: groqFallbackPrompt }
            ], { 
                mode: 'noTools', 
                jsonMode: true, 
                temperature: 0.3, 
                maxTokens: 6000  // Suficiente para 4 noticias densas en JSON
            });
            
            const rawFallback = fallbackRes.content || '';
            console.log(`📝 [Fase 2] Waterfall OK — ${rawFallback.length} chars. Preview: ${rawFallback.substring(0, 120)}`);
            data = parseAndValidate(rawFallback);
            console.log(`✅ Contenido IA Base Generado (Waterfall). Subject: ${data.subject_es} | Noticias: ${data.pdfSections.length}`);
        } catch(waterfallErr) {
            console.error(`❌ [Fase 2] Waterfall también falló: ${waterfallErr.message}`);
            throw new Error(`No se pudo generar el contenido base del newsletter. Gemini: ${geminiErr.message} | Waterfall: ${waterfallErr.message}`);
        }
    }

    // 2. DICCIONARIO IDIOMAS (ES + EN fallback para dispositivos en otro idioma)
    const targetLangs = ['en'];
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

    // 3. GENERAR PORTADA EDITORIAL DE ULTRA ALTA DEFINICIÓN (HD)
    let visualCoverUrl = null;
    try {
        console.log("📸 [Portada HD] Seleccionando y descargando fotografía editorial temática de alta resolución...");
        const fullTopicText = [
            data.subject_es || '',
            data.pdfIntro || '',
            ...(data.pdfSections || []).map(s => `${s.heading} ${s.content}`)
        ].join(' ').toLowerCase();

        const curatedCategoryPhotos = [
            {
                // 1. Hardware, Microchips, GPUs, NVIDIA, Semiconductores, Procesadores
                match: (t) => t.includes('nvidia') || t.includes('amd') || t.includes('intel') || t.includes('gpu') || t.includes('microchip') || t.includes('procesador') || t.includes('semiconductor') || t.includes('blackwell') || t.includes('chip') || t.includes('hardware'),
                url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Microchips, GPUs & AI Hardware'
            },
            {
                // 2. Vehículos Autónomos, Robotaxis, Robótica, Humanoides, Drones
                match: (t) => t.includes('robot') || t.includes('autónomo') || t.includes('vehículo') || t.includes('robotaxi') || t.includes('tesla') || t.includes('waymo') || t.includes('drone') || t.includes('robótica'),
                url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Robotics & Autonomous Systems'
            },
            {
                // 3. Ciberseguridad, Hackers, Vulnerabilidades, Ransomware, Defensa
                match: (t) => t.includes('ciberseguridad') || t.includes('cybersecurity') || t.includes('hack') || t.includes('brecha') || t.includes('malware') || t.includes('vulnerabilidad') || t.includes('seguridad') || t.includes('ciberataque'),
                url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Cybersecurity & Digital Defense'
            },
            {
                // 4. Cloud Computing, Supercomputadoras, Datacenters, Infraestructura
                match: (t) => t.includes('datacenter') || t.includes('cloud') || t.includes('nube') || t.includes('servidor') || t.includes('infraestructura') || t.includes('supercomputadora') || t.includes('cluster'),
                url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Datacenters & Cloud Infrastructure'
            },
            {
                // 5. Salud, Medicina, Biotecnología, Diagnóstico IA, Genómica
                match: (t) => t.includes('salud') || t.includes('medicina') || t.includes('médico') || t.includes('biotech') || t.includes('hospital') || t.includes('fármaco') || t.includes('genoma') || t.includes('clínica') || t.includes('doctor'),
                url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Healthcare & Biotech Innovation'
            },
            {
                // 6. Finanzas, Fintech, Inversión, Startups, Wall Street, Negocios
                match: (t) => t.includes('fintech') || t.includes('inversión') || t.includes('startup') || t.includes('bolsa') || t.includes('mercado') || t.includes('acciones') || t.includes('millones') || t.includes('fondos'),
                url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Fintech & Tech Venture Capital'
            },
            {
                // 7. Geopolítica, Leyes, Regulación, NATO, Pentágono, Militar
                match: (t) => t.includes('militar') || t.includes('guerra') || t.includes('pentágono') || t.includes('nato') || t.includes('regulación') || t.includes('ley') || t.includes('gobierno') || t.includes('juicio') || t.includes('defensa'),
                url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'AI Policy, Governance & Defense'
            },
            {
                // 8. Modelos Fundacionales, Redes Neuronales, Cerebros IA, OpenAI, Anthropic, Gemini
                match: (t) => t.includes('openai') || t.includes('anthropic') || t.includes('gemini') || t.includes('deepmind') || t.includes('llm') || t.includes('gpt') || t.includes('inteligencia artificial') || t.includes('modelo'),
                url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&h=630&q=85',
                tag: 'Frontier AI Models & Neural Networks'
            }
        ];

        let selected = curatedCategoryPhotos.find(p => p.match(fullTopicText));
        let photoUrl = selected ? selected.url : 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=630&q=85';
        let photoTag = selected ? selected.tag : 'Executive Tech Innovation';

        const photoRes = await fetch(photoUrl, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
        if (photoRes.ok) {
            const arrayBuf = await photoRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            if (buffer.length > 15000) {
                const fileName = `newsletter_cover_${Date.now()}.jpg`;
                const savePath = path.join(ASSETS_DIR, fileName);
                fs.writeFileSync(savePath, buffer);
                const botBase = process.env.PUBLIC_MEDIA_URL || process.env.BOT_MEDIA_URL || 'https://godzillaconsulting.ai';
                visualCoverUrl = `${botBase}/api/media/assets/${fileName}`;
                console.log(`✅ [Portada HD] Portada temática [${photoTag}] guardada localmente (${(buffer.length/1024).toFixed(0)} KB): ${visualCoverUrl}`);
            }
        }
    } catch(coverErr) {
        console.warn(`⚠️ [Portada HD] Falló descarga local: ${coverErr.message}. Usando URL remota directa.`);
        visualCoverUrl = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=630&q=85';
    }

    if (!visualCoverUrl) {
        visualCoverUrl = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=630&q=85';
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

    const botBase = process.env.PUBLIC_MEDIA_URL || process.env.BOT_MEDIA_URL || 'https://godzillaconsulting.ai';
    const attachmentUrl = `${botBase}/api/premium/download/${nlRes.rows[0].id}`;
    const newsletterId = nlRes.rows[0].id;

    await pool.query(`UPDATE newsletters SET attachment_url = $1 WHERE id = $2`, [attachmentUrl, newsletterId]);

    // ✅ FIX CRÍTICO: Encolar y enviar el newsletter a todos los suscriptores activos.
    let totalSent = 0;
    try {
        console.log(`📤 [Newsletter] Iniciando envío masivo para newsletter #${newsletterId}...`);
        totalSent = await enqueueNewsletter(newsletterId);
        console.log(`✅ [Newsletter] Enviado a ${totalSent} suscriptores con portada HD temática.`);
    } catch (sendErr) {
        console.error(`❌ [Newsletter] Error al encolar/enviar newsletter #${newsletterId}:`, sendErr.message);
    }

    // Flujo de video automático deshabilitado para evitar generación de tareas fallidas
    console.log("ℹ️ [Planner] Generación automática de videos desde el newsletter desactivada.");

    return { 
        newsletterId, 
        total: totalSent, 
        attachmentUrl, 
        subject: data.subject_es, 
        bodyHtml: stringifiedHtml 
    };
}
