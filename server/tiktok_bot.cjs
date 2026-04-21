/**
 * tiktok_bot.cjs — Bot de comentarios TikTok con Gemini AI
 *
 * Pollea comentarios de los videos de @godzilla_consulting cada 60s
 * y responde automáticamente con Zilla (Gemini).
 *
 * Inicio: pm2 start ecosystem.config.cjs --only tiktok-bot
 */

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');

// ── Config ──────────────────────────────────────────────────────────────────
const CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const OPEN_ID       = process.env.TIKTOK_OPEN_ID;
let   ACCESS_TOKEN  = process.env.TIKTOK_ACCESS_TOKEN;
let   REFRESH_TOKEN = process.env.TIKTOK_REFRESH_TOKEN;

const POLL_MS      = 60000; // 60 segundos
const VIDEOS_MAX   = 10;    // últimos 10 videos
const SEEN_FILE    = path.join(__dirname, '.wwebjs_auth', 'tiktok_seen.json');
const ENV_PATH     = path.join(__dirname, '.env');

// ── Persistir IDs de comentarios procesados ──────────────────────────────────
const seenComments = new Set(
    fs.existsSync(SEEN_FILE) ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) : []
);
function saveSeen() {
    fs.writeFileSync(SEEN_FILE, JSON.stringify([...seenComments].slice(-5000)));
}

// ── Base de Datos ────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Google Calendar ──────────────────────────────────────────────────────────
const { google } = require('googleapis');
function getCalendarClient() {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY_B64
        ? Buffer.from(process.env.GOOGLE_PRIVATE_KEY_B64, 'base64').toString('utf8')
        : (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    return google.calendar({ version: 'v3', auth: new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL, key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar']
    })});
}

// ── Gemini ───────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
# Zilla — Asistente IA de Godzilla Consulting (TikTok Comentarios)
Eres Zilla, consultor senior de Godzilla Consulting, agencia de Oscar Villanueva en Ciudad Juárez.
Respondes comentarios de TikTok de forma breve, directa y con buen humor. Máximo 150 caracteres por respuesta (límite TikTok). Usa emojis con moderación. NO uses markdown. Invita sutilmente a contactar por WhatsApp (+52 656 581 8912) si alguien pregunta precios o servicios.

## SERVICIOS: Automatización con IA | Bots | Producción Audiovisual | Embudos de Venta | SEO
`.trim();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const sessions = new Map(); // Guarda el historial de mensajes por userId

let currentSystemPrompt = SYSTEM_PROMPT; // Usado como fallback inicial
let lastPromptCheck = 0;

async function getSystemPrompt() {
    // Sincronizar con el Cerebro Central cada minuto (60,000 ms)
    if (Date.now() - lastPromptCheck > 60000) {
        try {
            const res = await pool.query("SELECT dm_system_prompt FROM bot_configs WHERE plataforma = 'tiktok'");
            if (res.rows.length > 0 && res.rows[0].dm_system_prompt) {
                const newPrompt = res.rows[0].dm_system_prompt;
                if (newPrompt !== currentSystemPrompt) {
                    currentSystemPrompt = newPrompt;
                    sessions.clear(); // Forzar reinicio de sesiones para que adopten la nueva instrucción
                    console.log('[TikTok] 🔄 SYSTEM PROMPT actualizado y sincronizado desde Cerebro Central');
                }
            }
            lastPromptCheck = Date.now();
        } catch(e) {
            console.error('[TikTok] Error consultando bot_configs:', e.message);
        }
    }
    return currentSystemPrompt;
}

async function getChatHistory(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, []);
    }
    return sessions.get(userId);
}

// ── TikTok API helpers ───────────────────────────────────────────────────────
async function ttGet(endpoint, params = {}) {
    const url = new URL(`https://open.tiktokapis.com${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
    });
    return res.json();
}

