import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch'; // O usar fetch nativo si es Node 18+

/**
 * MOTOR DE CASCADA IA (WATERFALL ENGINE)
 * Diseñado para integrarse como "Nodo de Acción" en el Godzilla Automation Engine.
 * 
 * Nivel 1: Groq (Llama 3 70B) - Ultra rápido, soporta tools.
 * Nivel 2: Cerebras (Llama 3.3 70B)
 * Nivel 3: SambaNova (Meta-Llama-3.1-70B-Instruct)
 * Nivel 4: Gemini 2.5 - Suspendido temporalmente.
 * Nivel 5: Ollama (Open Source Local)
 * Nivel 6: Pollinations (Mistral) - Supervivencia Open Source.
 */
export async function executeAiWaterfall(messages, options = {}) {
    const { 
        tools = null, 
        temperature = 0.4, 
        jsonMode = false,
        maxTokens = 2048 
    } = options;

    console.log(`[WATERFALL] 🌊 Iniciando Cascada de Generación IA...`);
    
    // Extraer system prompt de los mensajes
    const systemMsg = messages.find(m => m.role === 'system');
    const systemInstruction = systemMsg ? systemMsg.content : "Eres un asistente útil.";
    
    const hasTools = tools && tools.length > 0;

    // Sanitizador: convierte mensajes con role:'tool' y tool_calls al formato texto plano
    // que proveedores no-OpenAI (SambaNova, Pollinations, Gemini) pueden procesar.
    const sanitizeForBasicProviders = (msgs) => msgs
        .filter(m => m.role !== 'tool') // Eliminar resultados de tool calls
        .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
            content: typeof m.content === 'string'
                ? m.content
                : (m.tool_calls
                    ? `[Acción ejecutada: ${m.tool_calls.map(tc => tc.function?.name).join(', ')}]`
                    : JSON.stringify(m.content))
        }));

    // --- Definición de Proveedores Aislados ---

    const callGroq = async () => {
        if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: GROQ (Llama 3.3 70B)`);
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const reqData = {
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: temperature,
            max_tokens: Math.min(maxTokens, 800) // Conservar cuota diaria (100k tokens/día)
        };

        if (hasTools) {
            reqData.tools = tools;
            reqData.tool_choice = "auto";
        }

        const completion = await groq.chat.completions.create(reqData);
        const responseMessage = completion.choices[0]?.message;
        console.log(`[WATERFALL] ✅ Éxito con Groq.`);
        return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
    };

    const callSambaNova = async () => {
        if (!process.env.SAMBANOVA_API_KEY) throw new Error("SAMBANOVA_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: SAMBANOVA (Llama 3.3 70B)`);
        const reqData = {
            messages: sanitizeForBasicProviders(messages), // Limpiar tool messages
            model: "Meta-Llama-3.3-70B-Instruct",
            temperature: temperature
        };

        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const data = await response.json();
        const responseMessage = data.choices[0]?.message;
        console.log(`[WATERFALL] ✅ Éxito con SambaNova.`);
        return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
    };

    const callCerebras = async () => {
        if (!process.env.CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: CEREBRAS (Llama 3.1 8B)`);
        const reqData = {
            messages: sanitizeForBasicProviders(messages), // Limpiar tool messages
            model: "llama3.1-8b",
            temperature: temperature,
            max_tokens: maxTokens
        };

        if (hasTools) {
            reqData.tools = tools;
            reqData.tool_choice = "auto";
        }

        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const data = await response.json();
        const responseMessage = data.choices[0]?.message;
        console.log(`[WATERFALL] ✅ Éxito con Cerebras.`);
        return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
    };

    const callOllama = async () => {
        console.log(`[WATERFALL] ➡️ Intentando: OLLAMA LOCAL`);
        const reqData = {
            messages: messages,
            model: "llama3",
            temperature: temperature,
            stream: false
        };
        if (hasTools) reqData.tools = tools;

        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const responseMessage = data.message;
        console.log(`[WATERFALL] ✅ Éxito con Ollama Local.`);
        return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
    };

    const callGemini = async () => {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: GEMINI (Fallback)`);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
        const userPrompt = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n');
        
        const result = await model.generateContent(userPrompt);
        console.log(`[WATERFALL] ✅ Éxito con Gemini.`);
        return { content: result.response.text(), tool_calls: [] };
    };

    const callPollinations = async () => {
        console.log(`[WATERFALL] ➡️ Intentando: POLLINATIONS (Mistral Fallback)`);
        const cleanMessages = messages.map(m => ({
            role: m.role === 'tool' ? 'user' : (m.role === 'assistant' ? 'assistant' : m.role),
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        }));

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: cleanMessages, model: 'mistral', jsonMode: jsonMode }),
            signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        console.log(`[WATERFALL] ✅ Éxito con Pollinations.`);
        return { content: json.choices[0].message.content || "", tool_calls: [] };
    };

    // --- LÓGICA DE ENRUTAMIENTO (SMART LOAD BALANCER) ---
    let activeWaterfall = [];

    if (hasTools) {
        // Con tools: Groq es indispensable (mejor soporte de function calling)
        console.log(`[WATERFALL] 🔧 Petición con Tools. Usando Groq como primario...`);
        activeWaterfall = [callGroq, callCerebras, callSambaNova, callOllama, callGemini, callPollinations];
    } else {
        // Sin tools: Groq va ÚLTIMO para preservar su cuota diaria de 100k tokens.
        // SambaNova y Pollinations son gratuitos y sin cuota diaria.
        console.log(`[WATERFALL] ⚖️ Texto libre — priorizando proveedores sin cuota...`);
        activeWaterfall = [callSambaNova, callCerebras, callPollinations, callGemini, callOllama, callGroq];
    }

    // --- EJECUCIÓN CASCADA ---
    for (const provider of activeWaterfall) {
        try {
            const result = await provider();
            return result;
        } catch (e) {
            console.error(`[WATERFALL] ⚠️ Proveedor falló (${e.message}). Saltando al siguiente en la cascada...`);
            if (e.status === 429 || e.message.includes('429')) {
                console.error(`[WATERFALL] 🛑 RATE LIMIT ALCANZADO (429). Ejecutando Evasión...`);
            }
        }
    }

    throw new Error("TODOS LOS NIVELES DE CASCADA HAN FALLADO (Ningún proveedor disponible).");
}
