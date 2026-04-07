import pool from "../config/db.js";
import { agendarEnGoogleCalendar } from "../services/calendarService.js";
import { getGeminiModel } from "../config/geminiGlobal.js";
import { sendCitaConfirmationEmail } from "../services/emailService.js";
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

import { SYSTEM_PROMPT, chatTools } from "../config/zilla-prompt.js";
import { GOYI_SYSTEM_PROMPT, goyiChatTools } from "../config/goyi-prompt.js";

// Helper: extrae datos de cita del texto de la conversación
function extractAppointmentData(fullText) {
    const emailMatch = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = fullText.match(/(?:\+?52)?\s?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/);

    // Intentar extraer nombre con varios patrones
    const namePatterns = [
        /(?:soy|me llamo|mi nombre es)\s+([A-Za-z][A-Za-z\s]{2,35}?)(?=\s*,|\s*correo|\s*email|\s*cel|\s*tel|\s*quiero|$)/i,
        /(?:nombre[:\s]+)([A-Za-z][A-Za-z\s]{2,35}?)(?=,|\.|$)/i,
    ];
    let nombre = null;
    for (const p of namePatterns) {
        const m = fullText.match(p);
        if (m) { nombre = m[1].trim(); break; }
    }

    const servicios = [
        'Automatizacion de Bots', 'Automatización de Bots',
        'Produccion Audiovisual', 'Producción Audiovisual',
        'Embudos de Venta', 'Gestion de Redes', 'Gestión de Redes',
        'SEO', 'CRM'
    ];
    let servicio = 'Consultoría General';
    for (const s of servicios) {
        if (fullText.toLowerCase().includes(s.toLowerCase())) { servicio = s; break; }
    }

    const notasMatch = fullText.match(/(?:notas?[:\s]+)(.{5,120})/i);
    const notas = notasMatch ? notasMatch[1].trim() : 'Sin notas adicionales';

    return {
        nombre,
        correo: emailMatch ? emailMatch[0] : null,
        telefono: phoneMatch ? phoneMatch[0].replace(/[\s\-]/g, '') : null,
        servicio,
        notas,
        hasAll: !!(nombre && emailMatch && phoneMatch)
    };
}

