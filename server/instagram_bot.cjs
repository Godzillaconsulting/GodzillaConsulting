/**
 * instagram_bot.cjs — Bot de Instagram DMs (CJS, sin Meta Dashboard)
 * 
 * USA la misma sesión guardada por ig_setup.cjs
 * Polling de DMs cada 8s → Gemini AI → Reply
 */

const path         = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { IgApiClient } = require('instagram-private-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');

// ── Config ────────────────────────────────────────────────────────────────────
const USERNAME     = process.env.IG_USERNAME;
const SESSION_FILE = path.join(__dirname, '.wwebjs_auth', 'ig_session.json');
const POLL_MS      = 8000;

// ── DB Pool ────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Google Calendar ────────────────────────────────────────────────────────────
const { google } = require('googleapis');
function getCalendarClient() {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY_B64
        ? Buffer.from(process.env.GOOGLE_PRIVATE_KEY_B64, 'base64').toString('utf8')
        : (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar']
    });
    return google.calendar({ version: 'v3', auth });
}

async function agendarEnGoogleCalendar(datos) {
    const { nombre, correo, telefono, servicio, fecha, hora, notas } = datos;
    const startDateTime = new Date(`${fecha}T${hora}:00-06:00`);
    const endDateTime   = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const personalCalendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(`Consultoría Godzilla Consulting - ${servicio}`)}` +
        `&dates=${fmt(startDateTime)}/${fmt(endDateTime)}` +
        `&details=${encodeURIComponent(`📋 Servicio: ${servicio}\n📞 Godzilla: +52 656 581 8912`)}` +
        `&ctz=America%2FCiudad_Juarez`;

    const calendar = getCalendarClient();
    const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: {
            summary: `Cita: ${servicio} - ${nombre}`,
            description: `📞 Tel: ${telefono}\n📧 Email: ${correo}\n📝 Notas: ${notas}`,
            start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Ciudad_Juarez' },
            end:   { dateTime: endDateTime.toISOString(),   timeZone: 'America/Ciudad_Juarez' },
        },
        sendUpdates: 'none',
    });
    return { ...response.data, personalCalendarLink };
}

// ── SYSTEM PROMPT ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
# Zilla — Asistente IA de Godzilla Consulting (Instagram DMs)
Eres Zilla, consultor senior de Godzilla Consulting, agencia de Oscar Villanueva en Ciudad Juárez. Tono: profesional, empático, con emojis estratégicos. NO uses markdown (*bold*, etc.) en respuestas de Instagram — el texto plano funciona mejor en DMs.

## SERVICIOS: Automatización de Bots | Producción Audiovisual | Embudos de Venta | SEO | CRM/SaaS

## PAQUETES (MXN):
 - Posicionamiento Social $7,900/mes
 - Control IA $7,900/mes
 - Expansión $29,900/mes
 - Élite $39,500/mes

## CONTACTO: WhatsApp +52 656 581 8912 | Web: godzillaconsulting.ai

## PROTOCOLO AGENDAMIENTO - ORDEN ESTRICTO:
PASO 1: Recopila — Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM), Notas (o "ninguna").
PASO 2: Llama check_availability con fecha y hora.
PASO 3: Si disponible → llama save_appointment con todos los datos.
PASO 4: Cuando success=true → confirma y comparte el personal_calendar_link.
PASO 5: Si falla → discúlpate y pide intentar de nuevo.

NUNCA confirmes cita sin ejecutar save_appointment exitosamente.
`;

const chatTools = [{
    name: 'check_availability',
    description: 'Verifica si hay disponibilidad.',
    parameters: { type: 'OBJECT', properties: { fecha: { type: 'STRING' }, hora: { type: 'STRING' } }, required: ['fecha','hora'] }
},{
    name: 'save_appointment',
    description: 'Guarda la cita en Calendar + Local.',
    parameters: {
        type: 'OBJECT',
        properties: {
            nombre:{type:'STRING'}, correo:{type:'STRING'}, telefono:{type:'STRING'},
            servicio:{type:'STRING'}, fecha:{type:'STRING'}, hora:{type:'STRING'}, notas:{type:'STRING'}
        },
        required: ['nombre','correo','telefono','servicio','fecha','hora','notas']
    }
}];

// ── Gemini Sessions ────────────────────────────────────────────────────────────
const genAI    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiSessions = new Map();

let currentSystemPrompt = SYSTEM_PROMPT; // Usado como fallback inicial
let lastPromptCheck = 0;

