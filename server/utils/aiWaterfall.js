import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch'; // O usar fetch nativo si es Node 18+

/**
 * MOTOR DE CASCADA IA (WATERFALL ENGINE)
 * Diseñado para integrarse como "Nodo de Acción" en el Godzilla Automation Engine.
 * 
 * Nivel 1: Groq (Llama 3 70B) - Ultra rápido, soporta tools.
 * Nivel 2: Gemini 2.5 - Fallback corporativo.
 * Nivel 3: Pollinations (Mistral) - Supervivencia Open Source.
 */
export async function executeAiWaterfall(messages, options = {}) {
    const { 
        tools = null, 
        temperature = 0.4, 
        jsonMode = false,
        maxTokens = 2048 
    } = options;

    console.log(`[WATERFALL] 🌊 Iniciando Cascada de Generación IA...`);
    
    // Extraer system prompt de los mensajes (Gemini y Pollinations lo prefieren separado o al inicio)
    const systemMsg = messages.find(m => m.role === 'system');
    const systemInstruction = systemMsg ? systemMsg.content : "Eres un asistente útil.";
    
    // ==========================================
    // NIVEL 1: GROQ (LLAMA 3)
    // ==========================================
    try {
        if (process.env.GROQ_API_KEY) {
            console.log(`[WATERFALL] ➡️ Intentando Nivel 1: GROQ (Llama 3)`);
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            
            const reqData = {
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: temperature,
                max_tokens: maxTokens
            };

            if (tools && tools.length > 0) {
                reqData.tools = tools;
                reqData.tool_choice = "auto";
            }

            const completion = await groq.chat.completions.create(reqData);
            const responseMessage = completion.choices[0]?.message;
            console.log(`[WATERFALL] ✅ Éxito con Groq.`);
            
            // Retorna formato estandarizado
            return {
                content: responseMessage.content || "",
                tool_calls: responseMessage.tool_calls || []
            };
        }
    } catch (e) {
        console.error(`[WATERFALL] ❌ Nivel 1 (Groq) falló:`, e.message);
        if (e.status === 429) console.error("Rate limit hit en Groq.");
    }

    // ==========================================
    // NIVEL 2: GEMINI
    // ==========================================
    try {
        if (process.env.GEMINI_API_KEY) {
            console.log(`[WATERFALL] ➡️ Intentando Nivel 2: GEMINI`);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
            
            // Convertir historial a formato Gemini
            const userPrompt = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n');
            
            const result = await model.generateContent(userPrompt);
            console.log(`[WATERFALL] ✅ Éxito con Gemini.`);
            
            return {
                content: result.response.text(),
                tool_calls: [] // Fallback básico no soporta tools estructurados complejos por ahora
            };
        }
    } catch (e) {
        console.error(`[WATERFALL] ❌ Nivel 2 (Gemini) falló:`, e.message);
    }

    // ==========================================
    // NIVEL 3: POLLINATIONS (OPEN SOURCE)
    // ==========================================
    try {
        console.log(`[WATERFALL] ➡️ Intentando Nivel 3: POLLINATIONS (Open Source Mistral)`);
        
        // Limpiar messages para Pollinations (eliminar tool_calls viejos si vienen en historial)
        const cleanMessages = messages.map(m => ({
            role: m.role === 'tool' ? 'user' : (m.role === 'assistant' ? 'assistant' : m.role),
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        }));

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: cleanMessages,
                model: 'mistral',
                jsonMode: jsonMode
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const json = await response.json();
        console.log(`[WATERFALL] ✅ Éxito con Pollinations.`);
        
        return {
            content: json.choices[0].message.content || "",
            tool_calls: []
        };
    } catch (e) {
        console.error(`[WATERFALL] ❌ Nivel 3 (Pollinations) falló:`, e.message);
        throw new Error("TODOS LOS NIVELES DE CASCADA HAN FALLADO.");
    }
}
