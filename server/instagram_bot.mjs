/**
 * Zilla - Bot de Instagram DMs (API Privada, sin Meta Dashboard)
 * Estrategia: instagram-private-api → login → polling de DMs → Gemini → reply
 * 
 * Equivalente a whatsapp-web.js pero para Instagram.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// ── Imports CJS con import() dinámico ─────────────────────────────────────────
const { IgApiClient } = await import('instagram-private-api').then(m => m);
const { getGeminiModel }  = await import('./config/geminiGlobal.js');
const pool                = (await import('./config/db.js')).default;
const { agendarEnGoogleCalendar } = await import('./services/calendarService.js');

// ── Configuración ─────────────────────────────────────────────────────────────
const USERNAME = process.env.IG_USERNAME;
const PASSWORD = process.env.IG_PASSWORD;
const SESSION_FILE = path.join(__dirname, '.wwebjs_auth', 'ig_session.json');
const POLL_INTERVAL_MS = 8000; // Revisar DMs cada 8s

if (!USERNAME || !PASSWORD) {
    console.error('[Instagram] ❌ IG_USERNAME o IG_PASSWORD no configurados en .env');
    process.exit(1);
}

// ── SYSTEM PROMPT (mismo que Zilla web) ───────────────────────────────────────
const SYSTEM_PROMPT = `
# Zilla - Especialista en Performance Marketing IA (Godzilla Consulting)

## IDENTIDAD
Eres Zilla, asistente IA de Godzilla Consulting, agencia liderada por Oscar Villanueva (CEO) en Ciudad Juárez, Chihuahua. Tono: senior, profesional, empático. Usa emojis estratégicamente.

## SERVICIOS
- Automatización de Bots (Web + WhatsApp + Instagram)
- Producción Audiovisual
- Embudos de Venta y SEO
- Gestión de Redes
- CRM/SaaS Personalizado

## PAQUETES (MXN)
1. Posicionamiento Social $7,900/mes
2. Control IA $7,900/mes
3. Expansión $29,900/mes
4. Élite $39,500/mes

## CONTACTO
- WhatsApp/Tel: +52 656 581 8912
- Instagram: https://instagram.com/godzillaconsulting.ai
- Web: https://godzillaconsulting.ai

## PROTOCOLO DE AGENDAMIENTO — ORDEN ESTRICTO
PASO 1: Recopila: Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM), Notas.
PASO 2: Llama a 'check_availability' con fecha y hora.
PASO 3: Si disponible=true → llama 'save_appointment' inmediatamente.
PASO 4: Cuando save_appointment regrese success=true, confirma la cita y comparte el 'personal_calendar_link'.
PASO 5: Si falla → discúlpate y pide intentar de nuevo.

⚠️ REGLA: NUNCA confirmes cita sin haber ejecutado save_appointment exitosamente.
`;

const chatTools = [
    { name: "check_availability", description: "Consulta disponibilidad.",
      parameters: { type: "OBJECT", properties: { fecha: { type: "STRING" }, hora: { type: "STRING" } }, required: ["fecha","hora"] } },
    { name: "save_appointment",  description: "Registra la cita.",
      parameters: { type: "OBJECT", properties: {
          nombre:{type:"STRING"}, correo:{type:"STRING"}, telefono:{type:"STRING"},
          servicio:{type:"STRING"}, fecha:{type:"STRING"}, hora:{type:"STRING"}, notas:{type:"STRING"}
      }, required: ["nombre","correo","telefono","servicio","fecha","hora","notas"] } }
];

// ── Sessions por usuario ───────────────────────────────────────────────────────
const geminiSessions = new Map();
const seenThreads    = new Set(); // threads ya procesados para evitar duplicados

// ── Función de réplica con Gemini ─────────────────────────────────────────────
async function processAndReply(userId, text, ig, replyFn) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const { model, sessions } = getGeminiModel(apiKey, SYSTEM_PROMPT, chatTools);

    let chat;
    if (!sessions.has(userId)) { chat = model.startChat({ history: [] }); sessions.set(userId, chat); }
    else { chat = sessions.get(userId); }

    try {
        let result = await chat.sendMessage(text);
        let responseText = result.response.text();
        const functionCalls = result.response.functionCalls();

        if (functionCalls?.length) {
            const functionResponses = [];
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === 'check_availability') {
                    const { fecha, hora } = call.args;
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                } else if (call.name === 'save_appointment') {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                    try {
                        const dup = await pool.query("SELECT id FROM citas WHERE email=$1 AND fecha=$2 AND hora=$3 AND status='confirmada'", [correo, fecha, hora]);
                        if (dup.rows.length > 0) {
                            fRes = { success: true, id: dup.rows[0].id, message: 'Cita ya registrada' };
                        } else {
                            const googleRes = await agendarEnGoogleCalendar({ nombre, correo, telefono, servicio, fecha, hora, notas });
                            if (googleRes?.id) {
                                const r = await pool.query(
                                    `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_event_id)
                                     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8) RETURNING id`,
                                    [nombre, correo, telefono, servicio, fecha, hora, notas, googleRes.id]
                                );
                                console.log(`[Instagram] ✅ Cita #${r.rows[0].id} para ${nombre}`);
                                fRes = { success: true, id: r.rows[0].id, personal_calendar_link: googleRes.personalCalendarLink };
                            } else {
                                fRes = { success: false, error: 'Google Calendar no confirmó' };
                            }
                        }
                    } catch(err) {
                        fRes = { success: false, error: err.message };
                    }
                }
                functionResponses.push({ functionResponse: { name: call.name, response: fRes } });
            }
            result = await chat.sendMessage(functionResponses);
            responseText = result.response.text();
        }

        // Dividir respuestas largas en chunks (IG tiene límite de ~2000 chars)
        if (responseText.length > 1000) {
            const chunks = responseText.match(/.{1,900}(\s|$)/gs) || [responseText];
            for (const chunk of chunks) {
                await replyFn(chunk.trim());
                await new Promise(r => setTimeout(r, 1500));
            }
        } else {
            await replyFn(responseText);
        }
        console.log(`[Instagram] 🤖 Respondí a ${userId.substring(0,8)}***`);

    } catch(err) {
        console.error('[Instagram] Error Gemini:', err.message);
        await replyFn('Lo siento, tuve un error. Por favor intenta de nuevo 🦖');
    }
}

// ── Login y arranque del bot ──────────────────────────────────────────────────
async function startInstagramBot() {
    const ig = new IgApiClient();
    ig.state.generateDevice(USERNAME);

    // Intentar cargar sesión guardada para evitar login frecuente
    if (existsSync(SESSION_FILE)) {
        try {
            const saved = JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
            await ig.state.deserialize(saved);
            console.log('[Instagram] ✅ Sesión restaurada. Bot listo como @' + USERNAME);
        } catch {
            console.log('[Instagram] ⚠️ Sesión inválida, ejecuta: node server/ig_setup.cjs');
            process.exit(1);
        }
    } else {
        // Sin sesión guardada → ejecutar ig_setup.cjs primero
        console.error('[Instagram] ❌ No hay sesión guardada.');
        console.error('[Instagram]   Ejecuta primero: node server/ig_setup.cjs');
        process.exit(1);
    }

    console.log(`[Instagram] 📲 Bot activo. Revisando DMs cada ${POLL_INTERVAL_MS/1000}s...`);

    // ── Polling de Direct Messages ────────────────────────────────────────────
    while (true) {
        try {
            const inbox = await ig.feed.directInbox().items();

            for (const thread of inbox) {
                // Solo threads sin respuesta del bot (last message no es del bot)
                const lastMsg  = thread.items?.[0];
                const threadId = thread.thread_id;

                if (!lastMsg || lastMsg.item_type !== 'text') continue;

                // Ignorar si el último mensajes lo enviamos nosotros
                const isFromUs = lastMsg.user_id === (await ig.state.cookiePk).toString();
                if (isFromUs) continue;

                // Generar clave única por mensaje para evitar procesar dos veces
                const msgKey = `${threadId}_${lastMsg.item_id}`;
                if (seenThreads.has(msgKey)) continue;
                seenThreads.add(msgKey);

                const userId  = lastMsg.user_id.toString();
                const msgText = lastMsg.text;
                console.log(`[Instagram] 📩 Nuevo DM de ${userId.substring(0,6)}***: ${msgText.substring(0,50)}`);

                // Procesar con Gemini y responder
                await processAndReply(userId, msgText, ig, async (replyText) => {
                    await ig.directThread.broadcastText({ threadIds: [threadId], text: replyText });
                });
            }
        } catch(err) {
            if (err.name === 'IgLoginRequiredError') {
                console.error('[Instagram] ❌ Sesión expirada. Reiniciando en 30s...');
                await new Promise(r => setTimeout(r, 30000));
                process.exit(1); // PM2 va a reiniciar
            } else if (err.message?.includes('rate_limit') || err.message?.includes('429')) {
                console.warn('[Instagram] ⏳ Rate limit hit. Esperando 60s...');
                await new Promise(r => setTimeout(r, 60000));
            } else {
                console.error('[Instagram] Error en polling:', err.message);
            }
        }

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
}

startInstagramBot();
