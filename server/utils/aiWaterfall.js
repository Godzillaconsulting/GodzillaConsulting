import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch'; // O usar fetch nativo si es Node 18+

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename_wf = fileURLToPath(import.meta.url);
const __dirname_wf = path.dirname(__filename_wf);
dotenv.config({ path: path.join(__dirname_wf, '..', '.env'), override: true });

/**
 * MOTOR DE CASCADA IA (WATERFALL ENGINE) v2 — Godzilla Consulting
 * ─────────────────────────────────────────────────────────────────
 * Filosofía de costos:
 *   - GRATUITOS primero: SambaNova, Cerebras, Pollinations, Groq (cuota diaria gratis)
 *   - PAGADO solo como red de seguridad o para tareas críticas: Gemini 2.5 Flash
 *   - Ollama (local) = fallback de emergencia sin internet
 *
 * Cascadas disponibles:
 *   • withTools    → Groq → SambaNova → Cerebras → Gemini → Pollinations → Ollama
 *   • noTools      → SambaNova → Cerebras → Pollinations → Groq → Gemini → Ollama
 *   • compression  → Cerebras → SambaNova → Groq (modelos rápidos y baratos para resumir)
 *   • premium      → Gemini 2.5 Flash first (para tareas críticas que justifican costo)
 */
class ProviderMutex {
    constructor() { this.queue = []; this.locked = false; }
    async lock() {
        if (!this.locked) { this.locked = true; return; }
        return new Promise(resolve => this.queue.push(resolve));
    }
    release() {
        if (this.queue.length > 0) { const next = this.queue.shift(); next(); }
        else { this.locked = false; }
    }
}
const geminiMutex = new ProviderMutex();
const groqMutex = new ProviderMutex();
const sambaMutex = new ProviderMutex();
const cerebrasMutex = new ProviderMutex();

let geminiLastCallTime = 0;
let groqLastCallTime = 0;
let sambaLastCallTime = 0;
let cerebrasLastCallTime = 0;

const GEMINI_COOLDOWN_MS = 5000; // 5 segundos entre llamadas para evitar 429
const OPENSOURCE_COOLDOWN_MS = 10000; // 10 segundos para Groq/Samba/Cerebras

