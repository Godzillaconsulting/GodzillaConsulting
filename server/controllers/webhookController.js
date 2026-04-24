import pool from "../config/db.js";
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from "../services/calendarService.js";
import { validateBusinessHours } from '../utils/businessHours.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from 'groq-sdk';

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
    
        const hoyStr = new Date().toLocaleString('es-MX', {timeZone: 'America/Denver'});
        const systemPromptContexto = `\n\n[CONTEXTO TEMPORAL CRÍTICO]: HOY ES ${hoyStr}. NO USES JAMÁS FECHAS DEL PASADO.`;
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return console.error(`[${platform}] Error: No GEMINI API KEY`);

    let history;
    if (!userSessions.has(from)) {
        history = [];
        userSessions.set(from, history);
    } else {
        history = userSessions.get(from);
    }

    try {
        history.push({ role: "user", parts: [{ text }] });

        let groqMessages = [
            { role: "system", content: SYSTEM_PROMPT + systemPromptContexto }
        ];

        let rawHistory = history.slice(0, -1);
        for (const msg of rawHistory) {
            groqMessages.push({
                role: (msg.role === "assistant" || msg.role === "model") ? "assistant" : "user",
                content: msg.parts[0].text
            });
        }
        groqMessages.push({ role: "user", content: text });

        const groqTools = chatTools.map(t => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        }));

        if (!process.env.CEREBRAS_API_KEY) {
            console.error("CEREBRAS_API_KEY no configurada.");
        }

        let responseText = "Lo siento, fallé al entender.";
        let functionCalls = [];

        try {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: groqMessages,
                    model: "llama3.1-70b",
                    tools: groqTools,
                    temperature: 0.1,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                throw new Error(`Cerebras Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                const responseMessage = data.choices[0].message;
                responseText = responseMessage.content || "";
                
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    groqMessages.push(responseMessage);
                    functionCalls = responseMessage.tool_calls.map(tc => {
                        let parsedArgs = {};
                        try { parsedArgs = JSON.parse(tc.function.arguments); } catch(e){}
                        return {
                            name: tc.function.name,
                            args: parsedArgs,
                            id: tc.id
                        };
                    });
                }
            }
        } catch(error) {
            console.error(`[${platform}] Cerebras Error:`, error.message);
        }
        
        if (functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = {};
                const callName = call.name;
                let callArgs = call.args || {};

                if (callName === "check_availability") {
                    const { fecha, hora } = callArgs;
                    const valErr = validateBusinessHours(fecha, hora);

                    if (valErr) {
                        fRes = { disponible: false, razon: valErr };
                    } else {
                        const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'", [fecha, hora]);
                        fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                    }
                } else if (callName === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                    const valErr = validateBusinessHours(fecha, hora);

                    if (valErr) {
                        fRes = { success: false, error: valErr };
                    } else {
                        try {
                            const dup = await pool.query(
                                "SELECT id FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'",
                                [fecha, hora]
                            );
                            if (dup.rows.length > 0) {
                                fRes = { success: false, error: "Horario ocupado." };
                            } else {
                                let calendarId = null;
                                const googleRes = await agendarEnGoogleCalendar({ nombre, correo: correo || 'sin-correo@meta.com', telefono, servicio, fecha, hora, notas: notas || '' });
                                if (googleRes && googleRes.id) {
                                    calendarId = googleRes.id;
                                    try {
                                        const r = await pool.query(
                                            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_id, origen)
                                             VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8,$9) RETURNING id`,
                                            [nombre, correo || 'sin-correo@meta.com', telefono, servicio, fecha, hora, notas || '', calendarId, platform]
                                        );
                                        console.log(`[${platform}] ✅ Cita #${r.rows[0].id} en Local. Calendar: ${calendarId}`);
                                        fRes = { success: true, id: r.rows[0].id, personal_calendar_link: googleRes.personalCalendarLink };
                                    } catch (dbErr) {
                                        if (calendarId) await cancelarEnGoogleCalendar(calendarId).catch(() => {});
                                        fRes = { success: false, error: dbErr.message };
                                    }
                                } else {
                                    fRes = { success: false, error: 'Google Calendar no confirmó el evento' };
                                }
                            }
                        } catch (err) {
                            console.error(`[${platform}] Error en save_appointment:`, err.message);
                            fRes = { success: false, error: err.message };
                        }
                    }
                } else if (callName === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                } else if (callName === "cancel_appointment") {
                    const { telefono } = callArgs;
                    try {
                        const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                        if (result.rows.length === 0) {
                            fRes = { success: false, error: "No encontré cita activa con ese número." };
                        } else {
                            const cita = result.rows[0];
                            if (cita.google_calendar_id) await cancelarEnGoogleCalendar(cita.google_calendar_id);
                            await pool.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita.id]);
                            fRes = { success: true, message: "Cita cancelada correctamente." };
                        }
                    } catch (e) { fRes = { success: false, error: e.message }; }
                } else if (callName === "reschedule_appointment") {
                    const { telefono, nueva_fecha, nueva_hora } = callArgs;
                    try {
                        const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                        if (result.rows.length === 0) {
                            fRes = { success: false, error: "No encontré ninguna cita previa." };
                        } else {
                            const cita = result.rows[0];
                            const valErr = validateBusinessHours(nueva_fecha, nueva_hora);
                            if (valErr) {
                                fRes = { success: false, error: valErr };
                            } else {
                                const dup = await pool.query("SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'", [nueva_fecha, nueva_hora]);
                                if (parseInt(dup.rows[0].total) > 0) fRes = { success: false, error: "Ese horario está ocupado." };
                                else {
                                    if (cita.google_calendar_id) await actualizarEnGoogleCalendar(cita.google_calendar_id, nueva_fecha, nueva_hora);
                                    await pool.query("UPDATE citas SET fecha = $1, hora = $2 WHERE id = $3", [nueva_fecha, nueva_hora, cita.id]);
                                    fRes = { success: true, message: "Reagendada." };
                                }
                            }
                        }
                    } catch (e) { fRes = { success: false, error: e.message }; }
                }

                groqMessages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    name: callName,
                    content: JSON.stringify(fRes)
                });
            }
            
            try {
                const response2 = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: groqMessages,
                        model: "llama3.1-70b",
                        temperature: 0.1,
                        max_tokens: 1024
                    })
                });

                if (response2.ok) {
                    const data2 = await response2.json();
                    if (data2.choices && data2.choices.length > 0) {
                        responseText = data2.choices[0].message.content || responseText;
                    }
                } else {
                    console.error(`[${platform}] Error Cerebras HTTP:`, response2.status);
                }
            } catch(e) {
                console.error(`[${platform}] Error en segunda llamada Cerebras:`, e.message);
            }
            console.log(`[${platform}] Ejecutó tools:`, functionCalls.map(c => c.name).join(", "));
        }

        history.push({ role: "model", parts: [{ text: responseText }] });

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
