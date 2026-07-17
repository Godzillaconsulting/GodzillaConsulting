import { executeAiWaterfall } from '../utils/aiWaterfall.js';
import ytSearch from 'yt-search';
import pool from '../config/db.js';

export const getTrends = async (req, res) => {
    const { network = 'General', filter = 'B2B Tech' } = req.query;
    
    try {
        // FASE 1: Buscar datos reales (Exa Search o yt-search)
        let rawTrends = '';
        let examples = [];
        
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        
        if (process.env.EXA_API_KEY) {
            try {
                const exaRes = await fetch('https://api.exa.ai/search', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': process.env.EXA_API_KEY
                    },
                    body: JSON.stringify({
                        query: filter,
                        type: 'keyword',
                        numResults: 5,
                        startPublishedDate: twoDaysAgo,
                        includeDomains: network === 'TikTok' ? ['tiktok.com'] 
                            : network === 'Instagram' ? ['instagram.com'] 
                            : network === 'YouTube' ? ['youtube.com']
                            : network === 'Facebook' ? ['facebook.com']
                            : ['tiktok.com', 'instagram.com', 'youtube.com'],
                        contents: { text: { maxCharacters: 1000 } }
                    })
                });
                const exaData = await exaRes.json();
                if (exaData.results && exaData.results.length > 0) {
                    examples = exaData.results.map(r => ({
                        title: r.title || 'Video Viral',
                        url: r.url,
                        thumbnail: r.image || null,
                        views: r.author || 'Viral'
                    }));
                    rawTrends = exaData.results.map(r => `TITULO: ${r.title}\nURL: ${r.url}\nTEXTO: ${r.text}\n---\n`).join('');
                    console.log(`[Trends] ✅ Fase 1 completada - datos crudos obtenidos de EXA SEARCH.`);
                }
            } catch(e) {
                console.warn(`[Trends] ⚠️ Fallo Búsqueda Exa, usando yt-search Fallback.`, e.message);
            }
        }

        // yt-search como fallback o fuente principal de videos reales
        if (!rawTrends || examples.length === 0) {
            try {
                // Buscamos noticias recientes sin contaminar el algoritmo
                const searchResults = await ytSearch(`${filter} noticias recientes`);
                if (searchResults && searchResults.videos && searchResults.videos.length > 0) {
                    examples = searchResults.videos.slice(0, 4).map(v => ({
                        title: v.title.replace(/\| TikTok|\| Instagram|#shorts|#tiktok|\| YouTube/gi, '').trim(),
                        url: v.url,
                        thumbnail: v.thumbnail || v.image,
                        views: v.views
                    }));
                    
                    if (!rawTrends) {
                        rawTrends = examples.map(v => `TITULO VIRAL: ${v.title}`).join('\n');
                    }
                    console.log(`[Trends] ✅ Fase 1 completada - obtenidos videos virales desde yt-search.`);
                }
            } catch (err) {
                console.warn(`[Trends] ⚠️ Fallo yt-search:`, err.message);
            }
        }

        if (!rawTrends || examples.length === 0) {
            const rawTrendsPrompt = `Dame una lista rápida y cruda de 5-7 hashtags y 3 frases gancho (hooks) que estén funcionando AHORA en ${network} para el nicho "${filter}". Solo texto plano, sin formato, sin JSON.`;
            try {
                const rawRes = await executeAiWaterfall([
                    { role: 'user', content: rawTrendsPrompt }
                ], { mode: 'compression' });
                rawTrends = rawRes.content || '';
                console.log(`[Trends] ✅ Fase 1 completada - datos crudos obtenidos de LLM Fallback.`);
            } catch(e) {
                console.warn(`[Trends] ⚠️ Fallo Fase 1 (gratuita), Gemini hará todo directamente.`);
            }
        }

        // FASE 2: Gemini Premium formatea y mejora los datos
        const prompt = `Actúa como un experto Director de Marketing Analítico.
TENEMOS ESTAS IDEAS BASE para ${network}, nicho: "${filter}":
${rawTrends ? rawTrends : 'Sin datos previos — genera tú mismo las tendencias más probables para hoy.'}

Tu trabajo es MEJORARLAS y devolverlas ÚNICAMENTE como objeto JSON estricto sin comillas invertidas ni bloques de código:

{
  "network": "${network}",
  "niche": "${filter}",
  "hashtags": ["#Ejemplo1", "#Ejemplo2", "#Ejemplo3", "#Ejemplo4", "#Ejemplo5"],
  "hooks": [
    "💥 [Hook hiper persuasivo de 10 palabras sobre el nicho...]",
    "🔥 [Otro hook viral para iniciar un video/post...]",
    "🚨 [Un tercer gancho analítico sobre el mercado...]"
  ]
}`;

        const aiRes = await executeAiWaterfall([
            { role: 'user', content: prompt }
        ], { mode: 'premium' });

        let responseText = aiRes.content || '';
        
        // Limpiar backticks si el modelo los retorna
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/```json\n?/, '').replace(/```$/, '');
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/```\n?/, '').replace(/```$/, '');
        }
        
        const data = JSON.parse(responseText.trim());
        
        // Inyectar ejemplos reales en la data para el radar
        if (examples && examples.length > 0) {
            data.examples = examples;
        }

        res.json({ success: true, data });

    } catch (err) {
        console.error('Error fetching real-time trends:', err);
        
        // Fallback realista en caso de error o límite de cuota
        const fallbackData = {
           network,
           niche: filter,
           hashtags: ["#Tendencia", "#Negocios", "#Crecimiento", "#Innovación", "#Estrategia"],
           hooks: [
             "3 Estrategias que cambiarán tu rumbo...",
             "El secreto que las agencias ocultan...",
             "No cometas este error crítico de ventas..."
           ]
        };
        res.json({ success: true, data: fallbackData, isFallback: true });
    }
};

