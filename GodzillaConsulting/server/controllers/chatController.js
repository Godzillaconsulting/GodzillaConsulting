/* global process */
import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from "../services/calendarService.js";

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

## PAQUETES Y SERVICIOS (SIN PRECIOS)
1. **Posicionamiento Social**: Gestión de redes sociales, creación de contenido mensual, diseño de parrilla y estrategia de publicación. (Garantía de engagement en 14 días). NO INCLUYE Landing Page.
2. **Control IA**: Bot/Agente de Inteligencia Artificial que atiende 24/7 tu WhatsApp y sitio web. (Garantía de funcionamiento en 10 días).
3. **Expansión**: Desarrollo de Landing Page de alta conversión, campañas de Tráfico Pago (Ads) bilingües y embudo de ventas. (Garantía de leads en 30 días o devolución).
4. **Élite**: Consultoría personalizada 1 a 1, estrategia integral 'Godfather', plan de crecimiento total. (Garantía de +20% citas en 90 días).

## REGLAS DE CONVERSACIÓN (¡CRÍTICO!)
1. **Identidad Ultra Humana**: NUNCA digas "Como IA", "Soy una inteligencia artificial", "Mi mayor reto", ni frases robóticas/filosóficas. Habla como un experto humano, relajado pero directo.
2. **Micro-Mensajes (Estilo WhatsApp)**: Tus respuestas deben ser EXTREMADAMENTE cortas. Máximo 1 a 2 renglones físicos. Ve al grano inmediatamente sin saludos formales ni introducciones largas.
3. **Cero Paja / Cero Sermones**: NUNCA des explicaciones largas ni te pongas a educar al cliente sobre lo que es o hace la IA en el mundo. Si el cliente tiene un problema, responde con empatía breve y ofrece una solución de la agencia.
4. **Paso a paso**: Haz **SOLO UNA PREGUNTA** por mensaje al final de tu texto. Ve descifrando la necesidad del cliente paso a paso. NUNCA envíes cuestionarios de múltiples preguntas.
5. **Precios Prohibidos**: TIENES ESTRICTAMENTE PROHIBIDO dar precios o cotizaciones. Si el cliente te pregunta "cuánto cuesta" o por el precio de algún paquete, dile amablemente que vea todos los detalles de costos en la página web oficial: https://godzillaconsulting.ai
6. **Detalles de Paquete**: Si te preguntan qué incluye un paquete, da los detalles concretos (mira la sección Paquetes) sin marearlos y sin dar precio.
7. **Memoria**: NO repitas información. Si el usuario ya mencionó su producto/leads, úsalo pero no lo repitas. MANTEN EN CUENTA EL RESUMEN DE CONTEXTO.
8. **Citas**: Si el cliente tiene intención real, guíalo suavemente a agendar usando el protocolo.
9. **Cancelaciones y Reagendamientos**: Si el cliente pide CANCELAR, pregúntale su teléfono (si no lo tienes en el contexto) y ejecuta la herramienta de cancelación inmediatamente. Si pide cambiar la cita, pregúntale la nueva fecha deseada y ejecuta la herramienta de reagendamiento.

## CONTACTO Y REDES SOCIALES OFICIALES
- **Teléfono Oficial / WhatsApp**: +52 656 581 8912
- **Instagram**: https://instagram.com/godzillaconsulting.ai
- **Facebook**: https://facebook.com/GodzillaConsulting
- **TikTok**: https://tiktok.com/@godzillaconsulting.ai
- **Sitio Web**: https://godzillaconsulting.ai

