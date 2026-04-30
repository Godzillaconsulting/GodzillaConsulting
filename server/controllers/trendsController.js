import { executeAiWaterfall } from '../utils/aiWaterfall.js';

export const getTrends = async (req, res) => {
    const { network = 'General', filter = 'B2B Tech' } = req.query;
    
    try {

        // FASE 1: IA Gratuita investiga tendencias crudas
        const rawTrendsPrompt = `Dame una lista rápida y cruda de 5-7 hashtags y 3 frases gancho (hooks) que estén funcionando AHORA en ${network} para el nicho "${filter}". Solo texto plano, sin formato, sin JSON.`;
        
        let rawTrends = '';
        try {
            const rawRes = await executeAiWaterfall([
                { role: 'user', content: rawTrendsPrompt }
            ], { mode: 'default' });
            rawTrends = rawRes.content || '';
            console.log(`[Trends] ✅ Fase 1 completada - datos crudos obtenidos.`);
        } catch(e) {
            console.warn(`[Trends] ⚠️ Fallo Fase 1 (gratuita), Gemini hará todo directamente.`);
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