export async function executeAiWaterfall(messages, options = {}) {
    const {
        tools = null,
        temperature = 0.4,
        jsonMode = false,
        maxTokens = 1024,      // ⬇️ Reducido de 2048 → ahorra tokens pagados
        mode = 'auto',    // 'auto' | 'compression' | 'premium' | 'noTools'
    } = options;

    const hasTools = tools && tools.length > 0;

    // ── SANITIZADOR ──────────────────────────────────────────────────────────
    // Convierte mensajes con role:'tool' y tool_calls al formato texto plano
    // que proveedores no-OpenAI (SambaNova, Pollinations, Gemini) pueden procesar.
    const sanitizeForBasicProviders = (msgs) => msgs
        .filter(m => m.role !== 'tool')
        .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
            content: typeof m.content === 'string' && m.content
                ? m.content
                : (m.tool_calls
                    ? `[Acción ejecutada: ${m.tool_calls.map(tc => tc.function?.name).join(', ')}]`
                    : (m.content ? JSON.stringify(m.content) : '[procesando...]'))
        }));

    // ── TRIM INTELIGENTE DE HISTORIAL ─────────────────────────────────────────
    // Mantener máximo 12 mensajes del historial (excl. system) para no reventar tokens
    const trimMessages = (msgs, maxHistory = 12) => {
        const systemMsgs = msgs.filter(m => m.role === 'system');
        const nonSystem = msgs.filter(m => m.role !== 'system');
        const trimmed = nonSystem.slice(-maxHistory);
        return [...systemMsgs, ...trimmed];
    };

    // Aplicar trim antes de construir las llamadas
    const trimmedMessages = mode === 'compression' ? messages : trimMessages(messages, 12);

    // ── INYECCIÓN GLOBAL DE CONTEXTO TEMPORAL ──
    const hoyStr = new Date().toLocaleString('es-MX', {timeZone: 'America/Denver'});
    const globalTemporalContext = `\n\n[CONTEXTO TEMPORAL CRÍTICO]: HOY ES ${hoyStr}. Toma en cuenta esta fecha real para cualquier planificación, publicación o respuesta.`;

    // Extraer y potenciar system prompt
    const systemMsg = trimmedMessages.find(m => m.role === 'system');
    let systemInstruction = systemMsg ? systemMsg.content : "Eres el cerebro operativo de la empresa.";
    
    // Inyectar el tiempo en la instrucción de Gemini
    systemInstruction += globalTemporalContext;

    // Inyectar el tiempo en la matriz de mensajes para Groq, SambaNova, Cerebras
    if (systemMsg) {
        systemMsg.content += globalTemporalContext;
    } else {
        trimmedMessages.unshift({ role: 'system', content: systemInstruction });
    }

    // --- Definición de Proveedores Aislados ---

    const callGroq = async () => {
        if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada");
        
        await groqMutex.lock();
        try {
            const now = Date.now();
            if (now - groqLastCallTime < OPENSOURCE_COOLDOWN_MS) {
                await new Promise(r => setTimeout(r, OPENSOURCE_COOLDOWN_MS - (now - groqLastCallTime)));
            }
            groqLastCallTime = Date.now();

            console.log(`[WATERFALL] ➡️ Intentando: GROQ (Llama 3.3 70B)`);
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const reqData = {
                messages: trimmedMessages,
                model: "llama-3.3-70b-versatile",
                temperature,
                max_tokens: maxTokens
            };

            if (hasTools && mode !== 'compression') {
                reqData.tools = tools;
                reqData.tool_choice = "auto";
            }
            if (jsonMode) reqData.response_format = { type: "json_object" };

            const completion = await groq.chat.completions.create(reqData, { timeout: 15000 });
            const responseMessage = completion.choices?.[0]?.message;
            if (!responseMessage) throw new Error("Groq devolvió respuesta vacía");
            console.log(`[WATERFALL] ✅ Éxito con Groq.`);
            return { content: responseMessage.content || "", tool_calls: responseMessage.tool_calls || [] };
        } finally {
            groqMutex.release();
        }
    };

    const callSambaNova = async () => {
        if (!process.env.SAMBANOVA_API_KEY) throw new Error("SAMBANOVA_API_KEY no configurada");
        
        await sambaMutex.lock();
        try {
            const now = Date.now();
            if (now - sambaLastCallTime < OPENSOURCE_COOLDOWN_MS) {
                await new Promise(r => setTimeout(r, OPENSOURCE_COOLDOWN_MS - (now - sambaLastCallTime)));
            }
            sambaLastCallTime = Date.now();

            console.log(`[WATERFALL] ➡️ Intentando: SAMBANOVA (Llama 3.3 70B)`);
            const reqData = {
                messages: trimmedMessages,
                model: "Meta-Llama-3.3-70B-Instruct",
                temperature,
                max_tokens: maxTokens
            };
            if (hasTools && mode !== 'compression') reqData.tools = tools;
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
        } finally {
            sambaMutex.release();
        }
    };

    const callCerebras = async () => {
        if (!process.env.CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY no configurada");
        
        await cerebrasMutex.lock();
        try {
            const now = Date.now();
            if (now - cerebrasLastCallTime < OPENSOURCE_COOLDOWN_MS) {
                await new Promise(r => setTimeout(r, OPENSOURCE_COOLDOWN_MS - (now - cerebrasLastCallTime)));
            }
            cerebrasLastCallTime = Date.now();

            console.log(`[WATERFALL] ➡️ Intentando: CEREBRAS (Llama 3.1 8B)`);

            const hasTool_msgs = trimmedMessages.some(m => m.role === 'tool');
            const reqData = {
                messages: hasTool_msgs ? sanitizeForBasicProviders(trimmedMessages) : trimmedMessages,
                model: "llama3.1-8b",
                temperature,
                max_tokens: maxTokens
            };

            if (hasTools && !hasTool_msgs && mode !== 'compression') {
                reqData.tools = tools;
                reqData.tool_choice = "auto";
            }
            if (jsonMode) reqData.response_format = { type: "json_object" };

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
        } finally {
            cerebrasMutex.release();
        }
    };

    const callOllama = async () => {
        console.log(`[WATERFALL] ➡️ Intentando: OLLAMA LOCAL`);
        const reqData = {
            messages: sanitizeForBasicProviders(trimmedMessages),
            model: "llama3",
            temperature,
            stream: false
        };

        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
            signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const responseMessage = data.message;
        if (!responseMessage) throw new Error("Ollama devolvió respuesta vacía");
        console.log(`[WATERFALL] ✅ Éxito con Ollama Local.`);
        return { content: responseMessage.content || "", tool_calls: [] };
    };

    /**
     * Gemini 2.0 Flash — PROVEEDOR PAGADO PREMIUM
     * Solo se activa si los proveedores gratuitos fallaron.
     * Controla maxOutputTokens para evitar facturas inesperadas.
     */
    const callGemini = async () => {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");

        await geminiMutex.lock();
        try {
            const now = Date.now();
            if (now - geminiLastCallTime < GEMINI_COOLDOWN_MS) {
                await new Promise(r => setTimeout(r, GEMINI_COOLDOWN_MS - (now - geminiLastCallTime)));
            }
            geminiLastCallTime = Date.now();

            console.log(`[WATERFALL] ➡️ Intentando: GEMINI 2.0 FLASH (💰 Proveedor Pagado Premium — Limitado y Encolado)`);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const config = {
                model: "gemini-2.0-flash",
                systemInstruction,
                generationConfig: {
                    maxOutputTokens: maxTokens, // 🔓 Sin límite restrictivo por orden del CEO
                    temperature
                }
            };
            
            if (hasTools && mode !== 'compression') {
                const geminiTools = tools.map(t => ({
                    name: t.function.name,
                    description: t.function.description,
                    parameters: t.function.parameters
                }));
                config.tools = [{ functionDeclarations: geminiTools }];
            }

            const model = genAI.getGenerativeModel(config);

            let contents = [];
            let lastRole = null;
            
            trimmedMessages.filter(m => m.role !== 'system').forEach(m => {
                let role = (m.role === 'assistant' || (m.tool_calls && m.tool_calls.length > 0)) ? 'model' : 'user';
                let parts = [];
                
                if (m.tool_calls && m.tool_calls.length > 0) {
                    parts = m.tool_calls.map(tc => {
                        let args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                        return { functionCall: { name: tc.function.name, args: args } };
                    });
                } else if (m.role === 'tool') {
                    let resultData = { result: "ok" };
                    try { resultData = JSON.parse(m.content); } catch(e) { resultData = { result: m.content || "ok" }; }
                    parts = [{
                        functionResponse: {
                            name: m.name || 'unknown_tool',
                            response: resultData
                        }
                    }];
                } else if (m.content) {
                    parts = [{ text: m.content }];
                }
                
                if (parts.length > 0) {
                    if (lastRole === role && contents.length > 0) {
                        contents[contents.length - 1].parts.push(...parts);
                    } else {
                        contents.push({ role, parts });
                    }
                    lastRole = role;
                }
            });
            
            if (contents.length === 0) contents = [{ role: 'user', parts: [{ text: "..." }] }];

            const result = await model.generateContent({ contents });
            const responseMessage = result.response;
            
            const functionCalls = responseMessage.functionCalls();
            let finalContent = "";
            try { finalContent = responseMessage.text(); } catch(e) {}
            
            let finalToolCalls = [];
            if (functionCalls && functionCalls.length > 0) {
                finalToolCalls = functionCalls.map(fc => ({
                    id: `call_${Math.random().toString(36).substring(2, 9)}`,
                    type: 'function',
                    function: {
                        name: fc.name,
                        arguments: JSON.stringify(fc.args)
                    }
                }));
            }
            
            console.log(`[WATERFALL] ✅ Éxito con Gemini 2.0 Flash.`);
            return { content: finalContent, tool_calls: finalToolCalls };
        } finally {
            geminiMutex.release();
        }
    };

const callPollinations = async () => {
    console.log(`[WATERFALL] ➡️ Intentando: POLLINATIONS (Mistral — Fallback Gratuito)`);
    const cleanMessages = sanitizeForBasicProviders(trimmedMessages);

    const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: cleanMessages, model: 'mistral', jsonMode }),
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    if (!json?.choices?.[0]?.message?.content) throw new Error("Pollinations devolvió respuesta vacía");
    console.log(`[WATERFALL] ✅ Éxito con Pollinations.`);
    return { content: json.choices[0].message.content, tool_calls: [] };
};

