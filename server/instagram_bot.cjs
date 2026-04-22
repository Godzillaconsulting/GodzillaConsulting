/**
 * instagram_bot.cjs — Bot de Instagram DMs (CJS, sin Meta Dashboard)
 * 
 * USA la misma sesión guardada por ig_setup.cjs
 * Polling de DMs cada 8s → Gemini AI → Reply
 */

const path         = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// child_process ya no se usa — limpieza garantizada por try-catch-finally

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

        // GC: el historial ya está en la variable `history` del Map, sin referencias extras que limpiar.

    } catch(err) {
        console.error('[Instagram] Error Groq:', err.message);
        try { await replyFn('Lo siento, tuve un error. Por favor intenta de nuevo 🦖'); } catch(_) {}
    }
}

// ── Main Loop ──────────────────────────────────────────────────────────────────
const seenItems = new Set();
const userDataDir = path.join(__dirname, '.puppeteer_ig_profile');
let browserClient;

// 🔒 ANTI-ALUCINACIÓN: Lock por usuario + Cola de mensajes pendientes
// Igual que WhatsApp: si el bot ya está respondiendo a un usuario,
// los mensajes que lleguen mientras tanto se acumulan y se procesan juntos
// después, en lugar de lanzar múltiples llamadas a Gemini en paralelo.
const processingUsers = new Set();
const pendingMessages = new Map(); // userId -> [mensajes pendientes]

async function startBot() {
    let browser = null;
    try {

    if (!existsSync(userDataDir)) {
        console.error('[Instagram] ❌ Perfil no encontrado. Ejecuta: node server/ig_puppeteer_setup.cjs');
        console.error('[Instagram] 🛑 BOT PAUSADO. Entrando en cuarentena para evitar bucles de PM2...');
        setInterval(() => {}, 60000);
        await new Promise(() => {});
    }

    console.log('[Instagram] 🚀 Arrancando ZillaBot con motor Puppeteer Stealth (Anti-Baneos)...');

    // 🧹 Limpieza quirurgica al arrancar: matar solo los Chrome de ESTE bot
    try {
        const out = require('child_process').execSync('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine', { encoding: 'utf-8', windowsHide: true });
        const lines = out.split('\n');
        let count = 0;
        for (const line of lines) {
            if (line.includes('puppeteer_ig_profile')) {
                const match = line.match(/\s+(\d+)\s*$/);
                if (match) {
                    try { require('child_process').execSync(`taskkill /F /PID ${match[1]} /T`, { windowsHide: true, stdio: 'ignore' }); count++; } catch(_){}
                }
            }
        }
        if (count > 0) console.log(`[Instagram] 🧹 ${count} Chrome zombie(s) del perfil eliminado(s).`);
    } catch(_) { /* wmic no disponible, omitir */ }

    // Optimizaciones Extremas de RAM (Sin romper la capa visual para Analytics)
    browser = await puppeteer.launch({
        headless: true,
        userDataDir: userDataDir,
        args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
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
                let unreadTexts = [];
                let firstValidUserId = null;
                
                // Iterar todos los items del thread para aglomerar spam en un solo bloque (Queue Logic)
                for (const item of thread.items || []) {
                    if (item.item_type === 'text' && item.user_id?.toString() !== myUserId) {
                        const msgKey = `${thread.thread_id}_${item.item_id}`;
                        if (!seenItems.has(msgKey)) {
                            seenItems.add(msgKey);
                            firstValidUserId = item.user_id.toString();
                            unreadTexts.unshift(item.text); // Mantener orden cronológico
                        }
                    }
                }

                if (unreadTexts.length === 0) continue;

                // --- GARBAGE COLLECTION ---
                if (seenItems.size > 2000) {
                    let iter = 0;
                    for (const key of seenItems) { 
                        if (iter++ < 1000) seenItems.delete(key); 
                        else break; 
                    }
                    console.log('[Instagram] 🧹 Liberando memoria de historial (Garbage Collection).');
                }

                const userIdString = firstValidUserId;
                const userName = thread.users?.[0]?.username || userIdString;
                const threadId = thread.thread_id;

                // 🔒 ANTI-ALUCINACIÓN: Si ya estamos respondiendo a este usuario,
                // acumula los mensajes nuevos en su cola para procesarlos después.
                if (processingUsers.has(userName)) {
                    if (!pendingMessages.has(userName)) pendingMessages.set(userName, { texts: [], threadId });
                    pendingMessages.get(userName).texts.push(...unreadTexts);
                    console.log(`[Instagram] ⏳ @${userName} en proceso — acumulando ${unreadTexts.length} msg(s) en cola.`);
                    continue;
                }

                // Unir mensajes nuevos + pendientes anteriores en un solo bloque
                const allPending = pendingMessages.get(userName);
                if (allPending) pendingMessages.delete(userName);
                const allTexts = allPending ? [...allPending.texts, ...unreadTexts] : unreadTexts;
                const msgText = allTexts.join(' \n ');

                const jitter = Math.floor(Math.random() * 800) + 200;
                await new Promise(r => setTimeout(r, jitter));
                console.log(`🚀 [Instagram] DM agrupado de @${userName} (Jitter: ${jitter}ms, ${allTexts.length} msg(s)): ${msgText.substring(0,60)}...`);

                // Marcar como en proceso ANTES de llamar a Gemini
                processingUsers.add(userName);

                // Procesar con await para que no se lancen en paralelo
                (async () => {
                    try {
                        await processAndReply(userName, msgText, async (reply) => {
                            await page.goto(`https://www.instagram.com/direct/t/${threadId}/`, { waitUntil: 'domcontentloaded' });
                            await page.waitForSelector('div[role="textbox"]', { timeout: 10000 });
                            await page.type('div[role="textbox"]', reply, { delay: 15 });
                            await page.keyboard.press('Enter');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        });
                    } catch(e) {
                        console.error('[Instagram] Reply error:', e.message);
                    } finally {
                        // Liberar el lock SIEMPRE, incluso si Gemini falla
                        processingUsers.delete(userName);
                        // Si quedaron mensajes en cola mientras respondíamos, procesarlos ahora
                        if (pendingMessages.has(userName)) {
                            const queued = pendingMessages.get(userName);
                            pendingMessages.delete(userName);
                            const queuedText = queued.texts.join(' \n ');
                            console.log(`[Instagram] 🔄 Procesando cola pendiente de @${userName}: ${queuedText.substring(0,60)}...`);
                            processingUsers.add(userName);
                            processAndReply(userName, queuedText, async (reply) => {
                                await page.goto(`https://www.instagram.com/direct/t/${queued.threadId}/`, { waitUntil: 'domcontentloaded' });
                                await page.waitForSelector('div[role="textbox"]', { timeout: 10000 });
                                await page.type('div[role="textbox"]', reply, { delay: 15 });
                                await page.keyboard.press('Enter');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }).catch(e => console.error('[Instagram] Queue reply error:', e.message))
                            .finally(() => processingUsers.delete(userName));
                        }
                    }
                })();
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
    } catch(err) {
        console.error('[Instagram] ❌ Fatal en startBot:', err.message);
        throw err; // Re-lanzar para que PM2 registre el error y reinicie
    } finally {
        // ✅ SIEMPRE se ejecuta: limpieza garantizada sin taskkill
        if (browser) {
            console.log('[Instagram] 🧹 Cerrando Chrome limpiamente (finally)...');
            await browser.close().catch(() => {});
            browserClient = null;
        }
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