export const analyzeTrendVideo = async (req, res) => {
    const { url, title } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Se requiere una URL' });

    try {
        let videoContext = `Título: ${title || 'Video Viral'}\nURL: ${url}`;
        
        // 1. Intentar extraer transcripción con EXA
        if (process.env.EXA_API_KEY) {
            try {
                const exaRes = await fetch('https://api.exa.ai/contents', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': process.env.EXA_API_KEY
                    },
                    body: JSON.stringify({
                        ids: [url],
                        text: { maxCharacters: 3000 }
                    })
                });
                const exaData = await exaRes.json();
                if (exaData.results && exaData.results.length > 0 && exaData.results[0].text) {
                    videoContext += `\n\nContenido/Transcripción del video extraída:\n${exaData.results[0].text}`;
                }
            } catch(e) {
                console.warn(`[Trends Analyze] ⚠️ Fallo EXA /contents, usando solo título y url.`, e.message);
            }
        }

        // 2. Usar LLM para crear el guion estructurado
        const systemPrompt = `Eres el Director Creativo de Godzilla Consulting. Tu misión es hacer "Ingeniería Inversa" de este video viral y crear un guion MEJORADO de 5 escenas para TikTok/Reels basado en su contenido/estructura.

CONTENIDO DEL VIDEO VIRAL ORIGINAL:
${videoContext}

REGLAS ESTRICTAS DE STORYTELLING:
1. NARRATIVA CONTINUA: El video es una sola historia/explicación dividida en 5 partes. PROHIBIDO REPETIR la misma idea en múltiples escenas. Cada escena debe avanzar la idea de la anterior.
2. ESTRUCTURA (Si el original es lista/enumerado, adáptalo, pero mantén el flujo):
   - Escena 1 (GANCHO): Llama la atención agresivamente en los primeros 3 segundos.
   - Escena 2 (RETENCIÓN/PROBLEMA): Plantea el dolor o el misterio.
   - Escena 3 (VALOR/DESARROLLO): Da el consejo, solución o dato revelador.
   - Escena 4 (CLÍMAX): El remate o la conclusión más fuerte.
   - Escena 5 (CTA): Llamado a la acción rápido interactivo.
3. MEMORIA TEMPORAL Y ACTUALIDAD: Hoy es ${new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}.
4. PROHIBICIÓN DE SITIO WEB EN CTA: Nunca menciones URLs o dominios.

Responde ÚNICAMENTE con un JSON válido con este formato:
{
  "title": "Título sugerido para la tarea",
  "scenes": [
    { "visual": "hyper-detailed english prompt for image generation", "narration": "Texto fluido en español (sin repetir escenas anteriores)" }
  ]
} (Exactamente 5 escenas)`;

        const aiRes = await executeAiWaterfall([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Genera el JSON de 5 escenas ahora.' }
        ], { jsonMode: true, mode: 'premium' });

        let responseText = aiRes.content || '';
        if (responseText.startsWith('```json')) responseText = responseText.replace(/```json\n?/, '').replace(/```$/, '');
        else if (responseText.startsWith('```')) responseText = responseText.replace(/```\n?/, '').replace(/```$/, '');
        
        const parsed = JSON.parse(responseText.trim());
        
        // 3. Crear tarea en el Planificador (CEO Studio)
        let readableScript = `🎥 GUION BASADO EN VIDEO VIRAL:\n🔗 URL Original: ${url}\n\n`;
        parsed.scenes.forEach((s, i) => {
            readableScript += `Escena ${i+1}:\n🎤 Voz: ${s.narration}\n👁️ Visual: ${s.visual}\n\n`;
        });
        
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, created_by) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [`🔥 ANALIZADO: ${parsed.title || title || 'Trend Viral'}`, readableScript.trim(), 'me', JSON.stringify(['Trend Analizado']), 'alta', 'pending', 'video', 'trends_bot']
            );
        } finally {
            client.release();
        }

        res.json({ success: true, message: 'Analizado y enviado al planificador', script: parsed });
    } catch (err) {
        console.error('Error analizando video trend:', err);
        res.status(500).json({ success: false, error: 'Error analizando el video: ' + err.message });
    }
};
