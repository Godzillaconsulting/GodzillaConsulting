import { chatTools, SYSTEM_PROMPT, withTimeout } from '../config/zilla-prompt.js';
import { GOYI_SYSTEM_PROMPT, goyiChatTools } from '../config/goyi-prompt.js';
import pool from '../config/db.js';
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { GoogleGenerativeAI } from '@google/generative-ai';

export const processChatMessage = async (req, res) => {
    const { messages, isGoyi, lang } = req.body;
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    try {
        let finalGoyiPrompt = GOYI_SYSTEM_PROMPT;
        let currentUser = "Desconocido";
        
        if (isGoyi) {
            if (req.headers.authorization) {
                const token = req.headers.authorization.split(' ')[1];
                try {
                    const decoded = verify(token, process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#');
                    currentUser = `${decoded.username || "Desconocido"} (Rol: ${decoded.role || "user"})`;
                } catch(e) {}
            }
            finalGoyiPrompt = `\\n[SISTEMA DE SEGURIDAD]: ESTÁS HABLANDO CON EL USUARIO AUTENTICADO COMO: "${currentUser}". Usa esto para verificar sus permisos de forma estricta.\\n${GOYI_SYSTEM_PROMPT}`;
        }
        
        const langMap = { 'en': 'English', 'es': 'Spanish (Español)', 'pt': 'Portuguese', 'fr': 'French', 'de': 'German', 'it': 'Italian', 'zh': 'Chinese', 'ja': 'Japanese' };
        const detectedLang = lang ? lang.split('-')[0].toLowerCase() : 'es';
        const langName = langMap[detectedLang] || detectedLang;
        const langInstruction = `\\n\\n[IDIOMA OBLIGATORIO]: La interfaz del usuario está en "${langName}". DEBES responder EXCLUSIVAMENTE en ${langName}. Sin excepciones.\\n`;

        const basePrompt = isGoyi ? finalGoyiPrompt : SYSTEM_PROMPT;
        const systemPrompt = basePrompt + langInstruction;
        const tools = isGoyi ? goyiChatTools : chatTools;

        // Formato Gemini
        let history = messages.slice(0, -1)
            .filter(m => (m.text || m.content) && String(m.text || m.content).trim())
            .map(m => ({
                role: (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user',
                parts: [{ text: String(m.text || m.content || ' ').trim() }]
            }));

        const firstUser = history.findIndex(m => m.role === 'user');
        if (firstUser > 0) history = history.slice(firstUser);

        // Goyi Swarm Memory
        if (isGoyi) {
            try {
                const h = await pool.query("SELECT original_prompt, improved_prompt FROM goyi_learning WHERE context_type='goyi_chat' ORDER BY id DESC LIMIT 6");
                const colmena = [];
                for (const row of h.rows.reverse()) {
                    colmena.push({ role: 'user', parts: [{ text: `[Feedback Global de Usuario]: ${row.original_prompt}` }] });
                    colmena.push({ role: 'model', parts: [{ text: row.improved_prompt }] });
                }
                history = [...colmena, ...history];
            } catch (errDb) {
                console.error('[Goyi] Error cargando cerebro:', errDb);
            }
        }

        const lastMsgRaw = messages[messages.length - 1];
        const lastMsg = lastMsgRaw.content || lastMsgRaw.text ? String(lastMsgRaw.content || lastMsgRaw.text) : "Hola";

        const genAI = new GoogleGenerativeAI(apiKey);
        
        let geminiTools = undefined;
        if (tools && tools.length > 0) {
            geminiTools = [{
                functionDeclarations: tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: {
                        type: "OBJECT",
                        properties: Object.fromEntries(
                            Object.entries(t.parameters.properties).map(([k, v]) => [k, typeof v === 'object' ? { type: "STRING", description: v.description } : v])
                        ),
                        ...(t.parameters.required ? { required: t.parameters.required } : {})
                    }
                }))
            }];
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
            ...(geminiTools ? { tools: geminiTools } : {})
        });

        const firstUserIdx = history.findIndex(m => m.role === 'user');
        if (firstUserIdx > 0) history = history.slice(firstUserIdx);

        const chat = model.startChat({ history });

        let chatCompletion = null;
        let responseText = '';
        let functionCalls = [];

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                chatCompletion = await chat.sendMessage(lastMsg);
                if (chatCompletion && chatCompletion.response) {
                    const response = chatCompletion.response;
                    try { responseText = response.text() || ''; } catch(e){}
                    const calls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
                    if (calls && calls.length > 0) {
                        functionCalls = calls;
                    }
                }
                break;
            } catch (error) {
                if (error.message && error.message.includes('429') && attempt < 3) {
                    await new Promise(r => setTimeout(r, 4000 * attempt));
                    continue;
                }
                throw error;
            }
        }

        if (functionCalls.length > 0) {
            const toolCall = functionCalls[0];
            const name = toolCall.name;
            const args = toolCall.args || {};
            
            let resultMessage = "Operación realizada correctamente.";
            try {
                if (name === "check_availability") {
                    const r = await pool.query("SELECT * FROM citas WHERE fecha_reserva = $1 AND hora_reserva = $2", [args.fecha, args.hora]);
                    if (r.rows.length > 0) resultMessage = "El horario está ocupado. Ofrece otra hora.";
                    else resultMessage = "Horario disponible.";
                } else if (name === "save_appointment") {
                    await pool.query(
                        "INSERT INTO citas (nombre_cliente, correo_contacto, telefono_contacto, servicio_interes, fecha_reserva, hora_reserva, notas_adicionales, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pendiente')",
                        [args.nombre, args.correo, args.telefono, args.servicio, args.fecha, args.hora, args.notas]
                    );
                    resultMessage = "Cita agendada con éxito en BD.";
                } else {
                    resultMessage = "Herramienta ejecutada o no soportada.";
                }
            } catch(e) { resultMessage = "Error interno ejecutando la herramienta."; }

            const chatCompletion2 = await chat.sendMessage([{
                functionResponse: { name: name, response: { status: resultMessage } }
            }]);
            
            if (chatCompletion2 && chatCompletion2.response) {
                try { responseText = chatCompletion2.response.text() || responseText; } catch(e){}
            }
        }

        res.json({ reply: responseText });
    } catch (e) {
        console.error("❌ Error en chatController procesando Gemini", e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