## PROTOCOLO DE AGENDAMIENTO
Si el usuario muestra interés en continuar, ofrécele agendar una llamada.
Obligatorio obtener: Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM) y Notas.
**SIEMPRE** usa la herramienta 'check_availability' antes de confirmar una cita para validar que el slot está libre.
**MUY IMPORTANTE**: Inmediatamente después de agendar exitosamente usando la herramienta, envía un mensaje final de confirmación profesional que resuma los datos de la cita.
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
                fecha: { type: "STRING", description: "YYYY-MM-DD" },
                hora: { type: "STRING", description: "HH:MM (24h)" },
                notas: { type: "STRING", description: "Notas adicionales" }
            },
            required: ["nombre", "correo", "telefono", "servicio", "fecha", "hora", "notas"]
        }
    },
    {
        name: "cancel_appointment",
        description: "Cancela de forma definitiva una cita usando el telefono o correo del cliente.",
        parameters: {
            type: "OBJECT",
            properties: {
                identificador: { type: "STRING", description: "El número de teléfono o correo electrónico del cliente para buscar su cita." }
            },
            required: ["identificador"]
        }
    },
    {
        name: "reschedule_appointment",
        description: "Modifica una cita existente cambiándola a otra fecha y hora.",
        parameters: {
            type: "OBJECT",
            properties: {
                identificador: { type: "STRING", description: "Télefono o correo del cliente." },
                nueva_fecha: { type: "STRING", description: "YYYY-MM-DD" },
                nueva_hora: { type: "STRING", description: "HH:MM (24h)" }
            },
            required: ["identificador", "nueva_fecha", "nueva_hora"]
        }
    },
    {
        name: "get_available_downloads",
        description: "Obtiene recursos descargables.",
        parameters: { type: "OBJECT", properties: {} }
    }
];

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

        let result = await chat.sendMessage(lastMsg);
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
                    const now = new Date();
                    
                    if (dateObj < now) {
                        fRes = { disponible: false, razon: "La fecha solicitada es en el pasado. Solicita una fecha futura." };
                        console.log(`[Web Guardián] Rechazo: Fecha Pasada para ${fecha} a las ${hora}`);
                    } else if (isSunday) {
                        fRes = { disponible: false, razon: "Los domingos no laboramos. Por favor solicita otro día." };
                        console.log(`[Web Guardián] Rechazo: Domingo para ${fecha} a las ${hora}`);
                    } else if (hourInt < 9 || hourInt >= 19) {
                        fRes = { disponible: false, razon: "Fuera de horario de oficina (9am a 7pm). Por favor solicita otra hora." };
                        console.log(`[Web Guardián] Rechazo: Fuera de Horario para ${fecha} a las ${hora}`);
                    } else {
                        // Guardián Anti-Empalme Multi-Tabla
                        const query = `
                            SELECT SUM(c) as total FROM (
                                SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                UNION ALL
                                SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                UNION ALL
                                SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
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
                        const now = new Date();

                        if (dateObj < now) {
                             console.warn(`⚠️ [Web Cita Rechazada por Guardián Final]: Fecha pasada ${fecha} ${hora}`);
                             fRes = { success: false, error: "Intento de agendar en el pasado. Pide otra fecha/hora a futuro." };
                        } else if (isSunday || hourInt < 9 || hourInt >= 19) {
                             console.warn(`⚠️ [Web Cita Rechazada por Guardián Final]: ${fecha} ${hora}`);
                             fRes = { success: false, error: "Intento de agendar fuera de horario o en domingo. Pide otra fecha/hora al cliente." };
                        } else {
                            const queryConflict = `
                                SELECT SUM(c) as total FROM (
                                    SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                ) as sum_tables
                            `;
                            const conflictCheck = await pool.query(queryConflict, [fecha, hora]);
                            if (parseInt(conflictCheck.rows[0].total) > 0) {
                                 console.warn(`⚠️ [Web Cita Rechazada] Intento de agendar en horario ocupado: ${fecha} ${hora}`);
                                 fRes = { success: false, error: "Ese horario acaba de ser ocupado. Por favor pídele al cliente que elija otra hora." };
                            } else {
                                const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                                let calendarId = null;
                                try {
                                    // 1. Intentar agendar en Google Calendar PRIMERO
                                    calendarId = await agendarEnGoogleCalendar(datosCita);
                                    
                                    // 2. Si Google Calendar tiene éxito, guardamos en la base de datos Web (citas)
                                    const r = await pool.query(
                                        "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_id) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8) RETURNING id",
                                        [nombre, correo, telefono, servicio, fecha, hora, notas, calendarId]
                                    );
                                    
                                    fRes = { success: true, id: r.rows[0].id, alert: "Guardado en DB y Calendar." };
                                    
                                    console.log(`[Web Tool] Cita guardada con éxito en BD y Calendar (ID: ${r.rows[0].id})`);
                                } catch (calErr) {
                                    console.error("❌ Fallo en sincronización Calendar/DB (Intentando Rollback):", calErr.message);
                                    if (calendarId) {
                                        console.log("⚠️ Ejecutando Rollback en Google Calendar por fallo al guardar en BD...");
                                        await cancelarEnGoogleCalendar(calendarId).catch(rollbackErr => console.error("❌ Fallo crítico en Rollback Calendar:", rollbackErr.message));
                                    }
                                    fRes = { success: false, error: "El sistema de agendas rechazó la operación o falló la conexión (" + calErr.message + "). Indícale al cliente que intente nuevamente." };
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
                            const dateObj = new Date(`${nueva_fecha}T${nueva_hora}:00-07:00`);
                            const isSunday = dateObj.getDay() === 0;
                            const hourInt = parseInt(nueva_hora.split(':')[0], 10);
                            const now = new Date();

                            if (dateObj < now) {
                                fRes = { success: false, error: "La nueva fecha/hora ya pasó. Intenta con una fecha futura." };
                            } else if (isSunday || hourInt < 9 || hourInt >= 19) {
                                fRes = { success: false, error: "El nuevo horario está fuera de horario de oficina o es domingo." };
                            } else {
                                const queryConflict = `
                                    SELECT SUM(c) as total FROM (
                                        SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                        UNION ALL
                                        SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
                                        UNION ALL
                                        SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'
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
                        }
                    } catch (err) {
                        console.error("❌ Error reagendando:", err);
                        fRes = { success: false, error: "Error técnico reagendando, intenta de nuevo más tarde." };
                    }
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                }
                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]);
                responseText = result.response.text();
            }
        }
        res.status(200).json({ reply: responseText });
    } catch (e) {
        console.error("❌ Error no controlado en chatController:", e.message);
        res.status(200).json({ reply: "Lo lamento mucho, mi servidor acaba de tener un pequeño corte de comunicación. ¿Me podrías repetir tu último mensaje?" });
    }
};