// ─────────────────────────────────────────────────────────────────────────
// LÓGICA DE ENRUTAMIENTO — Cascadas optimizadas por costo
// ─────────────────────────────────────────────────────────────────────────
let activeWaterfall = [];

if (mode === 'compression') {
    console.log(`[WATERFALL] 📦 Modo COMPRESIÓN — Priorizando Gemini Flash...`);
    activeWaterfall = [callGemini];
} else if (mode === 'gemini_exclusive') {
    console.log(`[WATERFALL] 🤖 Modo CHATBOT - Usando Google (Flash)...`);
    activeWaterfall = [callGemini];
} else if (mode === 'premium') {
    console.log(`[WATERFALL] 🧠 Modo CONTENIDO — Priorizando Gemini Flash, luego Open Source...`);
    activeWaterfall = [callGemini, callGroq, callSambaNova, callCerebras];
} else if (mode === 'noTools') {
    console.log(`[WATERFALL] ➡️ Modo SIN TOOLS - Priorizando Open Source...`);
    activeWaterfall = [callSambaNova, callGroq, callCerebras, callGemini, callOllama];
} else {
    console.log(`[WATERFALL] ➡️ Modo ESTANDAR - Priorizando Gemini Flash...`);
    activeWaterfall = [callGemini, callSambaNova, callGroq, callCerebras, callOllama];
}