async function getSystemPrompt() {
    // Sincronizar con el Cerebro Central cada minuto (60,000 ms)
    if (Date.now() - lastPromptCheck > 60000) {
        try {
            const res = await pool.query("SELECT dm_system_prompt FROM bot_configs WHERE plataforma = 'instagram'");
            if (res.rows.length > 0 && res.rows[0].dm_system_prompt) {
                const newPrompt = res.rows[0].dm_system_prompt;
                if (newPrompt !== currentSystemPrompt) {
                    currentSystemPrompt = newPrompt;
                    geminiSessions.clear(); // Forzar reinicio de sesiones para que adopten la nueva instrucción
                    console.log('[Instagram] 🔄 SYSTEM PROMPT actualizado y sincronizado desde Cerebro Central');
                }
            }
            lastPromptCheck = Date.now();
        } catch(e) {
            console.error('[Instagram] Error consultando bot_configs:', e.message);
        }
    }
    return currentSystemPrompt;
}

async function getChat(userId) {
    const activePrompt = await getSystemPrompt();
    if (!geminiSessions.has(userId)) {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: { parts: [{ text: activePrompt }] },
            tools: [{ function_declarations: chatTools }],
        });
        geminiSessions.set(userId, model.startChat({ history: [] }));
    }
    return geminiSessions.get(userId);
}

// ── Procesar mensaje y responder ──────────────────────────────────────────────
async function processAndReply(userId, text, replyFn) {
    const chat = await getChat(userId);
    try {
        let result = await chat.sendMessage(text);
        const functionCalls = result.response.functionCalls();

        if (functionCalls?.length) {
            const responses = [];
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === 'check_availability') {
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [call.args.fecha, call.args.hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                } else if (call.name === 'save_appointment') {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                    try {
                        const dup = await pool.query("SELECT id FROM citas WHERE email=$1 AND fecha=$2 AND hora=$3 AND status='confirmada'", [correo, fecha, hora]);
                        if (dup.rows.length > 0) {
                            fRes = { success: true, id: dup.rows[0].id };
                        } else {
                            const gRes = await agendarEnGoogleCalendar({ nombre, correo, telefono, servicio, fecha, hora, notas });
                            if (gRes?.id) {
                                const r = await pool.query(
                                    `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_event_id, origen)
                                     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada',$8,'instagram') RETURNING id`,
                                    [nombre, correo, telefono, servicio, fecha, hora, notas, gRes.id]
                                );
                                
                                if (correo && correo !== 'sin-correo@ig.com') {
                                    try {
                                        const { sendCitaConfirmationEmail } = await import('./services/emailService.js');
                                        await sendCitaConfirmationEmail({
                                            nombre,
                                            email: correo,
                                            fecha,
                                            hora,
                                            tipoSesion: servicio,
                                            personalCalendarLink: gRes.personalCalendarLink
                                        });
                                    } catch(e) {
                                        console.error('[Instagram] ❌ Send email error:', e.message);
                                    }
                                }

                                console.log(`[Instagram] ✅ Cita #${r.rows[0].id} guardada y correo enviado.`);
                                fRes = { success: true, id: r.rows[0].id, personal_calendar_link: gRes.personalCalendarLink };
                            } else {
                                fRes = { success: false, error: 'Google Calendar no confirmó' };
                            }
                        }
                    } catch(err) { fRes = { success: false, error: err.message }; }
                }
                responses.push({ functionResponse: { name: call.name, response: fRes } });
            }
            result = await chat.sendMessage(responses);
        }

        const responseText = result.response.text();
        // Instagram DMs soportan ~1000 chars por mensaje
        if (responseText.length > 900) {
            const chunks = responseText.match(/.{1,800}(\s|$)/gs) || [responseText];
            for (const chunk of chunks) {
                await replyFn(chunk.trim());
                await new Promise(r => setTimeout(r, 1500));
            }
        } else {
            await replyFn(responseText);
        }
        console.log(`[Instagram] 🤖 Respondí a ${userId.toString().substring(0,8)}***`);

    } catch(err) {
        console.error('[Instagram] Error Gemini:', err.message);
        try { await replyFn('Lo siento, tuve un error. Por favor intenta de nuevo 🦖'); } catch(_) {}
    }
}

// ── Main Loop ──────────────────────────────────────────────────────────────────
const seenItems = new Set();

