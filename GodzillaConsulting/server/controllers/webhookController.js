import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";
// fetch is native in Node.js 18+, no import needed

// Reutilizamos el system prompt base de Zilla (Mismo que en chatController)
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
7. **Memoria**: NO repitas información. Si el usuario ya mencionó su producto/leads, úsalo pero no lo repitas.
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

// Helper para cargar y guardar sesiones (Memoria Inteligente JSONB)
// Retorna el historial formateado para Gemini o un array vacío si es usuario nuevo.
async function getOrCreateSession(senderId, platform) {
    try {
        const result = await pool.query(
            "SELECT historial_mensajes FROM sesiones_chat WHERE id_usuario_red = $1",
            [senderId]
        );
        
        if (result.rows.length > 0) {
            return result.rows[0].historial_mensajes;
        } else {
            // Usuario nuevo, lo creamos con historial vacío
            await pool.query(
                "INSERT INTO sesiones_chat (id_usuario_red, plataforma) VALUES ($1, $2)",
                [senderId, platform]
            );
            return [];
        }
    } catch (e) {
        console.error("❌ Error leyendo sesión JSONB:", e.message);
        return [];
    }
}

// Guarda toda la conversación (User y Model) en bloque dentro del JSONB
async function updateSession(senderId, newHistoryArray) {
    try {
        await pool.query(
            "UPDATE sesiones_chat SET historial_mensajes = $1, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id_usuario_red = $2",
            [JSON.stringify(newHistoryArray), senderId]
        );
    } catch (e) {
        console.error("❌ Error actualizando sesión JSONB:", e.message);
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
    // 2.a Validar que venga body
    const body = req.body;
    if (!body || !body.entry || !body.entry[0]) {
        return res.sendStatus(400); 
    }

    try {
        const entry = body.entry[0];
        let senderId = null;
        let messageText = null;
        let platform = null;
        let phoneNumberId = null; // Solo para WhatsApp

        // --- DETECCIÓN DE PLATAFORMA Y EXTRACCIÓN DE DATOS ---
        
        // Caso A: WhatsApp (Usa 'changes')
        if (entry.changes && entry.changes[0] && entry.changes[0].value.messages) {
            const data = entry.changes[0].value;
            platform = "whatsapp";
            messageText = data.messages[0].text.body;
            senderId = data.contacts[0].wa_id;
            phoneNumberId = data.metadata.phone_number_id; 
        } 
        // Caso B: Messenger o Instagram (Usan 'messaging')
        else if (entry.messaging && entry.messaging[0] && entry.messaging[0].message) {
            const msgObj = entry.messaging[0];
            
            // FILTRO DE SEGURIDAD: Evitar que el bot se responda a sí mismo (is_echo)
            if (msgObj.message.is_echo) {
                console.log("Ignorando mensaje 'echo' proveniente de la propia página.");
                return res.status(200).send("EVENT_RECEIVED");
            }

            // Detección oficial de plataforma
            if (body.object === "instagram") {
                platform = "instagram";
            } else if (body.object === "page") {
                platform = "messenger";
            } else {
                platform = "messenger"; // fallback
            }

            if (req.query.platform) platform = req.query.platform; // Forzar por query si es necesario
            
            messageText = msgObj.message.text;
            senderId = msgObj.sender.id;
        }

        // Si no es un mensaje de texto válido (ej: updates de estado, leídos, etc), ignoramos
        if (!messageText || !senderId) {
            return res.status(200).send("EVENT_RECEIVED");
        }

        console.log(`📩 Mensaje recibido de [${senderId}] vía [${platform}]: ${messageText}`);

        // 2.b Cargar sesión o crearla si es nuevo lead
        const geminiHistory = await getOrCreateSession(senderId, platform);
        
        // Agregamos el mensaje que acaba de enviar el usuario al arreglo en memoria temporal
        geminiHistory.push({
            role: "user",
            parts: [{ text: messageText }]
        });

        // 2.d Iniciar Gemini y generar respuesta
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: chatTools }]
        });

        // Nota: Le mandamos a Gemini todo el arreglo excepto el último mensaje del usuario (ese va en sendMessage)
        const oldHistoryForStartChat = geminiHistory.slice(0, -1);
        const chat = model.startChat({ history: oldHistoryForStartChat });
        
        let result = await chat.sendMessage(messageText);
        let botReply = result.response.text();

        // Manejar posibles invocaciones de herramientas (Function Calling)
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
                    fRes = { success: true, id: r.rows[0].id };
                    console.log(`[Tool] Cita guardada con éxito (ID: ${fRes.id})`);
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                }
                
                // Devolvemos el resultado de la función a Gemini para que termine de armar su respuesta final humana
                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]);
                botReply = result.response.text();
            }
        }

        console.log(`🤖 Zilla Bot preparado para responder vía [${platform}]:`, botReply.substring(0, 50) + '...');

        // 2.e Agregamos la respuesta del bot al arreglo en memoria temporal y GUARDAMOS en DB
        geminiHistory.push({
            role: "model",
            parts: [{ text: botReply }]
        });
        
        // Hacemos un solo UPDATE en DB con todo el arreglo modificado
        await updateSession(senderId, geminiHistory);

        // 2.f Enviar respuesta a Meta usando Graph API (Fetch)
        let GRAPH_URL = "";
        let requestBody = {};
        const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;

        switch (platform) {
            case "whatsapp":
                GRAPH_URL = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
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
                // Para IG y Messenger la API Graph v19+ usa /me/messages
                GRAPH_URL = `https://graph.facebook.com/v19.0/me/messages`;
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
                "Authorization": `Bearer ${PAGE_TOKEN}`,
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

    // VERCEL / SERVERLESS FIX: Meta espera un 200 EVENT_RECEIVED para saber que terminó bien.
    // Solo podemos enviar la respuesta de Vercel HASTA QUE todas las tareas de fondo terminen.
    return res.status(200).send("EVENT_RECEIVED");
};