// ─────────────────────────────────────────────────────────────────────────
// EJECUCIÓN CASCADA
// ─────────────────────────────────────────────────────────────────────────
for (const provider of activeWaterfall) {
    let retries = 3;
    while (retries > 0) {
        try {
            const result = await provider();

            // 🛡️ ANTI-ALUCINACIÓN GLOBAL: detectar si el modelo devuelve su propio System Prompt
            if (result.content && (
                result.content.includes("Posicionamiento Social") ||
                result.content.includes("*Reglas de Comportamiento*") ||
                result.content.includes("Protocolo de Agendamiento")
            )) {
                console.warn("[WATERFALL] ⚠️ Modelo alucinó devolviendo System Prompt. Filtrando...");
                result.content = "Dame un momento para organizar esta información... ⏳";
            }

            return result;
        } catch (e) {
            const is429 = e.status === 429 || (e.message && e.message.includes('429'));
            if (is429 && retries > 1) {
                console.warn(`[WATERFALL] ⚠️ 429 Too Many Requests. Reintentando en 5 segundos... (Quedan ${retries - 1} intentos)`);
                await new Promise(r => setTimeout(r, 5000));
                retries--;
                continue;
            }
            console.error(`[WATERFALL] ⚠️ Proveedor falló: ${e.message}${is429 ? ' [RATE LIMIT 429]' : ''}. Saltando...`);
            break;
        }
    }
}

// Todos fallaron — mensaje de emergencia, nunca crashear
console.error(`[WATERFALL] 💀 TODOS LOS PROVEEDORES FALLARON. Retornando mensaje de emergencia.`);
return {
    content: "Estoy experimentando alta demanda en este momento. Por favor intenta de nuevo en un minuto. 🙏",
    tool_calls: []
};
}
