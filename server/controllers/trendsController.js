import { executeAiWaterfall } from '../utils/aiWaterfall.js';

export const getTrends = async (req, res) => {
    const { network = 'General', filter = 'B2B Tech' } = req.query;
    
    try {

        // FASE 1: Buscar datos reales (Exa Search o LLM Gratuito)
        let rawTrends = '';
        
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
                        query: `Tendencias virales actuales, noticias recientes y contenido viral en ${network} sobre ${filter}`,
                        useAutoprompt: true,
                        numResults: 5,
                        contents: { text: { maxCharacters: 1000 } }
                    })
                });
                const exaData = await exaRes.json();
                if (exaData.results && exaData.results.length > 0) {
                    rawTrends = exaData.results.map(r => `TITULO: ${r.title}\nURL: ${r.url}\nTEXTO: ${r.text}\n---\n`).join('');
                    console.log(`[Trends] ✅ Fase 1 completada - datos crudos obtenidos de EXA SEARCH.`);
                }
            } catch(e) {
                console.warn(`[Trends] ⚠️ Fallo Búsqueda Exa, usando LLM Fallback.`, e.message);
            }
        }

        if (!rawTrends) {
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

Tu trabajo es MEJORARLAS y devolverlas ÚNICAMENTE como objeto JSON sin backticks:

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
