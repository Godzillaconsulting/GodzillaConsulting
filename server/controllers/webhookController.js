import pool from "../config/db.js";
import { agendarEnGoogleCalendar } from "../services/calendarService.js";
import { getGeminiModel } from "../config/geminiGlobal.js";

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
PASO 3: Si check_availability devuelve disponible=true, llama a 'save_appointment' con TODOS los datos.
PASO 4: Después de que save_appointment regrese success=true, confirma la cita y comparte el 'personal_calendar_link' para que el usuario la guarde en SU Google Calendar.
PASO 5: Si save_appointment falla, discúlpate y pide intentarlo de nuevo.

⚠️ REGLA CRÍTICA: Nunca confirmes la cita sin haber ejecutado save_appointment exitosamente.
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


export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = process.env.MY_VERIFY_TOKEN || process.env.VERIFY_TOKEN || "GodzillaSecret2026";
    
    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('[Webhook] Meta verificado exitosamente');
            res.status(200).send(challenge);
        } else {
            console.error('[Webhook] Fallo verificación de Token');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

export const receiveMessage = async (req, res) => {
    const body = req.body;
    
    if (!body.object) {
        return res.sendStatus(404);
    }

    // Meta REQUIERE respuesta 200 antes de 20s
    res.sendStatus(200);

    try {
        // ── FACEBOOK MESSENGER ─────────────────────────────────────────────────
        if (body.object === 'page') {
            for (const entry of body.entry) {
                const webhook_event = entry.messaging?.[0];
                if (!webhook_event) continue;
                const sender_psid = webhook_event.sender.id;
                const page_id     = webhook_event.recipient.id;
                if (sender_psid === page_id) continue; // ignorar eco
                if (webhook_event.message?.text && !webhook_event.message?.is_echo) {
                    console.log(`[Messenger] Msg de ${sender_psid.substring(0,6)}***`);
                    await processAndReply(sender_psid, webhook_event.message.text, null, 'messenger');
                }
            }

        // ── INSTAGRAM DMs ────────────────────────────────────────────────────
        } else if (body.object === 'instagram') {
            for (const entry of body.entry) {
                const webhook_event = entry.messaging?.[0];
                if (!webhook_event) continue;
                const sender_igsid  = webhook_event.sender.id;
                const ig_account_id = webhook_event.recipient.id;
                if (sender_igsid === ig_account_id) continue; // ignorar eco propio
                if (webhook_event.message?.text && !webhook_event.message?.is_echo) {
                    const msgText = webhook_event.message.text;
                    console.log(`[Instagram] 📸 Mensaje de IGSID ${sender_igsid.substring(0,6)}***: ${msgText.substring(0,50)}`);
                    await processAndReply(sender_igsid, msgText, null, 'instagram');
                } else if (webhook_event.message?.attachments) {
                    // Imagen / sticker — responder genéricamente
                    console.log(`[Instagram] 📸 Adjunto recibido de ${sender_igsid.substring(0,6)}***`);
                    await processAndReply(sender_igsid, '(imagen/adjunto)', null, 'instagram');
                }
            }

        // ── WHATSAPP BUSINESS API ────────────────────────────────────────────
        } else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            const message       = body.entry[0].changes[0].value.messages[0];
            const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
            const from          = message.from;
            const msgBody       = message.text?.body || '';
            if (msgBody) {
                console.log(`[WhatsApp API] Mensaje de ${from.substring(0,4)}***`);
                await processAndReply(from, msgBody, phoneNumberId, 'whatsapp');
            }
        }
    } catch (err) {
        console.error('[Webhook] Error procesando evento:', err.message);
    }
};