export const processChatMessage = async (req, res) => {
    const { messages, isGoyi } = req.body;
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    try {
        let finalGoyiPrompt = GOYI_SYSTEM_PROMPT;
        let currentUser = "Desconocido"; // Elevated to be accessible in tool execution
        
        if (isGoyi) {
            if (req.headers.authorization) {
                const token = req.headers.authorization.split(' ')[1];
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#');
                    currentUser = decoded.username || "Desconocido";
                } catch(e) {}
            }
            finalGoyiPrompt = `\n[SISTEMA DE SEGURIDAD]: ESTÁS HABLANDO CON EL USUARIO AUTENTICADO COMO: "${currentUser}". Usa esto para verificar sus permisos de forma estricta.\n${GOYI_SYSTEM_PROMPT}`;
        }
        
        const p_prompt = isGoyi ? finalGoyiPrompt : SYSTEM_PROMPT;
        const p_tools = isGoyi ? goyiChatTools : chatTools;
        const { model, sessions } = getGeminiModel(apiKey, p_prompt, p_tools);

        let history = messages.slice(0, -1).map(m => ({
            role: m.role === "assistant" || m.role === "model" ? "model" : "user",
            parts: [{ text: m.content || m.text }]
        }));
        
        let validIndex = history.findIndex(m => m.role === "user");
        if (validIndex === -1) {
            history = [];
        } else if (validIndex > 0) {
            history = history.slice(validIndex);
        }

        // --- CEREBRO ENJAMBRE DE GOYI (Memoria de todos los usuarios) ---
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
                console.error('[Goyi] Error cargando cerebro enjambre:', errDb);
            }
        }

        const chat = model.startChat({ history });
        const lastMsg = messages[messages.length - 1].content || messages[messages.length - 1].text;

        let result = await chat.sendMessage(lastMsg);
        let responseText = result.response.text();

        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            const functionResponses = [];
            
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === "check_availability") {
                    const { fecha, hora } = call.args;
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                    const disponible = parseInt(r.rows[0].count) === 0;
                    fRes = { disponible };

                    // ── GUARDADO AUTOMÁTICO ─────────────────────────────────────────────
                    // Si hay disponibilidad Y tenemos todos los datos, guardamos aquí
                    // como respaldo por si Gemini no llama save_appointment por separado
                    if (disponible) {
                        const fullText = messages.map(m => m.content || m.text || '').join(' ');
                        const appt = extractAppointmentData(fullText);

                        if (appt.hasAll) {
                            console.log(`[AutoSave] Activado para ${appt.nombre} (${appt.correo}) - ${fecha} ${hora}`);
                            try {
                                const googleRes = await agendarEnGoogleCalendar({
                                    nombre: appt.nombre,
                                    correo: appt.correo,
                                    telefono: appt.telefono,
                                    servicio: appt.servicio,
                                    fecha, hora,
                                    notas: appt.notas
                                });
                                if (googleRes && googleRes.id) {
                                    const saved = await pool.query(
                                        `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_event_id)
                                         VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8) RETURNING id`,
                                        [appt.nombre, appt.correo, appt.telefono, appt.servicio, fecha, hora, appt.notas, googleRes.id]
                                     );
                                     console.log(`[AutoSave] ✅ Cita #${saved.rows[0].id} guardada. Calendar: ${googleRes.id}`);
                                     // Enviar confirmación por email (fire & forget)
                                     sendCitaConfirmationEmail({
                                         nombre: appt.nombre, email: appt.correo,
                                         fecha, hora, tipoSesion: appt.servicio,
                                         personalCalendarLink: googleRes.personalCalendarLink,
                                     }).catch(e => console.error('[AutoSave] Email falló:', e.message));
                                     fRes = { disponible: true, auto_saved: true, cita_id: saved.rows[0].id, personal_calendar_link: googleRes.personalCalendarLink, google_link: googleRes.htmlLink };
                                }
                            } catch (autoErr) {
                                console.error('[AutoSave] ❌ Error:', autoErr.message);
                            }
                        }
                    }
                } else if (call.name === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                    try {
                        // Si ya fue guardado por AutoSave, evitar duplicado
                        const dup = await pool.query(
                            "SELECT id, google_calendar_event_id FROM citas WHERE email=$1 AND fecha=$2 AND hora=$3 AND status='confirmada'",
                            [correo, fecha, hora]
                        );
                        if (dup.rows.length > 0) {
                            console.log(`[Save] Duplicado detectado para ${correo} - retornando existente #${dup.rows[0].id}`);
                            fRes = { success: true, id: dup.rows[0].id, message: 'Cita ya registrada previamente' };
                        } else {
                            const googleRes = await agendarEnGoogleCalendar({ nombre, correo, telefono, servicio, fecha, hora, notas });
                            if (googleRes && googleRes.id) {
                                const r = await pool.query(
                                    `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_event_id)
                                     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8) RETURNING id`,
                                    [nombre, correo, telefono, servicio, fecha, hora, notas, googleRes.id]
                                );
                                console.log(`[Save] ✅ Cita #${r.rows[0].id} guardada. Calendar: ${googleRes.id}`);
                                // Enviar confirmación por email (fire & forget)
                                sendCitaConfirmationEmail({
                                    nombre, email: correo, fecha, hora, tipoSesion: servicio,
                                    personalCalendarLink: googleRes.personalCalendarLink,
                                }).catch(e => console.error('[Save] Email falló:', e.message));
                                fRes = { success: true, id: r.rows[0].id, personal_calendar_link: googleRes.personalCalendarLink, google_link: googleRes.htmlLink };
                            } else {
                                fRes = { success: false, error: 'Google Calendar no confirmó el evento' };
                            }
                        }
                    } catch (err) {
                        console.error('[Save] ❌ Error en save_appointment:', err.message);
                        fRes = { success: false, error: err.message };
                    }
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                } else if (call.name === "view_file") {
                    const isGodMode = ["jareg", "godzilla_admin"].includes(currentUser?.toLowerCase());
                    if (!isGodMode) {
                        fRes = { error: "ACCESO DENEGADO. REGLA ESTRICTA DE SEGURIDAD. SOLO JAREG PUEDE OPERAR AGENTES." };
                    } else {
                        try {
                            const fullPath = path.resolve(process.cwd(), call.args.filePath);
                            const content = fs.readFileSync(fullPath, 'utf-8');
                            fRes = { content };
                        } catch(e) { fRes = { error: e.message }; }
                    }
                } else if (call.name === "edit_file") {
                    const isGodMode = ["jareg", "godzilla_admin"].includes(currentUser?.toLowerCase());
                    if (!isGodMode) {
                        fRes = { error: "ACCESO DENEGADO. REGLA ESTRICTA DE SEGURIDAD. SOLO JAREG PUEDE OPERAR AGENTES." };
                    } else {
                        try {
                            const fullPath = path.resolve(process.cwd(), call.args.filePath);
                            fs.writeFileSync(fullPath, call.args.newContent, 'utf-8');
                            fRes = { success: true, message: `File ${call.args.filePath} updated successfully.` };
                        } catch(e) { fRes = { error: e.message }; }
                    }
                }
                functionResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: fRes
                    }
                });
            }
            
            result = await chat.sendMessage(functionResponses);
            responseText = result.response.text();
        }

        // --- ALIMENTAR A GOYI CON LA NUEVA SALIDA ---
        if (isGoyi) {
            pool.query("INSERT INTO goyi_learning (original_prompt, improved_prompt, context_type) VALUES ($1, $2, 'goyi_chat')", [lastMsg, responseText])
                .catch(err => console.error('[Goyi] Error al guardar nuevo aprendizaje:', err.message));
        }

        res.status(200).json({ reply: responseText });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