async function startBot() {
    if (!existsSync(SESSION_FILE)) {
        console.error('[Instagram] ❌ Sin sesión. Ejecuta: node server/ig_setup.cjs');
        console.error('[Instagram] 🛑 BOT PAUSADO. Entrando en cuarentena para evitar bucles de PM2...');
        setInterval(() => {}, 60000); // Mantiene el Event Loop vivo
        await new Promise(() => {}); // Pausa infinita para evitar restarts de PM2
    }

    const ig = new IgApiClient();

    // ┌─────────────────────────────────────────────────────────────────────────┐
    // │ CRÍTICO: Deserializar PRIMERO para restaurar el device fingerprint      │
    // │ exacto con el que se hizo login. Si llamamos generateDevice() antes,    │
    // │ Instagram detecta un "nuevo dispositivo" y lanza checkpoint_required.   │
    // └─────────────────────────────────────────────────────────────────────────┘
    const saved = JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
    await ig.state.deserialize(saved);

    // PATCH para saltar el "unsupported_version" block de Meta
    ig.state.appVersion = '314.0.0.35.109';
    ig.state.appVersionCode = '3140035109';

    // Verificar sesión con una llamada real
    try {
        const me = await ig.account.currentUser();
        console.log(`[Instagram] ✅ Sesión activa como @${me.username} (${me.full_name})`);
    } catch(err) {
        const isCheckpoint = err.message?.includes('checkpoint_required') || err.response?.body?.checkpoint_url;
        if (isCheckpoint) {
            console.error('[Instagram] ❌ Sesión inválida — Instagram pide verificación de nuevo dispositivo.');
            console.error('[Instagram]    Abre Instagram en tu celular → aprueba el inicio de sesión → ejecuta node server/ig_setup.cjs');
        } else {
            console.error('[Instagram] ❌ Sesión inválida (error', err.message, '). Ejecuta node server/ig_setup.cjs de nuevo.');
        }
        console.error('[Instagram] 🛑 BOT PAUSADO. Entrando en cuarentena para evitar bucles (spam a Meta)...');
        setInterval(() => {}, 60000); // Mantiene el Event Loop vivo
        await new Promise(() => {}); // Pausa infinita para la ejecución actual
    }

    console.log(`[Instagram] 📲 Polling DMs cada ${POLL_MS/1000}s...`);

    while (true) {
        try {
            const threads = await ig.feed.directInbox().items();

            for (const thread of threads) {
                const lastMsg = thread.items?.[0];
                if (!lastMsg || lastMsg.item_type !== 'text') continue;

                // Ignorar mensajes propios
                if (lastMsg.user_id?.toString() === ig.state.cookieUserId) continue;

                const msgKey = `${thread.thread_id}_${lastMsg.item_id}`;
                if (seenItems.has(msgKey)) continue;
                seenItems.add(msgKey);

                const userId  = lastMsg.user_id.toString();
                const msgText = lastMsg.text;
                console.log(`[Instagram] 📩 DM de ${userId.substring(0,6)}***: ${msgText.substring(0,50)}`);

                processAndReply(userId, msgText, async (reply) => {
                    await ig.directThread.broadcastText({ threadIds: [thread.thread_id], text: reply });
                }).catch(e => console.error('[Instagram] Reply error:', e.message));
            }

            // Guardar sesión actualizada periódicamente
            const fresh = await ig.state.serialize();
            delete fresh.constants;
            writeFileSync(SESSION_FILE, JSON.stringify(fresh));

        } catch(err) {
            const code = err?.response?.statusCode;
            if (code === 467 || code === 401 || err.name === 'IgLoginRequiredError') {
                console.error('[Instagram] ❌ Sesión expirada. Ejecuta node server/ig_setup.cjs para renovar.');
                console.error('[Instagram] 🛑 BOT PAUSADO. Entrando en cuarentena para evitar bucles de PM2...');
                setInterval(() => {}, 60000); // Mantiene el Event Loop vivo
                await new Promise(() => {}); // Pausa infinita para evitar restarts de PM2
            } else if (err.message?.includes('429') || err.message?.includes('rate_limit')) {
                console.warn('[Instagram] ⏳ Rate limit. Esperando 2 minutos...');
                await new Promise(r => setTimeout(r, 120000));
            } else {
                console.error('[Instagram] Error polling:', err.message);
            }
        }

        await new Promise(r => setTimeout(r, POLL_MS));
    }
}

startBot().catch(err => {
    console.error('[Instagram] Fatal:', err.message);
    process.exit(1);
});
