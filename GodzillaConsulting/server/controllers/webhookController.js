import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";

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
**MUY IMPORTANTE**: Inmediatamente después de agendar exitosamente usando la herramienta, envía un mensaje final de confirmación profesional que resuma los datos de la cita (ej. "¡Perfecto, [Nombre]! Tu cita para [Servicio] ha quedado agendada para el [Fecha] a las [Hora]. Te enviaremos un correo de confirmación pronto.").
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

// Helper: UPSERT para base de datos (Memoria Inteligente)
async function appendMessageToSession(senderId, role, content) {
    const query = `
        INSERT INTO sesiones_chat (id_usuario_red, historial_mensajes, resumen_contexto, ultima_actualizacion)
        VALUES ($1, $2, '', CURRENT_TIMESTAMP)
        ON CONFLICT (id_usuario_red)
        DO UPDATE SET
            historial_mensajes = sesiones_chat.historial_mensajes || $2,
            ultima_actualizacion = CURRENT_TIMESTAMP
        RETURNING historial_mensajes, resumen_contexto;
    `;
    const newMsg = JSON.stringify([{ role, contenido: content }]);
    try {
        const res = await pool.query(query, [senderId, newMsg]);
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

// Placeholder para futura implementación de Google Calendar API
async function agendarEnGoogleCalendar(datosCita) {
    console.log("\n=================================");
    console.log("📅 [Google Calendar] Preparando evento...");
    console.log("Datos limpios extraídos para Google:", JSON.stringify(datosCita, null, 2));
    console.log("AQUÍ: Se insertará la autenticación con Service Account (google-credentials.json)");
    console.log("AQUÍ: Se llamará a calendar.events.insert() con los datos.");
    console.log("=================================\n");
    return true;
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
    
    // Log completo de auditoría (IG/WP/Messenger) pedido por Senior QA 
    console.log("\n=================== WEBHOOK PAYLOAD ===================");
    console.log(JSON.stringify(body, null, 2));
    console.log("=======================================================\n");

    if (!body || !body.entry || !body.entry[0]) {
        return res.sendStatus(400);
    }

    // 0. Responder a Meta INMEDIATAMENTE con 200 OK para que Meta no bloquee el webhook (por la demora de Gemini)
    res.status(200).send("EVENT_RECEIVED");

    try {
        const entry = body.entry[0];
        let senderId = null;
        let messageText = null;
        let platform = null;
        let phoneNumberId = null;

        if (entry.changes && entry.changes[0] && entry.changes[0].value.messages) {
            const data = entry.changes[0].value;
            platform = "whatsapp";
            messageText = data.messages[0].text.body;
            senderId = data.contacts[0].wa_id;
            phoneNumberId = data.metadata.phone_number_id;
        }
        else if (entry.messaging && entry.messaging[0] && entry.messaging[0].message) {
            const msgObj = entry.messaging[0];

            if (msgObj.message.is_echo) {
                console.log("Ignorando mensaje 'echo' proveniente de la propia página.");
                return;
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
        }

        if (!messageText || !senderId) {
            console.log("⚠️ Payload no contenía 'messageText' o 'senderId'. Saliendo del proceso.");
            return;
        }

        console.log(`📩 Mensaje recibido de [${senderId}] vía [${platform}]: ${messageText}`);

        // 2.a Guardar mensaje del usuario y recuperar sesión
        const sessionData = await appendMessageToSession(senderId, "user", messageText);
        if (!sessionData) return res.status(500).send("Error en DB");

        const { historial_mensajes, resumen_contexto } = sessionData;

        // Inyectar contexto comprimido en el sistema si existe
        let finalSystemPrompt = SYSTEM_PROMPT;
        if (resumen_contexto && resumen_contexto.trim() !== '') {
            finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}\n(Usa esta información para no preguntar cosas que ya sabes, pero no la repitas robóticamente).`;
        }

        // Formatear el historial reciente para Gemini-2.0-flash
        // historial_mensajes traído del UPSERT ya incluye el mensaje recién agregado del usuario.
        const geminiHistory = historial_mensajes.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.contenido }]
        }));

        // 2.b Iniciar Gemini y generar respuesta
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: finalSystemPrompt,
            tools: [{ functionDeclarations: chatTools }]
        });

        const chat = model.startChat({ history: geminiHistory });
        let result = await chat.sendMessage(messageText);
        let botReply = result.response.text();

        // Function Calls
        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === "check_availability") {
                    const { fecha, hora } = call.args;
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                    console.log(`[Tool] Verificando disponibilidad para ${fecha} a las ${hora}: ${fRes.disponible}`);
                } else if (call.name === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                    const r = await pool.query(
                        "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada') RETURNING id",
                        [nombre, correo, telefono, servicio, fecha, hora, notas]
                    );
                    
                    // Extraer los datos limpios en un objeto JSON explícito
                    const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                    
                    // Llamar a la función placeholder para integración futura
                    await agendarEnGoogleCalendar(datosCita);

                    fRes = { success: true, id: r.rows[0].id };
                    console.log(`[Tool] Cita guardada con éxito en BD (ID: ${fRes.id})`);
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                }

                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]);
                botReply = result.response.text();
            }
        }

        console.log(`🤖 Zilla Bot preparado para responder vía [${platform}]:`, botReply.substring(0, 50) + '...');

        // 2.c Guardar respuesta del bot en DB y verificar compresión
        const postBotSession = await appendMessageToSession(senderId, "model", botReply);

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
                ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
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
                ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
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

};