async function ttPost(endpoint, body) {
    const res = await fetch(`https://open.tiktokapis.com${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

// ── Refrescar token ──────────────────────────────────────────────────────────
async function refreshAccessToken() {
    console.log('[TikTok] 🔄 Refrescando access token...');
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);

    ACCESS_TOKEN  = data.access_token;
    REFRESH_TOKEN = data.refresh_token;

    // Actualizar .env
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    envContent = envContent.replace(/TIKTOK_ACCESS_TOKEN=.*/, `TIKTOK_ACCESS_TOKEN=${ACCESS_TOKEN}`);
    envContent = envContent.replace(/TIKTOK_REFRESH_TOKEN=.*/, `TIKTOK_REFRESH_TOKEN=${REFRESH_TOKEN}`);
    fs.writeFileSync(ENV_PATH, envContent);
    console.log('[TikTok] ✅ Token refrescado.');
}

// ── Procesar comentario y responder ─────────────────────────────────────────
async function processComment(comment, videoId) {
    const history = await getChatHistory(comment.id);
    try {
        const context = `[Comentario en TikTok de @${comment.username || 'usuario'}]: "${comment.text}"`;
        
        // Obtener el prompt activo (sincronizado con BD)
        const activePrompt = await getSystemPrompt();

        // Formatear el historial para Gemini
        const geminiHistory = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: activePrompt,
            generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95
            }
        });

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(context);

        let reply = result.response.text() || '';
        
        // Guardar la respuesta en el historial
        history.push({ role: 'user', content: context });
        history.push({ role: 'assistant', content: reply });

        // TikTok permite hasta 150 chars en comentarios
        if (reply.length > 148) reply = reply.substring(0, 145) + '...';

        const postRes = await ttPost('/v2/video/comment/create/', {
            video_id: videoId,
            text: reply,
            parent_comment_id: comment.id
        });

        if (postRes.error?.code && postRes.error.code !== 'ok') {
            console.error(`[TikTok] ❌ Error respondiendo:`, postRes.error.message);
        } else {
            console.log(`[TikTok] 💬 Respondí a @${comment.username}: "${reply.substring(0, 60)}"`);
        }

        // GC (Garbage Collection Manual - Limpieza Agresiva)
        model = null;
        geminiHistory = null;

    } catch(err) {
        console.error('[TikTok] Error Gemini:', err.message);
    }
}

// ── Main polling loop ─────────────────────────────────────────────────────────
async function poll() {
    try {
        // 1. Obtener lista de videos propios (TikTok v2 usa POST)
        const videosRes = await ttPost('/v2/video/list/', {
            fields: ['id', 'title'],
            max_count: VIDEOS_MAX
        });

        // Manejar respuesta no-JSON (ej. "Unsupported" si scopes no aprobados)
        if (typeof videosRes === 'string') {
            console.log('[TikTok] ⏳ API no disponible aún (scopes pendientes de aprobación). Esperando...');
            return;
        }

        if (videosRes.error?.code && videosRes.error.code !== 'ok') {
            const errCode = videosRes.error.code;
            if (errCode === 'access_token_invalid') {
                await refreshAccessToken();
                return;
            }
            // Scopes no aprobados — solo loguear una vez, no cada minuto
            if (errCode === 'scope_not_authorized' || errCode === 'permission_denied') {
                console.log('[TikTok] ⏳ Scopes pendientes de aprobación TikTok. Reintentaré en 1 hora...');
                await new Promise(r => setTimeout(r, 3600000)); // espera 1 hora
                return;
            }
            console.error('[TikTok] Error al obtener videos:', videosRes.error.message);
            return;
        }

        const videos = videosRes.data?.videos || [];
        if (videos.length === 0) {
            console.log('[TikTok] 📹 Sin videos disponibles en la cuenta.');
            return;
        }
        console.log(`[TikTok] 📹 Chequeando comentarios en ${videos.length} videos...`);

        for (const video of videos) {
            // 2. Obtener comentarios de cada video (también POST en v2)
            const commentsRes = await ttPost('/v2/video/comment/list/', {
                video_id: video.id,
                fields: ['id', 'text', 'username', 'create_time', 'like_count'],
                max_count: 20
            });

            if (typeof commentsRes === 'string') continue;

            if (commentsRes.error?.code && commentsRes.error.code !== 'ok') {
                console.error(`[TikTok] Error comentarios video ${video.id}:`, commentsRes.error.message);
                continue;
            }

            const comments = commentsRes.data?.comments || [];
            for (const comment of comments) {
                if (seenComments.has(comment.id)) continue;
                seenComments.add(comment.id);

                // Garbage Collection para el Set infinito
                if (seenComments.size > 8000) {
                    let iter = 0;
                    for (const key of seenComments) {
                        if (iter++ < 3000) seenComments.delete(key);
                        else break;
                    }
                }

                // Solo responder si tiene texto y no es propio
                if (!comment.text || comment.open_id === OPEN_ID) continue;

                // Aplicar Jitter (Desfase Aleatorio Anti-Timeouts)
                const jitter = Math.floor(Math.random() * 800) + 200;
                console.log(`🚀 [TikTok] 💬 Nuevo comentario encolado de @${comment.username} (Jitter: ${jitter}ms): "${comment.text?.substring(0, 60)}"`);
                await new Promise(r => setTimeout(r, jitter));

                await processComment(comment, video.id);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        saveSeen();

    } catch(err) {
        // Solo loguea si NO es el JSON parse error de "Unsupported"
        if (!err.message?.includes('Unsupporte')) {
            console.error('[TikTok] Error en polling:', err.message);
        } else {
            console.log('[TikTok] ⏳ API scopes pendientes de aprobación. Bot en espera...');
            await new Promise(r => setTimeout(r, 3600000)); // wait 1h
        }
    }
}


// ── Inicio ───────────────────────────────────────────────────────────────────
async function main() {
    if (!ACCESS_TOKEN || !REFRESH_TOKEN) {
        console.error('[TikTok] ❌ Sin tokens. Ejecuta: node server/tiktok_oauth.cjs');
        process.exit(1);
    }
    console.log(`[TikTok] 🚀 Bot iniciado. Polling cada ${POLL_MS/1000}s...`);
    await poll();
    setInterval(poll, POLL_MS);
}

main().catch(err => { console.error('[TikTok] Fatal:', err.message); process.exit(1); });
