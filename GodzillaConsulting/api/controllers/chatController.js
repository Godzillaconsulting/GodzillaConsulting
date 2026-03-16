import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from "../services/calendarService.js";
import { SYSTEM_PROMPT, chatTools, withTimeout } from "../config/zilla-prompt.js";

export const processChatMessage = async (req, res) => {
    const { messages } = req.body;
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: chatTools }]
        });

        let rawHistory = messages.slice(0, -1).map(m => ({
            role: m.role === "assistant" || m.role === "model" ? "model" : "user",
            parts: [{ text: m.content || m.text }]
        }));

        let history = [];
        for (const msg of rawHistory) {
            if (history.length > 0 && history[history.length - 1].role === msg.role) {
                history[history.length - 1].parts[0].text += `\n[Mensaje adicional]: ${msg.parts[0].text}`;
            } else {
                history.push(msg);
            }
        }

        while (history.length > 0 && history[0].role !== "user") history.shift();

        if (history.length > 0 && history[history.length - 1].role === "user") {
            history.push({ role: "model", parts: [{ text: "(Esperando respuesta...)" }] });
        }

        const chat = model.startChat({ history });
        const lastMsg = messages[messages.length - 1].content || messages[messages.length - 1].text;

        let result = await withTimeout(
            chat.sendMessage(lastMsg),
            "Lo siento, mi conexión tuvo un pequeño imprevisto. ¿Podrías repetir tu mensaje?"
        );
        let responseText = result.response.text();

        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === "check_availability") {
                    const { fecha, hora } = call.args;
                    
                    // Guardián de Horario y Días
                    const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
                    const isSunday = dateObj.getDay() === 0;
                    const hourInt = parseInt(hora.split(':')[0], 10);
                    
                    if (isSunday) {
                        fRes = { disponible: false, razon: "Los domingos no laboramos. Por favor solicita otro día." };
                        console.log(`[Web Guardián] Rechazo: Domingo para ${fecha} a las ${hora}`);
                    } else if (hourInt < 9 || hourInt >= 19) {
                        fRes = { disponible: false, razon: "Fuera de horario de oficina (9am a 7pm). Por favor solicita otra hora." };
                        console.log(`[Web Guardián] Rechazo: Fuera de Horario para ${fecha} a las ${hora}`);
                    } else {
                        // Guardián Anti-Empalme Multi-Tabla
                        const query = `
                            SELECT SUM(c) as total FROM (
                                SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                                UNION ALL
                                SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                UNION ALL
                                SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                            ) as sum_tables
                        `;
                        const r = await pool.query(query, [fecha, hora]);
                        const isBusy = parseInt(r.rows[0].total) > 0;
                        fRes = { disponible: !isBusy, razon: isBusy ? "Ese horario ya está ocupado. Intenta con otra hora." : "Horario disponible" };
                        console.log(`[Web Tool] Disponibilidad multi-tabla para ${fecha} a las ${hora}: ${fRes.disponible}`);
                    }
                } else if (call.name === "save_appointment") {
                    try {
                        const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                        
                        // Candado Final (Por si Gemini intentó puentear el check_availability)
                        const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
                        const isSunday = dateObj.getDay() === 0;
                        const hourInt = parseInt(hora.split(':')[0], 10);

                        if (isSunday || hourInt < 9 || hourInt >= 19) {
                             console.warn(`⚠️ [Web Cita Rechazada por Guardián Final]: ${fecha} ${hora}`);
                             fRes = { success: false, error: "Intento de agendar fuera de horario o en domingo. Pide otra fecha/hora al cliente." };
                        } else {
                            const queryConflict = `
                                SELECT SUM(c) as total FROM (
                                    SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                ) as sum_tables
                            `;
                            const conflictCheck = await pool.query(queryConflict, [fecha, hora]);
                            if (parseInt(conflictCheck.rows[0].total) > 0) {
                                 console.warn(`⚠️ [Web Cita Rechazada] Intento de agendar en horario ocupado: ${fecha} ${hora}`);
                                 fRes = { success: false, error: "Ese horario acaba de ser ocupado. Por favor pídele al cliente que elija otra hora." };
                            } else {
                                const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                                try {
                                    // 1. Intentar agendar en Google Calendar PRIMERO
                                    const calendarId = await agendarEnGoogleCalendar(datosCita);
                                    
                                    // 2. Si Google Calendar tiene éxito, guardamos en la base de datos Web (citas)
                                    const r = await pool.query(
                                        "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_id) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8) RETURNING id",
                                        [nombre, correo, telefono, servicio, fecha, hora, notas, calendarId]
                                    );
                                    
                                    fRes = { success: true, id: r.rows[0].id, alert: "Guardado en DB y Calendar." };
                                    
                                    console.log(`[Web Tool] Cita guardada con éxito en BD y Calendar (ID: ${r.rows[0].id})`);
                                } catch (calErr) {
                                    console.error("❌ Fallo Google Calendar Web (NO se guardó en DB):", calErr.message);
                                    // 3. Si falla, obligar a Gemini a pedirle al usuario otra hora.
                                    fRes = { success: false, error: "El sistema de agendas de Google rechazó el horario o los datos (" + calErr.message + "). Por favor indícale al cliente que intente nuevamente o elija otro horario." };
                                }
                            }
                        }
                    } catch (appErr) {
                        console.error("❌ Error al agendar cita en Web Chat:", appErr);
                        fRes = { success: false, error: "Hubo un pequeño problema técnico procesando la cita, pero ya estoy notificando al equipo de Godzilla Consulting. Por favor intenta de nuevo más tarde." };
                    }
                } else if (call.name === "cancel_appointment") {
                    const { identificador } = call.args;
                    try {
                        const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE (telefono = $1 OR email = $1) AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [identificador]);
                        if (result.rows.length === 0) {
                            fRes = { success: false, error: "No encontré ninguna cita activa con ese número de teléfono o correo." };
                        } else {
                            const cita = result.rows[0];
                            if (cita.google_calendar_id) {
                                await cancelarEnGoogleCalendar(cita.google_calendar_id);
                            }
                            await pool.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita.id]);
                            fRes = { success: true, message: "Cita cancelada correctamente." };
                            console.log(`[Web Tool] Cita ${cita.id} cancelada exitosamente.`);
                        }
                    } catch (err) {
                        console.error("❌ Error cancelando:", err);
                        fRes = { success: false, error: "Error interno procesando cancelación." };
                    }
                } else if (call.name === "reschedule_appointment") {
                    const { identificador, nueva_fecha, nueva_hora } = call.args;
                    try {
                        const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE (telefono = $1 OR email = $1) AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [identificador]);
                        if (result.rows.length === 0) {
                            fRes = { success: false, error: "No encontré ninguna cita activa previa con ese número de teléfono o correo." };
                        } else {
                            const cita = result.rows[0];
                            
                            // Verificar empalme para la nueva hora
                            const queryConflict = `
                                SELECT SUM(c) as total FROM (
                                    SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                ) as sum_tables
                            `;
                            const conflictCheck = await pool.query(queryConflict, [nueva_fecha, nueva_hora]);
                            
                            if (parseInt(conflictCheck.rows[0].total) > 0) {
                                fRes = { success: false, error: "Ese nuevo horario está ocupado. Intenta con otra fecha/hora." };
                            } else {
                                if (cita.google_calendar_id) {
                                    await actualizarEnGoogleCalendar(cita.google_calendar_id, nueva_fecha, nueva_hora);
                                }
                                await pool.query("UPDATE citas SET fecha = $1, hora = $2 WHERE id = $3", [nueva_fecha, nueva_hora, cita.id]);
                                fRes = { success: true, message: "Cita reagendada exitosamente." };
                                console.log(`[Web Tool] Cita ${cita.id} reagendada exitosamente.`);
                            }
                        }
                    } catch (err) {
                        console.error("❌ Error reagendando:", err);
                        fRes = { success: false, error: "Error técnico reagendando, intenta de nuevo más tarde." };
                    }
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                }
                result = await withTimeout(
                    chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]),
                    "Disculpa, estaba registrando tu cita pero mi servidor no respondió. ¿Continuamos desde donde quedamos?"
                );
                responseText = result.response.text();
            }
        }
        res.status(200).json({ reply: responseText });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
