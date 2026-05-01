import { chatTools, SYSTEM_PROMPT, withTimeout } from '../config/zilla-prompt.js';
import { GOYI_SYSTEM_PROMPT, goyiChatTools } from '../config/goyi-prompt.js';
import pool from '../config/db.js';
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { executeAiWaterfall } from '../utils/aiWaterfall.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar } from '../services/calendarService.js';
import { validateBusinessHours } from '../utils/businessHours.js';

export const processChatMessage = async (req, res) => {
    const { messages, isGoyi, lang } = req.body;

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

        
        const hoyStr = new Date().toLocaleString('es-MX', {timeZone: 'America/Denver'});
        const systemPromptContexto = `\n\n[CONTEXTO TEMPORAL CRÍTICO]: HOY ES ${hoyStr}. NO USES JAMÁS FECHAS DEL PASADO.`;
        const basePrompt = (isGoyi ? finalGoyiPrompt : SYSTEM_PROMPT) + systemPromptContexto;
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

        const GREETING_REGEX = /^(hola|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|buenas|hey|hi|hello|buen\s+d[ií]a|qu[eé]\s+tal|saludos|qué\s+onda|q\s+onda|good\s+morning|good\s+afternoon|good\s+evening|sup|howdy|yo)[!¡.,\s]*$/i;
        const isGreetingOnly = GREETING_REGEX.test(lastMsg.trim());

        let waterfallMessages = [{ role: "system", content: systemPrompt }];
        for (const msg of history) {
            waterfallMessages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.parts[0].text
            });
        }
        waterfallMessages.push({ role: "user", content: lastMsg });

        let waterfallTools = undefined;
        // Solo inyectar herramientas si no es un simple saludo, igual que en WA
        if (!isGreetingOnly && tools && tools.length > 0) {
            waterfallTools = tools.map(t => ({
                type: "function",
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            }));
        }

        let responseText = '';
        let functionCalls = [];

        try {
            const aiRes = await executeAiWaterfall(waterfallMessages, {
                tools: waterfallTools,
                temperature: isGreetingOnly ? 0.5 : 0.1,
                maxTokens: isGreetingOnly ? 256 : 768,
                mode: 'gemini_exclusive'
            });

            responseText = aiRes.content || '';
            
            if (aiRes.tool_calls && aiRes.tool_calls.length > 0) {
                // Agregar el call original al historial para que Llama/OpenAI no se queje
                waterfallMessages.push({
                    role: 'assistant',
                    content: aiRes.content || '',
                    tool_calls: aiRes.tool_calls
                });
                
                functionCalls = aiRes.tool_calls.map(tc => {
                    let parsedArgs = {};
                    try { parsedArgs = JSON.parse(tc.function.arguments); } catch(e){}
                    return {
                        name: tc.function.name,
                        args: parsedArgs,
                        id: tc.id
                    };
                });
            }
        } catch (error) {
             throw error;
        }

        if (functionCalls.length > 0) {
            for (const toolCall of functionCalls) {
                const name = toolCall.name;
                const args = toolCall.args || {};
                
                let resultMessage = "Operación realizada correctamente.";
                try {
                    if (name === "check_availability") {
                        const { fecha, hora } = args;
                        
                        // Anti-hallucination guard
                        if (!fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                            resultMessage = "Error: Faltan parámetros reales. DEBES preguntarle al usuario para qué fecha y hora quiere agendar ANTES de revisar disponibilidad.";
                        } else {
                            const errorValidacion = validateBusinessHours(fecha, hora);

                            if (errorValidacion) {
                                resultMessage = `Error: La fecha/hora solicitada es inválida o está fuera de horario de atención: ${errorValidacion}. Dile al usuario que elija otro horario.`;
                            } else {
                                const query = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                                const r = await pool.query(query, [fecha, hora]);
                                if (parseInt(r.rows[0].total) > 0) resultMessage = "El horario está ocupado (hay otra cita a menos de 1 hora de diferencia). Ofrece otra hora.";
                                else resultMessage = "Horario disponible.";
                            }
                        }
                    } else if (name === "save_appointment") {
                        const { nombre, correo, telefono, servicio, fecha, hora, notas } = args;
                        
                        // Anti-hallucination guard
                        if (!nombre || !fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                            resultMessage = "Error: Faltan datos obligatorios o son marcadores de posición. Pídele al usuario todos los datos faltantes.";
                        } else {
                            const errorValidacion = validateBusinessHours(fecha, hora);

                            if (errorValidacion) {
                                resultMessage = errorValidacion;
                            } else {
                            const queryConflict = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                            const conflictCheck = await pool.query(queryConflict, [fecha, hora]);
                            
                            if (parseInt(conflictCheck.rows[0].total) > 0) {
                                resultMessage = "Error: Ese horario ya está ocupado.";
                            } else {
                                let calendarId = null;
                                try {
                                    const gRes = await agendarEnGoogleCalendar({
                                        nombre: nombre,
                                        correo: correo || 'sin-correo@portal.com',
                                        telefono: telefono,
                                        servicio: servicio,
                                        fecha: fecha,
                                        hora: hora,
                                        notas: notas || ''
                                    });
                                    calendarId = gRes.id;
                                    
                                    await pool.query(
                                        "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_id, origen) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmada', $8, 'portal')",
                                        [nombre, correo || 'sin-correo@portal.com', telefono, servicio, fecha, hora, notas || '', calendarId]
                                    );
                                    resultMessage = "Cita agendada con éxito en BD y Calendar.";
                                } catch (err) {
                                    console.error('Error al agendar cita en portal: ', err);
                                    if (calendarId) {
                                        await cancelarEnGoogleCalendar(calendarId).catch(rollbackErr => console.error('Fallo en Rollback Calendar:', rollbackErr.message));
                                    }
                                    resultMessage = "Hubo un error agendando la cita: " + err.message;
                                }
                            }
                        }
                        }
                    } else {
                        resultMessage = "Herramienta ejecutada o no soportada.";
                    }
                } catch(e) { resultMessage = "Error interno ejecutando la herramienta: " + e.message; }

                waterfallMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: name,
                    content: JSON.stringify({ status: resultMessage })
                });
            }

            try {
                const aiRes2 = await executeAiWaterfall(waterfallMessages, {
                    tools: waterfallTools,
                    temperature: 0.1,
                    maxTokens: 512,
                    mode: 'gemini_exclusive'
                });
                
                if (aiRes2 && aiRes2.content) {
                    responseText = aiRes2.content;
                }
            } catch(e) {
                console.error("Error en segunda llamada de Cascada (chatController):", e.message);
            }
        }

        // ⏱️ DELAY HUMANO: Esperar ~8 segundos para simular tiempo de redacción
        const humanDelay = Math.floor(Math.random() * 2000) + 7000;
        console.log(`[Web Chat] ⏱️ Esperando ${humanDelay}ms antes de responder...`);
        await new Promise(r => setTimeout(r, humanDelay));

        res.json({ reply: responseText });
    } catch (e) {
        console.error("❌ Error en chatController procesando Gemini", e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
