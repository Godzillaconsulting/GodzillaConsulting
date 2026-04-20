import pool from "../config/db.js";
import { agendarEnGoogleCalendar } from "../services/calendarService.js";
import Groq from "groq-sdk";

import { SYSTEM_PROMPT, chatTools } from "../config/zilla-prompt.js";


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

    // Procesamos primero (Gemini ~2-5s), luego respondemos 200 a Meta.
    // Si el proceso tarda más de 15s, respondemos 200 igual (Meta espera hasta 20s).
    const process = async () => {
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
    };

    // Timeout de 15s para garantizar respuesta dentro de la ventana de Meta (20s)
    const timeout = new Promise(resolve => setTimeout(resolve, 15000));

    try {
        await Promise.race([process(), timeout]);
    } catch (err) {
        console.error('[Webhook] Error procesando evento:', err.message);
    }

    res.sendStatus(200);
};


const userSessions = new Map();

async function processAndReply(from, text, phoneNumberId, platform) {
    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) return console.error(`[${platform}] Error: No GROQ API KEY`);

    const groq = new Groq({ apiKey });

    let history;
    if (!userSessions.has(from)) {
        history = [
            { role: "system", content: SYSTEM_PROMPT }
        ];
        userSessions.set(from, history);
    } else {
        history = userSessions.get(from);
    }

    try {
        history.push({ role: "user", content: text });

        const tool_config = chatTools.map(t => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: {
                     type: "object",
                     properties: t.parameters.properties,
                     required: t.parameters.required
                }
            }
        }));

        let chatCompletion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: history,
            tools: tool_config,
            tool_choice: "auto"
        });

        let responseMessage = null;
        if (chatCompletion && chatCompletion.choices && chatCompletion.choices.length > 0) {
            responseMessage = chatCompletion.choices[0].message;
        }

        let responseText = "Lo siento, fallé al entender.";
        
        if (responseMessage && responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const functionCalls = responseMessage.tool_calls;
            history.push(responseMessage); // Add assistant tool-call to history

            for (const call of functionCalls) {
                let fRes = {};
                const callName = call.function.name;
                let callArgs = {};
                try { callArgs = JSON.parse(call.function.arguments || '{}'); } catch(e){}

                if (callName === "check_availability") {
                    const { fecha, hora } = callArgs;
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                } else if (callName === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                    try {
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
                                console.log(`[${platform}] ✅ Cita #${r.rows[0].id} en Local. Calendar: ${googleRes.id}`);
                                fRes = { success: true, id: r.rows[0].id, personal_calendar_link: googleRes.personalCalendarLink };
                            } else {
                                fRes = { success: false, error: 'Google Calendar no confirmó el evento' };
                            }
                        }
                    } catch (err) {
                        console.error(`[${platform}] Error en save_appointment:`, err.message);
                        fRes = { success: false, error: err.message };
                    }
                } else if (callName === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                } else if (callName === "cancel_appointment") {
                    fRes = { error: 'Funcionalidad de cancelación directa no disponible. Pide al humano que nos asista.' };
                } else if (callName === "reschedule_appointment") {
                    fRes = { error: 'El agendamiento directo de re-programación está en mantenimiento. Pide asistencia humana.' };
                }

                history.push({
                    role: "tool",
                    tool_call_id: call.id,
                    name: callName,
                    content: JSON.stringify(fRes)
                });
            }

            chatCompletion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: history
            });
            if (chatCompletion && chatCompletion.choices && chatCompletion.choices.length > 0) {
                responseMessage = chatCompletion.choices[0].message;
            }
            console.log(`[${platform}] Ejecutó tools:`, functionCalls.map(c => c.function.name).join(", "));
        }

        if (responseMessage && responseMessage.content) {
            responseText = responseMessage.content;
            history.push({ role: "assistant", content: responseText });
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
