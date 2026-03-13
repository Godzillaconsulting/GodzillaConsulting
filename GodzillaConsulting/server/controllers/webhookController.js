import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from "../services/calendarService.js";

// Caché en memoria para evitar procesamiento duplicado por reintentos veloces de Meta
const processedMessages = new Set();

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
        description: "Cancela de forma definitiva una cita usando el telefono del cliente.",
        parameters: {
            type: "OBJECT",
            properties: {
                identificador: { type: "STRING", description: "El número de teléfono del cliente para buscar su cita." }
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
                identificador: { type: "STRING", description: "Télefono del cliente." },
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

// Helper: UPSERT para base de datos (Memoria Inteligente)
async function appendMessageToSession(senderId, role, content, plataforma = 'desconocida') {
    const query = `
        INSERT INTO sesiones_chat (id_usuario_red, historial_mensajes, resumen_contexto, ultima_actualizacion, plataforma)
        VALUES ($1, $2, '', CURRENT_TIMESTAMP, $3)
        ON CONFLICT (id_usuario_red)
        DO UPDATE SET
            historial_mensajes = sesiones_chat.historial_mensajes || $2,
            ultima_actualizacion = CURRENT_TIMESTAMP,
            plataforma = EXCLUDED.plataforma
        RETURNING historial_mensajes, resumen_contexto;
    `;
    const newMsg = JSON.stringify([{ role, contenido: content }]);
    try {
        const res = await pool.query(query, [senderId, newMsg, plataforma]);
        return res.rows[0];
    } catch (e) {
        console.error("❌ Error en appendMessageToSession:", e.message);
        return null;
    }
}

// Helper: Compresión con Gemini
async function compressContextIfNeeded(senderId, historial_mensajes, resumen_contexto) {
    if (!historial_mensajes || historial_mensajes.length < 20) return;

    try {
        console.log(`[Compresión] Iniciando compresión de memoria para ${senderId}...`);
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let historyText = historial_mensajes.map(m => `${m.role === 'user' ? 'Cliente' : 'Zilla'}: ${m.contenido}`).join('\n');

        let prompt = `Resume esta conversación en 3 párrafos clave, manteniendo los datos importantes (nombre, servicio de interés, citas o detalles clave).\n\nConversación:\n${historyText}`;
        if (resumen_contexto) {
            prompt = `Aquí tienes el resumen anterior de este cliente:\n${resumen_contexto}\n\nAhora, concatena/actualiza ese resumen integrando esta nueva parte de la conversación en 3 párrafos clave, manteniendo los datos importantes.\n\nNueva parte de la conversación:\n${historyText}`;
        }

        const result = await model.generateContent(prompt);
        const newSummary = result.response.text();

        // Limpiar el historial_mensajes de JSONB y guardar el nuevo resumen
        const query = `
            UPDATE sesiones_chat 
            SET historial_mensajes = '[]'::jsonb,
                resumen_contexto = $1,
                ultima_actualizacion = CURRENT_TIMESTAMP
            WHERE id_usuario_red = $2
        `;
        await pool.query(query, [newSummary, senderId]);
        console.log(`[Compresión] ✅ Memoria comprimida y guardada para ${senderId}.`);
    } catch (e) {
        console.error("❌ Error comprimiendo contexto:", e);
    }
}

// 1. Verificación (GET) para Meta / Meta Developer Portal
export const verifyWebhook = (req, res) => {
    const verify_token = process.env.MY_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("✅ Webhook validado correctamente con Meta");
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.status(400).send("Faltan parámetros de validación");
};

// 2. Recepción y procesamiento de mensajes (POST)
export const processWebhookMessage = async (req, res) => {
    const body = req.body;
    
    // Log simplificado para no saturar memoria en Vercel/PM2.
    if (process.env.NODE_ENV === "development") {
        console.log("\n=================== WEBHOOK PAYLOAD ===================");
        console.log(JSON.stringify(body, null, 2));
        console.log("=======================================================\n");
    } else {
        console.log(`\n⚡ [WEBHOOK] Recibido evento de: ${body.object}`);
    }

    if (!body || !body.entry || !body.entry[0]) {
        return res.sendStatus(400);
    }

    // Se remueve res.send(200) prematuro que congelaba Vercel/Lambda. Se aplaza al final de la ejecución sincrónica/asincrónica.

    try {
        const entry = body.entry[0];
        let senderId = null;
        let messageText = null;
        let platform = null;
        let phoneNumberId = null;
        let messageId = null;

        if (entry.changes && entry.changes[0] && entry.changes[0].value.messages) {
            const data = entry.changes[0].value;
            platform = "whatsapp";
            messageText = data.messages[0].text.body;
            senderId = data.contacts[0].wa_id;
            phoneNumberId = data.metadata.phone_number_id;
            messageId = data.messages[0].id;
        }
        else if (entry.messaging && entry.messaging[0] && entry.messaging[0].message) {
            const msgObj = entry.messaging[0];

            if (msgObj.message.is_echo) {
                console.log("Ignorando mensaje 'echo' proveniente de la propia página.");
                return res.status(200).send("EVENT_RECEIVED");
            }

            // Meta envía en 'object' si es de Instagram, Page o WhatsApp
            if (body.object === "instagram") {
                platform = "instagram";
            } else if (body.object === "page") {
                platform = "messenger";
            } else if (body.object === "whatsapp_business_account") {
                platform = "whatsapp";
            } else {
                platform = "messenger";
            }

            if (req.query.platform) platform = req.query.platform;

            messageText = msgObj.message.text;
            senderId = msgObj.sender.id;
            messageId = msgObj.message.mid;
        }

        if (!messageText || !senderId) {
            console.log("⚠️ Payload no contenía 'messageText' o 'senderId'. Saliendo del proceso.");
            return res.status(200).send("EVENT_RECEIVED");
        }
        
        // 1.b Prevenir Reintentos de Meta (Idempotencia)
        if (messageId) {
            if (processedMessages.has(messageId)) {
                console.log(`[Deduplicación] Ignorando mensaje duplicado de Meta por reintento: ${messageId}`);
                return res.status(200).send("EVENT_RECEIVED");
            }
            processedMessages.add(messageId);
            // Limpiar caché vieja si crece mucho (previene fugas de memoria en Vercel)
            if (processedMessages.size > 2000) processedMessages.clear();
        }

        console.log(`📩 Mensaje recibido de [${senderId}] vía [${platform}]: ${messageText}`);

        // 2.a Guardar mensaje del usuario y recuperar sesión
        const sessionData = await appendMessageToSession(senderId, "user", messageText, platform);
        if (!sessionData) return res.status(500).send("Error en DB");

        const { historial_mensajes, resumen_contexto } = sessionData;

        // Inyectar contexto comprimido en el sistema si existe
        let finalSystemPrompt = SYSTEM_PROMPT;
        if (resumen_contexto && resumen_contexto.trim() !== '') {
            finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}\n(Usa esta información para no preguntar cosas que ya sabes, pero no la repitas robóticamente).`;
        }

        // 2.a Refactorización Crítica: Prevenir bloqueo de Gemini por Roles NO alternados
        // Gemini rechaza hacer startChat si hay dos "user" o dos "model" seguidos (ej. un humano intervino en el chat).
        // Solución: Agrupar mensajes consecutivos del mismo rol en un solo bloque.
        let safeHistory = [];
        let rawHistoryForGemini = historial_mensajes.slice(0, -1); // Excluimos el último que se envía con sendMessage
        
        for (const msg of rawHistoryForGemini) {
            if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === msg.role) {
                // Si el rol es el mismo que el anterior, simplemente le concatenamos el texto
                safeHistory[safeHistory.length - 1].parts[0].text += `\n[Mensaje adicional]: ${msg.contenido}`;
            } else {
                // Si es un rol nuevo o el inicio, lo pusheamos
                safeHistory.push({
                    role: msg.role === "assistant" ? "model" : msg.role, // asegurar nombres
                    parts: [{ text: msg.contenido }]
                });
            }
        }
        
        // Regla final: Gemini siempre espera que el historial termine en "model" para poder recibir un "user" via sendMessage.
        // Si termina en "user", agregamos un dummy model.
        if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === "user") {
            safeHistory.push({ role: "model", parts: [{ text: "(El usuario envió otro mensaje enseguida)" }] });
        }

        // 2.b Iniciar Gemini y generar respuesta
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: finalSystemPrompt,
            tools: [{ functionDeclarations: chatTools }]
        });

        const chat = model.startChat({ history: safeHistory });
        let result = await chat.sendMessage(messageText);
        let botReply = result.response.text();

        // Function Calls
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
                        console.log(`[Guardián] Rechazo: Domingo para ${fecha} a las ${hora}`);
                    } else if (hourInt < 9 || hourInt >= 19) {
                        fRes = { disponible: false, razon: "Fuera de horario de oficina (9am a 7pm). Por favor solicita otra hora." };
                        console.log(`[Guardián] Rechazo: Fuera de Horario para ${fecha} a las ${hora}`);
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
                        console.log(`[Tool] Disponibilidad multi-tabla para ${fecha} a las ${hora}: ${fRes.disponible}`);
                    }
                } else if (call.name === "save_appointment") {
                    try {
                        const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                        
                        // Candado Final (Por si Gemini intentó puentear el check_availability)
                        const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
                        const isSunday = dateObj.getDay() === 0;
                        const hourInt = parseInt(hora.split(':')[0], 10);

                        if (isSunday || hourInt < 9 || hourInt >= 19) {
                             console.warn(`⚠️ [Cita Rechazada por Guardián Final]: ${fecha} ${hora}`);
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
                                 console.warn(`⚠️ [Cita Rechazada] Intento de agendar en horario ocupado (Doble check): ${fecha} ${hora}`);
                                 fRes = { success: false, error: "Ese horario acaba de ser ocupado. Por favor pídele al cliente que elija otra hora." };
                            } else {
                                // Extraer los datos limpios en un objeto JSON explícito
                                const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                                
                                try {
                                    // 1. Intentar agendar en Google Calendar PRIMERO
                                    const calendarId = await agendarEnGoogleCalendar(datosCita);
                                    
                                    // 2. Si Google Calendar tiene éxito, guardamos en la base de datos
                                    let newId;
                                    if (platform === 'whatsapp') {
                                        const r = await pool.query(
                                            "INSERT INTO citas_whatsapp (nombre, telefono, fecha_cita, hora, status, google_calendar_id) VALUES ($1,$2,$3,$4,'confirmada',$5) RETURNING id",
                                            [nombre, telefono, fecha, hora, calendarId]
                                        );
                                        newId = r.rows[0].id;
                                        console.log(`[Tool] Cita insertada en citas_whatsapp (ID: ${newId})`);
                                    } else {
                                        const r = await pool.query(
                                            "INSERT INTO citas_facebook_ig (nombre, fbid, plataforma, fecha_cita, hora, status, google_calendar_id) VALUES ($1,$2,$3,$4,$5,'confirmada',$6) RETURNING id",
                                            [nombre, senderId, platform || 'messenger', fecha, hora, calendarId]
                                        );
                                        newId = r.rows[0].id;
                                        console.log(`[Tool] Cita insertada en citas_facebook_ig (ID: ${newId})`);
                                    }

                                    fRes = { success: true, id: newId, alert: "Guardado en DB y Calendar." };
                                    console.log(`[Tool] Cita guardada con éxito en BD y Calendar (ID: ${newId})`);
                                    
                                    if (platform === "instagram") {
                                        botReply = "¡Listo! Tu cita ha sido agendada. Te envié los detalles a tu calendario.";
                                    }
                                } catch (calErr) {
                                    console.error("❌ Fallo Google Calendar Webhook (NO se guardó en DB):", calErr.message);
                                    // 3. Si falla, obligar a Gemini a pedirle al usuario otra hora.
                                    fRes = { success: false, error: "El sistema de agendas de Google rechazó el horario o los datos (" + calErr.message + "). Por favor indícale al cliente que intente nuevamente o elija otro horario." };
                                }
                            }
                        }
                    } catch (metaErr) {
                        console.error("❌ Error al agendar cita en Meta Webhook:", metaErr);
                        fRes = { success: false, error: "Hubo un pequeño problema técnico procesando la cita, pero ya estoy notificando al equipo de Godzilla Consulting. Por favor intenta de nuevo más tarde." };
                    }
                } else if (call.name === "cancel_appointment") {
                    const { identificador } = call.args;
                    try {
                        let result;
                        let tableName = platform === 'whatsapp' ? 'citas_whatsapp' : 'citas_facebook_ig';

                        if (platform === 'whatsapp') {
                            result = await pool.query(`SELECT id, google_calendar_id FROM ${tableName} WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1`, [identificador]);
                        } else {
                            // Para FB/IG buscamos por fbid (senderId de Meta) mapeado al nombre que Gemini interpretó
                            result = await pool.query(`SELECT id, google_calendar_id FROM ${tableName} WHERE fbid = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1`, [senderId]);
                        }

                        if (result.rows.length === 0) {
                            fRes = { success: false, error: "No encontré ninguna cita activa." };
                        } else {
                            const cita = result.rows[0];
                            if (cita.google_calendar_id) {
                                await cancelarEnGoogleCalendar(cita.google_calendar_id);
                            }
                            await pool.query(`UPDATE ${tableName} SET status = 'cancelada' WHERE id = $1`, [cita.id]);
                            fRes = { success: true, message: "Cita cancelada correctamente." };
                            console.log(`[Tool] Cita ${cita.id} cancelada exitosamente en ${tableName}.`);
                        }
                    } catch (err) {
                        console.error("❌ Error cancelando:", err);
                        fRes = { success: false, error: "Error interno procesando cancelación." };
                    }
                } else if (call.name === "reschedule_appointment") {
                    const { identificador, nueva_fecha, nueva_hora } = call.args;
                    try {
                        let result;
                        let tableName = platform === 'whatsapp' ? 'citas_whatsapp' : 'citas_facebook_ig';

                        if (platform === 'whatsapp') {
                            result = await pool.query(`SELECT id, google_calendar_id FROM ${tableName} WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1`, [identificador]);
                        } else {
                            result = await pool.query(`SELECT id, google_calendar_id FROM ${tableName} WHERE fbid = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1`, [senderId]);
                        }

                        if (result.rows.length === 0) {
                            fRes = { success: false, error: "No encontré ninguna cita activa previa." };
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
                                await pool.query(`UPDATE ${tableName} SET fecha_cita = $1, hora = $2 WHERE id = $3`, [nueva_fecha, nueva_hora, cita.id]);
                                fRes = { success: true, message: "Cita reagendada exitosamente." };
                                console.log(`[Tool] Cita ${cita.id} reagendada exitosamente en ${tableName}.`);
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
                
                // Solo reasignar la respuesta si no inyectamos forzosamente el msj de Instagram
                if (!(platform === "instagram" && call.name === "save_appointment" && fRes.success)) {
                    botReply = result.response.text();
                }
            }
        }

        console.log(`🤖 Zilla Bot preparado para responder vía [${platform}]:`, botReply.substring(0, 50) + '...');

        // 2.c Guardar respuesta del bot en DB y verificar compresión
        const postBotSession = await appendMessageToSession(senderId, "model", botReply, platform);

        // Disparar compresión en segundo plano sin bloquar la respuesta a Meta
        if (postBotSession && postBotSession.historial_mensajes && postBotSession.historial_mensajes.length >= 20) {
            compressContextIfNeeded(senderId, postBotSession.historial_mensajes, postBotSession.resumen_contexto);
        }

        // 2.d Enviar respuesta a Meta usando Graph API
        let GRAPH_URL = "";
        let requestBody = {};
        let ACCESS_TOKEN = "";

        switch (platform) {
            case "whatsapp":
                GRAPH_URL = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
                ACCESS_TOKEN = process.env.WP_ACCESS_TOKEN || process.env.WA_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
                requestBody = {
                    messaging_product: "whatsapp",
                    to: senderId,
                    type: "text",
                    text: { body: botReply }
                };
                break;
            case "messenger":
            case "instagram":
            default:
                GRAPH_URL = `https://graph.facebook.com/v19.0/me/messages`;
                ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAAdo2DBD1K8BQ13ZAA0geo0ggNMtEHRTF8IlVWra8duNO5AbjvlFaD2nWsvd8qolRSidIDTKiaDzuZARYzqyTFXP7t3sZAZALjHdgHQHQBKTdWn661HRsNTW1Rvy3DnyOda3UUM8EXYT80YQgdJAA3vdoZBdNlsER4czybKCwaHepRrGefgfSrWHfFbQNL5ZB3345E0Rb27i4BqBsUq9m6ZAvGZBZBjfZB7E7KjwqYUrWc4uZB7bzzv3dWrxvaaleZAGGa4YXbZCKlf7Ikn7PF1FuaMrfk6pG';
                requestBody = {
                    messaging_type: "RESPONSE",
                    recipient: { id: senderId },
                    message: { text: botReply }
                };
                break;
        }

        const graphResponse = await fetch(GRAPH_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (graphResponse.ok) {
            console.log(`✅ Respuesta enviada correctamente a Meta (${platform})`);
        } else {
            const errData = await graphResponse.json();
            console.error(`❌ Error enviando a Meta Graph API (${platform}):`, errData);
        }

    } catch (error) {
        console.error("❌ Error interno procesando webhook:", error);
    }

    return res.status(200).send("EVENT_RECEIVED");
};