async function processAndReply(from, text, phoneNumberId, platform) {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return console.error(`[${platform}] Error: No Gemini API KEY`);

    const { model, sessions } = getGeminiModel(apiKey, SYSTEM_PROMPT, chatTools);

    let chat;
    if (!sessions.has(from)) {
        chat = model.startChat({ history: [] });
        sessions.set(from, chat);
    } else {
        chat = sessions.get(from);
    }

    try {
        let result = await chat.sendMessage(text);
        let responseText = result.response.text();

        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            const functionResponses = [];
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === "check_availability") {
                    const { fecha, hora } = call.args;
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                } else if (call.name === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                    try {
                        // Verificar duplicado primero
                        const dup = await pool.query(
                            "SELECT id FROM citas WHERE email=$1 AND fecha=$2 AND hora=$3 AND status='confirmada'",
                            [correo, fecha, hora]
                        );
                        if (dup.rows.length > 0) {
                            fRes = { success: true, id: dup.rows[0].id, message: 'Cita ya registrada' };
                        } else {
                            const googleRes = await agendarEnGoogleCalendar({ nombre, correo, telefono, servicio, fecha, hora, notas });
                            if (googleRes && googleRes.id) {
                                const r = await pool.query(
                                    `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_event_id)
                                     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8) RETURNING id`,
                                    [nombre, correo, telefono, servicio, fecha, hora, notas, googleRes.id]
                                );
                                console.log(`[${platform}] ✅ Cita #${r.rows[0].id} en Neon. Calendar: ${googleRes.id}`);
                                fRes = { success: true, id: r.rows[0].id, personal_calendar_link: googleRes.personalCalendarLink };
                            } else {
                                fRes = { success: false, error: 'Google Calendar no confirmó el evento' };
                            }
                        }
                    } catch (err) {
                        console.error(`[${platform}] Error en save_appointment:`, err.message);
                        fRes = { success: false, error: err.message };
                    }
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                }
                functionResponses.push({ functionResponse: { name: call.name, response: fRes } });
            }
            result = await chat.sendMessage(functionResponses);
            responseText = result.response.text();
            console.log(`[${platform}] Ejecutó tools:`, functionCalls.map(c => c.name).join(", "));
        }

        if (platform === 'whatsapp') {
            await sendWhatsAppMessage(phoneNumberId, from, responseText);
        } else if (platform === 'messenger') {
            await sendMessengerMessage(from, responseText);
        } else if (platform === 'instagram') {
            await sendInstagramMessage(from, responseText);
        }

    } catch(err) {
        console.error(`[${platform}] Error procesando con Gemini:`, err);
    }
}

async function sendWhatsAppMessage(phoneNumberId, to, text) {
    const token = process.env.WP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    if (!token) return console.error("[WhatsApp] WP_ACCESS_TOKEN no encontrado en .env");

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: text }
            })
        });
        const data = await response.json();
        if (data.error) console.error("[WhatsApp] Error respondiendo a Meta:", data.error.message);
        else console.log(`[WhatsApp] Respuesta enviada satisfactoriamente a ${to}`);
    } catch(e) {
        console.error("[WhatsApp] Fallo de conexión con Meta API:", e);
    }
}

async function sendMessengerMessage(sender_psid, text) {
    const token = process.env.PAGE_ACCESS_TOKEN;
    if (!token) return console.error("[Messenger] PAGE_ACCESS_TOKEN no encontrado en .env");

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: { id: sender_psid },
                message: { text: text }
            })
        });
        const data = await response.json();
        if (data.error) console.error("[Messenger] Error respondiendo a Facebook:", data.error.message);
        else console.log(`[Messenger] Respuesta enviada satisfactoriamente a ${sender_psid}`);
    } catch(e) {
        console.error("[Messenger] Fallo de conexión con Meta API:", e);
    }
}

async function sendInstagramMessage(ig_recipient_id, text) {
    const token = process.env.PAGE_ACCESS_TOKEN;
    if (!token) return console.error("[Instagram] ❌ PAGE_ACCESS_TOKEN no configurado");

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: { id: ig_recipient_id },
                message: { text: text }
            })
        });
        const data = await response.json();
        if (data.error) {
            console.error(`[Instagram] ❌ Error ${data.error.code}: ${data.error.message}`);
            console.error(`[Instagram] Subcode: ${data.error.error_subcode} | Type: ${data.error.type}`);
        } else {
            console.log(`[Instagram] ✅ Respuesta enviada a ${ig_recipient_id.substring(0,6)}***`);
        }
    } catch(e) {
        console.error("[Instagram] ❌ Fallo de conexión:", e.message);
    }
}
