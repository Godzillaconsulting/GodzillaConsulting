import { chatTools, SYSTEM_PROMPT, BOOKING_PROMPT, withTimeout } from '../config/zilla-prompt.js';
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
        
        const BOOKING_INTENT_REGEX = /(cita|agendar|horario|disponible|disponibilidad|espacio|reagendar|cancelar|reservar|reserva|consulta)/i;
        const lastMsgRaw = messages[messages.length - 1];
        const lastMsg = lastMsgRaw.content || lastMsgRaw.text ? String(lastMsgRaw.content || lastMsgRaw.text) : "Hola";
        const hasBookingIntent = BOOKING_INTENT_REGEX.test(lastMsg);

        let basePrompt = isGoyi ? finalGoyiPrompt : SYSTEM_PROMPT;
        if (hasBookingIntent && !isGoyi) {
            basePrompt += `\n\n${BOOKING_PROMPT}`;
        }
        basePrompt += systemPromptContexto;
        
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

        // hasBookingIntent evaluated earlier

        let waterfallMessages = [{ role: "system", content: systemPrompt }];
        for (const msg of history) {
            waterfallMessages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.parts[0].text
            });
        }
        waterfallMessages.push({ role: "user", content: lastMsg });

        let waterfallTools = undefined;
        // Solo inyectar herramientas si hay intención de agendar (Booking Intent)
        if (hasBookingIntent && tools && tools.length > 0) {
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

        const aiRes = await executeAiWaterfall(waterfallMessages, {
            tools: waterfallTools,
            temperature: hasBookingIntent ? 0.1 : 0.5,
            maxTokens: hasBookingIntent ? 768 : 384,
            mode: 'auto'
        });

        responseText = aiRes.content || '';
        
        if (aiRes.tool_calls && aiRes.tool_calls.length > 0) {
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

        if (functionCalls.length > 0) {
            for (const toolCall of functionCalls) {
                const name = toolCall.name;
                const args = toolCall.args || {};
                
                let resultMessage = "Operación realizada correctamente.";
                try {
                    if (name === "check_availability") {
                        const { fecha, hora } = args;
                        
                        if (!fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                            resultMessage = "SISTEMA: No ejecutes herramientas sin fecha u hora exacta. Dile al usuario: '¿Para qué fecha y hora te gustaría agendar?'";
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
                        
                        if (!nombre || !fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                            resultMessage = "SISTEMA: Faltan datos obligatorios. Pídele al usuario todos los datos faltantes.";
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
                                        calendarId = gRes?.id || null;
                                        
                                        await pool.query(
                                            "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_id, origen) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmada', $8, 'portal')",
                                            [nombre, correo || 'sin-correo@portal.com', telefono || '', servicio || 'Consultoría Estratégica', fecha, hora, notas || '', calendarId]
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
                    } else if (name === "cancel_appointment") {
                        const { telefono } = args;
                        if (!telefono) {
                            resultMessage = "SISTEMA: Solicita el número de teléfono para buscar y cancelar la cita.";
                        } else {
                            const resCita = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                            if (resCita.rows.length === 0) {
                                resultMessage = "No se encontró ninguna cita confirmada asociada a ese número de teléfono.";
                            } else {
                                const cita = resCita.rows[0];
                                if (cita.google_calendar_id) {
                                    await cancelarEnGoogleCalendar(cita.google_calendar_id).catch(() => {});
                                }
                                await pool.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita.id]);
                                resultMessage = "La cita ha sido cancelada exitosamente en el sistema.";
                            }
                        }
                    } else if (name === "reschedule_appointment") {
                        const { telefono, nueva_fecha, nueva_hora } = args;
                        if (!telefono || !nueva_fecha || !nueva_hora) {
                            resultMessage = "SISTEMA: Faltan datos (teléfono, nueva fecha o nueva hora) para reagendar.";
                        } else {
                            const errorValidacion = validateBusinessHours(nueva_fecha, nueva_hora);
                            if (errorValidacion) {
                                resultMessage = errorValidacion;
                            } else {
                                const resCita = await pool.query("SELECT id, google_calendar_id, nombre_completo, email, tipo_sesion FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                                if (resCita.rows.length === 0) {
                                    resultMessage = "No se encontró una cita activa para ese teléfono.";
                                } else {
                                    const cita = resCita.rows[0];
                                    const dup = await pool.query("SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada' AND id!=$3", [nueva_fecha, nueva_hora, cita.id]);
                                    if (parseInt(dup.rows[0].total) > 0) {
                                        resultMessage = "El nuevo horario solicitado ya está ocupado. Ofrece otra opción.";
                                    } else {
                                        await pool.query("UPDATE citas SET fecha = $1, hora = $2 WHERE id = $3", [nueva_fecha, nueva_hora, cita.id]);
                                        resultMessage = "Cita reagendada exitosamente.";
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
                    mode: 'auto'
                });
                
                if (aiRes2 && aiRes2.content) {
                    responseText = aiRes2.content;
                }
            } catch(e) {
                console.error("Error en segunda llamada de Cascada (chatController):", e.message);
            }
        }

        res.json({ reply: responseText });
    } catch (e) {
        console.error("❌ Error en chatController procesando IA", e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
