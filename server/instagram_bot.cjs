/**
 * instagram_bot.cjs — Bot de Instagram DMs (CJS, sin Meta Dashboard)
 * 
 * USA la misma sesión guardada por ig_setup.cjs
 * Polling de DMs cada 8s → Gemini AI → Reply
 */

const path         = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const chatSessions = new Map();

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
                    chatSessions.clear(); // Forzar reinicio de sesiones para que adopten la nueva instrucción
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

async function getChatHistory(userId) {
    const activePrompt = await getSystemPrompt();
    if (!chatSessions.has(userId)) {
        chatSessions.set(userId, []);
    }
    return { history: chatSessions.get(userId), prompt: activePrompt };
}

// ── Procesar mensaje y responder ──────────────────────────────────────────────
async function processAndReply(userId, text, replyFn) {
    const sessionData = await getChatHistory(userId);
    const history = sessionData.history;
    const finalSystemPrompt = sessionData.prompt;
    try {
        history.push({ role: 'user', parts: [{ text }] });

        const geminiTools = [{
            functionDeclarations: chatTools.map(t => ({
                name: t.name,
                description: t.description,
                parameters: {
                    type: "OBJECT",
                    properties: Object.fromEntries(
                        Object.entries(t.parameters.properties).map(([k, v]) => [k, typeof v === 'object' ? { type: "STRING", description: v.description } : v])
                    ),
                    ...(t.parameters.required ? { required: t.parameters.required } : {})
                }
            }))
        }];

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: finalSystemPrompt,
            tools: geminiTools,
            generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95
            }
        });

        const chat = model.startChat({ history: history.slice(0, -1) });
        let chatCompletion = await chat.sendMessage(text);
        
        let responseText = "Lo siento, fallé al entender.";
        let functionCalls = [];

        if (chatCompletion && chatCompletion.response) {
            const response = chatCompletion.response;
            try { responseText = response.text() || responseText; } catch(e){}
            const calls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
            if (calls && calls.length > 0) {
                functionCalls = calls;
            }
        }

        if (functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = {};
                const callName = call.name;
                let callArgs = call.args || {};

                if (callName === 'check_availability') {
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [callArgs.fecha, callArgs.hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                } else if (callName === 'save_appointment') {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
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

                // Send tool results back to Gemini via existing chat object
                const chatCompletion2 = await chat.sendMessage([{
                    functionResponse: { name: callName, response: fRes }
                }]);
                
                if (chatCompletion2 && chatCompletion2.response) {
                    try { responseText = chatCompletion2.response.text() || 'Reserva procesada.'; } catch(e){}
                }
            }
        }

        history.push({ role: 'model', parts: [{ text: responseText }] });
        
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
        console.error('[Instagram] Error Groq:', err.message);
        try { await replyFn('Lo siento, tuve un error. Por favor intenta de nuevo 🦖'); } catch(_) {}
    }
}

// ── Main Loop ──────────────────────────────────────────────────────────────────
const seenItems = new Set();
const userDataDir = path.join(__dirname, '.puppeteer_ig_profile');
let browserClient;

