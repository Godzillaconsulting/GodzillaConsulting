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

## PAQUETES Y GARANTÍAS (MXN)
1. **Posicionamiento Social ($7,900/mes)**: CM y estrategia omnicanal. (Garantía de engagement en 14 días).
2. **Control IA ($7,900/mes)**: Agente IA 24/7. (Garantía de funcionamiento en 7 días).
3. **Expansión ($29,900/mes)**: Tráfico bilingüe y Landing Page. (Garantía de leads en 30 días o devolución).
4. **Élite ($39,500/mes)**: Estrategia Godfather y consultoría. (Garantía de +20% citas en 90 días).

## REGLAS DE COMPORTAMIENTO
1. **PERSONALIDAD**: Tono Senior, profesional, empático y seguro de sí mismo.
2. **EMOJIS**: Usa emojis para que la conversación sea cercana y moderna (ej: 🚀, 📈, 🦖). Úsalos de forma estratégica, un par por respuesta es ideal para no parecer un bot genérico, pero evita saturar cada renglón.
3. **CONCISO PERO VALIOSO**: No le des biblias a leer en WhatsApp.
4. **DOMINIO E IDENTIDAD**: Eres el asistente oficial de **godzillaconsulting.ai**. Solo marketing e IA de ventas. Si el usuario te pide las redes sociales, el sitio web oficial o agendar, **DEBES dárselos explícitamente usando únicamente el dominio oficial godzillaconsulting.ai** (o sus subdominios oficiales).

## CONTACTO Y REDES SOCIALES OFICIALES
- **Teléfono Oficial / WhatsApp**: +52 656 581 8912
- **Instagram**: https://instagram.com/godzillaconsulting.ai
- **Facebook**: https://facebook.com/GodzillaConsulting
- **TikTok**: https://tiktok.com/@godzillaconsulting.ai
- **Sitio Web**: https://godzillaconsulting.ai
`;

// Helper para guardar mensajes en la base de datos Neon (Manejará tanto user como bot)
async function saveMessage(senderId, platform, role, content) {
    try {
        await pool.query(
            "INSERT INTO chats_redes (sender_id, plataforma, role, content) VALUES ($1, $2, $3, $4)",
            [senderId, platform, role, content]
        );
    } catch (e) {
        console.error("❌ Error guardando historial en la DB:", e.message);
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

    // Le retornamos un 200 rápido a Meta para que sepamos que lo recibimos (Standard Meta Practice)
    res.status(200).send("EVENT_RECEIVED");

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
            // Si el webhook trae id de IG, es Instagram, si es de página de Facebook, es Messenger
            platform = entry.id.toString().includes("ig") ? "instagram" : "messenger"; // Esto puede variar, lo manejamos genérico por ahora
            if (req.query.platform) platform = req.query.platform; // Si queremos forzarlo por Query String en el webhook
            
            messageText = msgObj.message.text;
            senderId = msgObj.sender.id;
        }

        // Si no es un mensaje de texto válido (ej: updates de estado, leídos, etc), ignoramos
        if (!messageText || !senderId) return;

        console.log(`📩 Mensaje recibido de [${senderId}] vía [${platform}]: ${messageText}`);

        // 2.b Guardar mensaje entrante del usuario en la Base de Datos
        await saveMessage(senderId, platform, "user", messageText);

        // 2.c Obtener el historial reciente del usuario para dárselo a Gemini
        const contextHistoryRaw = await pool.query(
            "SELECT role, content FROM chats_redes WHERE sender_id=$1 ORDER BY created_at ASC LIMIT 10",
            [senderId]
        );

        // Formatear el historial para Gemini-2.0-flash
        const geminiHistory = contextHistoryRaw.rows.slice(0, -1).map(row => ({
            role: row.role === "assistant" || row.role === "model" ? "model" : "user",
            parts: [{ text: row.content }]
        }));

        // 2.d Iniciar Gemini y generar respuesta
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: SYSTEM_PROMPT,
        });

        const chat = model.startChat({ history: geminiHistory });
        let result = await chat.sendMessage(messageText);
        let botReply = result.response.text();

        console.log(`🤖 Zilla Bot preparado para responder vía [${platform}]:`, botReply.substring(0, 50) + '...');

        // 2.e Guardar la respuesta generada por el bot en la DB
        await saveMessage(senderId, platform, "model", botReply);

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
};
