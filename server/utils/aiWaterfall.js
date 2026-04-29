import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch'; // O usar fetch nativo si es Node 18+

/**
 * MOTOR DE CASCADA IA (WATERFALL ENGINE)
 * Diseñado para integrarse como "Nodo de Acción" en el Godzilla Automation Engine.
 * 
 * Nivel 1 (con tools): Groq → Cerebras → SambaNova → Ollama → Gemini → Pollinations
 * Nivel 1 (sin tools):  SambaNova → Cerebras → Pollinations → Gemini → Ollama → Groq
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

    // ── SANITIZADOR ──────────────────────────────────────────────────────────
    // Convierte mensajes con role:'tool' y tool_calls al formato texto plano
    // que proveedores no-OpenAI (SambaNova, Pollinations, Gemini) pueden procesar.
    // CRÍTICO: Llamar SIEMPRE antes de enviar a proveedores sin soporte de tool calls.
    const sanitizeForBasicProviders = (msgs) => msgs
        .filter(m => m.role !== 'tool') // Eliminar mensajes de resultado de tool
        .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
            content: typeof m.content === 'string' && m.content
                ? m.content
                : (m.tool_calls
                    ? `[Acción ejecutada: ${m.tool_calls.map(tc => tc.function?.name).join(', ')}]`
                    : (m.content ? JSON.stringify(m.content) : '[procesando...]'))
        }));

    // --- Definición de Proveedores Aislados ---

    const callGroq = async () => {
        if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: GROQ (Llama 3.3 70B)`);
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const reqData = {
            messages: messages, // Groq soporta tool messages nativamente — NO sanitizar
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
            messages: messages, // SambaNova soporta tool_calls y role: tool nativamente
            model: "Meta-Llama-3.3-70B-Instruct",
            temperature: temperature
        };
        if (hasTools) reqData.tools = tools;
        if (jsonMode) reqData.response_format = { type: "json_object" };

        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const data = await response.json();
        const responseMessage = data.choices[0]?.message;
        if (!responseMessage) throw new Error("SambaNova devolvió respuesta vacía");
        console.log(`[WATERFALL] ✅ Éxito con SambaNova.`);
        return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
    };

    const callCerebras = async () => {
        if (!process.env.CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: CEREBRAS (Llama 3.1 8B)`);

        // Cerebras soporta tools pero NO role:'tool'. Si hay tool history, sanitizar.
        const hasTool_msgs = messages.some(m => m.role === 'tool');
        const reqData = {
            messages: hasTool_msgs ? sanitizeForBasicProviders(messages) : messages,
            model: "llama3.1-8b",
            temperature: temperature,
            max_tokens: maxTokens
        };

        // Solo inyectar tools si NO hay historial de tool results (causa conflicto)
        if (hasTools && !hasTool_msgs) {
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
        if (!responseMessage) throw new Error("Cerebras devolvió respuesta vacía");
        console.log(`[WATERFALL] ✅ Éxito con Cerebras.`);
        return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
    };

    const callOllama = async () => {
        console.log(`[WATERFALL] ➡️ Intentando: OLLAMA LOCAL`);
        const reqData = {
            messages: sanitizeForBasicProviders(messages), // Ollama no soporta role:'tool'
            model: "llama3",
            temperature: temperature,
            stream: false
        };

        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const responseMessage = data.message;
        if (!responseMessage) throw new Error("Ollama devolvió respuesta vacía");
        console.log(`[WATERFALL] ✅ Éxito con Ollama Local.`);
        return { content: responseMessage.content || "", tool_calls: [] };
    };

    const callGemini = async () => {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");
        console.log(`[WATERFALL] ➡️ Intentando: GEMINI (Fallback)`);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });

        // Sanitizar Y filtrar mensajes con content nulo (tool_call assistant msgs)
        const sanitized = sanitizeForBasicProviders(messages);
        const userPrompt = sanitized
            .filter(m => m.role !== 'system' && m.content)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');
        
        const result = await model.generateContent(userPrompt);
        console.log(`[WATERFALL] ✅ Éxito con Gemini.`);
        return { content: result.response.text(), tool_calls: [] };
    };

    const callPollinations = async () => {
        console.log(`[WATERFALL] ➡️ Intentando: POLLINATIONS (Mistral Fallback)`);
        // Pollinations tampoco soporta role:'tool' — usar sanitizador
        const cleanMessages = sanitizeForBasicProviders(messages);

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: cleanMessages, model: 'mistral', jsonMode: jsonMode }),
            signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!json?.choices?.[0]?.message?.content) throw new Error("Pollinations devolvió respuesta vacía");
        console.log(`[WATERFALL] ✅ Éxito con Pollinations.`);
        return { content: json.choices[0].message.content, tool_calls: [] };
    };

    // --- LÓGICA DE ENRUTAMIENTO ---
    let activeWaterfall = [];

    if (hasTools) {
        // Con tools: Groq primero (único con soporte completo de function calling)
        console.log(`[WATERFALL] 🔧 Petición con Tools. Groq primario...`);
        activeWaterfall = [callSambaNova, callGroq, callCerebras, callOllama, callGemini, callPollinations];
    } else {
        // Sin tools: Groq va ÚLTIMO para preservar cuota diaria (100k tokens/día).
        console.log(`[WATERFALL] ⚖️ Texto libre — priorizando proveedores sin cuota...`);
        activeWaterfall = [callSambaNova, callCerebras, callPollinations, callGemini, callOllama, callGroq];
    }

    // --- EJECUCIÓN CASCADA ---
    for (const provider of activeWaterfall) {
        try {
            const result = await provider();
            
            // 🛡️ ANTI-ALUCINACIÓN GLOBAL: Si el modelo devuelve su propio System Prompt, lo silenciamos
            if (result.content && (result.content.includes("Posicionamiento Social") || result.content.includes("*Reglas de Comportamiento*") || result.content.includes("Protocolo de Agendamiento"))) {
                console.warn("[WATERFALL] ⚠️ El modelo alucinó devolviendo el System Prompt. Filtrando respuesta.");
                result.content = "Dame un momento para organizar esta información... ⏳";
            }
            
            return result;
        } catch (e) {
            console.error(`[WATERFALL] ⚠️ Proveedor falló (${e.message}). Saltando al siguiente en la cascada...`);
            if (e.status === 429 || (e.message && e.message.includes('429'))) {
                console.error(`[WATERFALL] 🛑 RATE LIMIT ALCANZADO (429). Ejecutando Evasión...`);
            }
        }
    }

    // Si llegamos aquí, TODOS fallaron. Retornar mensaje de error en lugar de lanzar excepción
    // para que el bot diga algo en vez de crashear.
    console.error(`[WATERFALL] 💀 TODOS LOS PROVEEDORES FALLARON. Retornando mensaje de emergencia.`);
    return { 
        content: "Estoy experimentando alta demanda en este momento. Por favor intenta de nuevo en un minuto. 🙏", 
        tool_calls: [] 
    };
}