async function startBot() {
    if (!existsSync(userDataDir)) {
        console.error('[Instagram] ❌ Perfil no encontrado. Ejecuta: node server/ig_puppeteer_setup.cjs');
        console.error('[Instagram] 🛑 BOT PAUSADO. Entrando en cuarentena para evitar bucles de PM2...');
        setInterval(() => {}, 60000);
        await new Promise(() => {});
    }

    console.log('[Instagram] 🚀 Arrancando ZillaBot con motor Puppeteer Stealth (Anti-Baneos)...');
    
    // Optimizaciones Extremas de RAM (Sin romper la capa visual para Analytics)
    const browser = await puppeteer.launch({
        headless: true,
        userDataDir: userDataDir,
        args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
        ]
    });
    browserClient = browser;

    const page = await browser.newPage();
    // Navegamos a Instagram para inicializar cookies completas y entorno web nativo
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    let cookies = await page.cookies();
    let csrfToken = cookies.find(c => c.name === 'csrftoken')?.value;
    let myUserId = cookies.find(c => c.name === 'ds_user_id')?.value;

    if (!csrfToken || !myUserId) {
        console.error('[Instagram] ❌ Sesión web expirada o inválida. Ejecuta el setup manualmente de nuevo.');
        console.error('[Instagram] 🛑 BOT PAUSADO. Entrando en cuarentena...');
        setInterval(() => {}, 60000);
        await new Promise(() => {});
    }

    console.log(`[Instagram] ✅ Sesión Web activa (User ID: ${myUserId})`);
    console.log(`[Instagram] 📲 Polling DMs Web API cada ${POLL_MS/1000}s...`);

    while (true) {
        try {
            // Extraer la bandeja de entrada inyectando peticiones en el contexto del navegador para eludir firmas móviles
            const inboxData = await page.evaluate(async (csrf) => {
                const res = await fetch('https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true', {
                    headers: {
                        'X-CSRFToken': csrf,
                        'X-IG-App-ID': '936619743392459',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                return res.json();
            }, csrfToken);

            const threads = inboxData?.inbox?.threads || [];

            for (const thread of threads) {
                const lastMsg = thread.items?.[0];
                if (!lastMsg || lastMsg.item_type !== 'text') continue;

                // Ignorar mensajes que el bot o el usuario mandaron (mis propios mensajes)
                if (lastMsg.user_id?.toString() === myUserId) continue;

                const msgKey = `${thread.thread_id}_${lastMsg.item_id}`;
                if (seenItems.has(msgKey)) continue;
                seenItems.add(msgKey); // Estructura HASH O(1) ultrasónica para evitar Memory Leaks
                
                // --- GARBAGE COLLECTION ---
                if (seenItems.size > 2000) {
                    let iter = 0;
                    for (const key of seenItems) { 
                        if (iter++ < 1000) seenItems.delete(key); 
                        else break; 
                    }
                    console.log('[Instagram] 🧹 Liberando memoria de historial (Garbage Collection).');
                }

                const userIdString = lastMsg.user_id.toString();
                // Usamos el username para dar más contexto a la IA
                const userName = thread.users?.[0]?.username || userIdString;
                const msgText = lastMsg.text;
                
                console.log(`[Instagram] 📩 DM de @${userName}: ${msgText.substring(0,50)}`);

                // Procesar Lógica de Gemini y Citas (Se mantiene idéntico)
                processAndReply(userName, msgText, async (reply) => {
                    // Usar automatización visual (DOM) para responder, es 100% inmune a cambios de API/Headers
                    await page.goto(`https://www.instagram.com/direct/t/${thread.thread_id}/`, { waitUntil: 'domcontentloaded' });
                    
                    // Esperar la caja de texto (Instagram usa div[role="textbox"])
                    await page.waitForSelector('div[role="textbox"]', { timeout: 10000 });
                    
                    // Escribir la respuesta despacio para simular humano
                    await page.type('div[role="textbox"]', reply, { delay: 15 });
                    
                    // Presionar Enter para enviar
                    await page.keyboard.press('Enter');
                    
                    // Pequeña pausa para asegurar envío antes de continuar
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }).catch(e => console.error('[Instagram] Reply error:', e.message));
            }

        } catch(err) {
            console.error('[Instagram] Error polling (Web Request):', err.message);
            // --- SELF-HEALING ---
            if (err.message && err.message.includes('detached')) {
                console.log('[Instagram] ⚠️ ¡Pestaña corrupta o separada por ataque anti-bot de IG! Auto-Reparando pestaña...');
                try {
                    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Recuperar info de sesión
                    cookies = await page.cookies();
                    csrfToken = cookies.find(c => c.name === 'csrftoken')?.value;
                } catch(e){}
            }
        }

        await new Promise(r => setTimeout(r, POLL_MS));
    }
}

async function forceKillBrowser() {
    if (browserClient) {
        try {
            console.log('[Instagram] 🛑 Forzando cierre de Chrome/Puppeteer...');
            // On Windows, process.kill with SIGKILL leaves renderer and GPU child processes as zombies.
            // Using browser.close() is the safest way to terminate all child processes gracefully.
            await browserClient.close().catch(()=>null);
            console.log('[Instagram] ✅ Chrome cerrado limpiamente.');
        } catch (e) {
            console.error('[Instagram] ⚠️ Error cerrando Chrome:', e.message);
        }
    }
}

startBot().catch(async err => {
    console.error('[Instagram] ❌ Fatal:', err.message);
    await forceKillBrowser();
    process.exit(1);
});

// ==========================================
// 🛡️ PM2 GRACEFUL SHUTDOWN (WINDOWS FIX)
// ==========================================
process.on('SIGINT', async () => { await forceKillBrowser(); process.exit(0); });
process.on('SIGTERM', async () => { await forceKillBrowser(); process.exit(0); });
process.on('message', async (msg) => {
    if (msg === 'shutdown') {
        await forceKillBrowser();
        process.exit(0);
    }
});
process.on('uncaughtException', async (err) => {
    console.error('[Instagram] Uncaught Exception:', err.message);
    await forceKillBrowser();
    process.exit(1);
});
process.on('unhandledRejection', async (reason) => {
    console.error('[Instagram] Unhandled Rejection:', reason);
    await forceKillBrowser();
    process.exit(1);
});
