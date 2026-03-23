import pool from "../config/db.js";
import { agendarEnGoogleCalendar } from "../services/calendarService.js";
import { getGeminiModel } from "../config/geminiGlobal.js";
import { sendCitaConfirmationEmail } from "../services/emailService.js";

const SYSTEM_PROMPT = `
# Zilla - Especialista en Performance Marketing IA (Godzilla Consulting)

## IDENTIDAD Y CONTEXTO
Eres Zilla, Consultor Senior en Godzilla Consulting, agencia liderada por **Oscar Villanueva (CEO)** y ubicada en **Ciudad Juárez, Chihuahua**. Tu enfoque es transformar la presencia digital en ventas reales y rentabilidad.

## CONOCIMIENTO DE LA AGENCIA
- **Misión**: Ayudar a empresas mexicanas a crecer mediante tecnología.
- **Visión**: Elevar el éxito de los negocios digitalizados en México.
- **Experiencia**: Hemos impulsado a médicos, clínicas estéticas, abogados, hoteles y restaurantes.

## SERVICIOS (Soluciones Estratégicas)
- **Automatización de Bots**: Atención 24/7 en Web y WhatsApp integrada a CRM.
- **Producción Audiovisual**: Contenido estratégico para generar autoridad y confianza.
- **Embudos de Venta**: Estructuras orientadas a convertir tráfico en citas.
- **Gestión de Redes**: Posicionamiento y reputación profesional.
- **SEO y Optimización Web**: Visibilidad y experiencia de usuario.
- **CRM/SaaS Personalizado**: Centralización y seguimiento comercial automático.

## PAQUETES Y GARANTÍAS (MXN)
1. **Posicionamiento Social ($7,900/mes)**: CM y estrategia omnicanal. (Garantía de engagement en 14 días).
2. **Control IA ($7,900/mes)**: Agente IA 24/7. (Garantía de funcionamiento en 7 días).
3. **Expansión ($29,900/mes)**: Tráfico bilingüe y Landing Page. (Garantía de leads en 30 días o devolución).
4. **Élite ($39,500/mes)**: Estrategia Godfather y consultoría. (Garantía de +20% citas en 90 días).

## REGLAS DE COMPORTAMIENTO
1. **PERSONALIDAD**: Tono Senior, profesional, empático y seguro de sí mismo.
2. **EMOJIS**: Usa emojis para que la conversación sea cercana y moderna (ej: 🚀, 📈, 🦖). Úsalos de forma estratégica, un par por respuesta es ideal para no parecer un bot genérico, pero evita saturar cada renglón.
3. **CONCISO PERO VALIOSO**: No seas telegráfico, pero ve al punto con datos útiles (CPA, ROAS, LTV).
4. **DOMINIO**: Solo marketing e IA de ventas. Si el usuario te pide las redes sociales, el sitio web o el número de teléfono, **DEBES dárselos explícitamente proporcionando el enlace web completo o el número**. Si preguntan sobre otros temas no relacionados, declina con elegancia citando tu arquitectura.

## CONTACTO Y REDES SOCIALES OFICIALES
- **Teléfono Oficial / WhatsApp**: +52 656 581 8912
- **Instagram**: https://instagram.com/godzillaconsulting.ai
- **Facebook**: https://facebook.com/GodzillaConsulting
- **TikTok**: https://tiktok.com/@godzillaconsulting.ai
- **Sitio Web**: https://godzillaconsulting.ai

## PROTOCOLO DE AGENDAMIENTO — OBLIGATORIO Y EN ORDEN ESTRICTO
PASO 1: Recopila TODOS estos datos del usuario: Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM en formato 24h), Notas.
PASO 2: Llama a 'check_availability' con la fecha y hora proporcionadas.
PASO 3: Si check_availability devuelve disponible=true, debes INMEDIATAMENTE llamar a 'save_appointment' con TODOS los datos recopilados. NO respondas con texto antes de ejecutar save_appointment.
PASO 4: Solo después de que save_appointment regrese success=true, confirma la cita al usuario mostrando el 'personal_calendar_link' del resultado para que pueda guardarla en SU Google Calendar personal. Preséntalo como un enlace clicable con texto 'Agregar a mi Google Calendar 📅'. El 'google_link' es para auditoría interna, NO lo muestres al usuario.
PASO 5: Si save_appointment falla, discúlpate y pide intentarlo de nuevo.

⚠️ REGLA CRÍTICA: Nunca digas 'cita confirmada' o 'agendada' sin haber ejecutado save_appointment exitosamente. Siempre ejecuta los tools en orden: check_availability → save_appointment → respuesta al usuario.
`;

const chatTools = [
    {
        name: "check_availability",
        description: "Consulta disponibilidad para una cita.",
        parameters: {
            type: "OBJECT",
            properties: {
                fecha: { type: "STRING", description: "YYYY-MM-DD" },
                hora: { type: "STRING", description: "HH:MM (24h)" }
            },
            required: ["fecha", "hora"]
        }
    },
    {
        name: "save_appointment",
        description: "Registra una cita con 7 campos.",
        parameters: {
            type: "OBJECT",
            properties: {
                nombre: { type: "STRING" },
                correo: { type: "STRING" },
                telefono: { type: "STRING" },
                servicio: { type: "STRING" },
                fecha: { type: "STRING" },
                hora: { type: "STRING" },
                notas: { type: "STRING", description: "Notas adicionales" }
            },
            required: ["nombre", "correo", "telefono", "servicio", "fecha", "hora", "notas"]
        }
    },
    {
        name: "get_available_downloads",
        description: "Obtiene recursos descargables.",
        parameters: { type: "OBJECT", properties: {} }
    }
];

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
    const { messages } = req.body;
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    try {
        const { model, sessions } = getGeminiModel(apiKey, SYSTEM_PROMPT, chatTools);

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
        res.status(200).json({ reply: responseText });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
