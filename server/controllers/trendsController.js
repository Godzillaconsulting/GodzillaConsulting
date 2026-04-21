import { GoogleGenerativeAI } from '@google/generative-ai';

export const getTrends = async (req, res) => {
    const { network = 'General', filter = 'B2B Tech' } = req.query;
    
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no configurada en el servidor. Activando Fallback.');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Actúa como un experto Director de Marketing Analítico.
Necesitamos los Hashtags y Hooks (ganchos de video/copy) más en tendencia HOY MISMO para la red social: "${network}", dentro del nicho: "${filter}".
Asegúrate de basarte en el ecosistema real de hoy. Eres una API, devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta, sin backticks ni bloques de código:

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

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // Limpiar backticks si el modelo los retorna
        if (responseText.startsWith('\`\`\`json')) {
            responseText = responseText.replace(/\`\`\`json\n?/, '').replace(/\`\`\`$/, '');
        } else if (responseText.startsWith('\`\`\`')) {
            responseText = responseText.replace(/\`\`\`\n?/, '').replace(/\`\`\`$/, '');
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
