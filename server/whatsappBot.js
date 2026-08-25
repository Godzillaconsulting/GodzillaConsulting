import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import qrcodeLib from 'qrcode';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import pool from './config/db.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from './services/calendarService.js';
import { validateBusinessHours } from './utils/businessHours.js';
import { sendCitaConfirmationEmail } from './services/emailService.js';
import { SYSTEM_PROMPT, BOOKING_PROMPT, chatTools, withTimeout } from './config/zilla-prompt.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath as _wa_fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { executeAiWaterfall } from './utils/aiWaterfall.js';
import { searchMemories } from './core_engine/aiCore.js';
import AutomationEngine from './services/automationEngine.js';

// child_process ya no se usa — limpieza garantizada por shutdown handlers
const __filename = _wa_fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

class LRUCache {
    constructor(limit) {
        this.cache = new Map();
        this.limit = limit;
    }
    get(key) {
        if (!this.cache.has(key)) return undefined;
        const val = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }
    set(key, val) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.limit) {
            this.cache.delete(this.cache.keys().next().value);
            console.log(`🧹 [LRU Cache] Memoria máxima alcanzada (${this.limit}). Sesión más antigua liberada de RAM.`);
        }
        this.cache.set(key, val);
    }
    delete(key) { return this.cache.delete(key); }
    entries() { return this.cache.entries(); }
}

// Límite estricto de 200 sesiones simultáneas en RAM para evitar Memory Leaks
const activeSessionsCache = new LRUCache(200);
const userMessageQueues = new Map();

/**
 * 🛡️ FILTRO ANTI-SPAM — Detecta mensajes de bots, cupones y publicidad masiva.
 * Retorna true si el mensaje es spam y debe ignorarse silenciosamente.
 */
function checkIsSpamMessage(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase();

    const spamLinks = [
        'rappi.sng.link', 'rappisng.link', 'bit.ly', 'tinyurl.com',
        'cutt.ly', 'short.gy', 'ow.ly', 'rb.gy', 't.co',
        'wa.me/message', 'wame.in', 'linktr.ee'
    ];
    if (spamLinks.some(link => t.includes(link))) return true;

    const spamPatterns = [
        /\d+%\s*off/i, /cup[oó]n\s*:\s*\w+/i, /c[oó]digo\s*:\s*\w+/i,
        /promocion\s+exclusiva/i, /oferta\s+por\s+tiempo\s+limitado/i,
        /gratis\s+por\s+\d+\s+d[ií]as/i, /solo\s+\d+\s+redenciones/i,
        /descuento\s+del\s+\d+%/i, /precio\s+especial\s+hoy/i, /\*\d+%\s*off\*/i,
    ];
    if (spamPatterns.some(p => p.test(text))) return true;

    const broadcastKeywords = [
        'hola, me interesa recibir', 'aplica términos y condiciones',
        'aplica terminos y condiciones', 'válido hasta agotar existencias',
        'valido hasta agotar existencias', 'consulta términos y condiciones',
    ];
    if (broadcastKeywords.some(kw => t.includes(kw))) return true;

    return false;
}

// --- ZILLA RAM CLEANUP SKILL ---
// El caché LRU ahora maneja esto dinámicamente limitando el crecimiento,
// garantizando uso de memoria O(1) máximo.
// -------------------------------

// Cola de procesamiento GLOBAL secuencial — un mensaje a la vez, igual que Terapias y Ventas.
// La info de cada cliente sigue aislada en su propia sesión (PostgreSQL + RAM cache).
let globalBotQueue = Promise.resolve();

async function appendMessageToSession(senderId, role, content, plataforma = 'whatsapp_web') {
    let session = activeSessionsCache.get(senderId);
    if (!session) {
        try {
            const res = await pool.query("SELECT historial_mensajes, resumen_contexto FROM sesiones_chat WHERE id_usuario_red = $1", [senderId]);
            if (res.rows && res.rows.length > 0) {
                session = { historial_mensajes: typeof res.rows[0].historial_mensajes === 'string' ? JSON.parse(res.rows[0].historial_mensajes) : (res.rows[0].historial_mensajes || []), resumen_contexto: res.rows[0].resumen_contexto || '' };
            } else {
                session = { historial_mensajes: [], resumen_contexto: '' };
            }
        } catch(e) {
            console.error("❌ Fallo leyendo cache sesión DB:", e.message);
            session = { historial_mensajes: [], resumen_contexto: '' };
        }
    }
    
    session.historial_mensajes.push({ role, contenido: content });
    session.lastAccessed = Date.now();
    activeSessionsCache.set(senderId, session);

    const newMsg = JSON.stringify([{ role, contenido: content }]);
    const query = `
        INSERT INTO sesiones_chat (id_usuario_red, historial_mensajes, resumen_contexto, ultima_actualizacion, plataforma)
        VALUES ($1, $2, '', CURRENT_TIMESTAMP, $3)
        ON CONFLICT (id_usuario_red)
        DO UPDATE SET
            historial_mensajes = sesiones_chat.historial_mensajes || $2,
            ultima_actualizacion = CURRENT_TIMESTAMP,
            plataforma = EXCLUDED.plataforma;
    `;
    pool.query(query, [senderId, newMsg, plataforma]).catch(e => console.error("❌ DB Async Write Error (WA):", e.message));
    
    return session;
}

// Helper: Fetch Long Term User Memory
async function getUserMemory(senderId) {
    try {
        const res = await pool.query('SELECT personalidad, intereses FROM user_memory WHERE platform_id = $1', [senderId]);
        if (res.rows.length > 0) {
            return res.rows[0];
        }
        return null;
    } catch(e) {
        console.error('Error fetching user_memory:', e.message);
        return null;
    }
}

// Helper: Compresión con Gemini
async function compressContextIfNeeded(senderId, historial_mensajes, resumen_contexto) {
    if (!historial_mensajes || historial_mensajes.length < 20) return;

    try {
        console.log(`[Compresión WA] Iniciando compresión de memoria para ${senderId}...`);
        
        const hoyStr = new Date().toLocaleString('es-MX', {timeZone: 'America/Denver'});
        const systemPromptContexto = `\n\n[CONTEXTO TEMPORAL CRÍTICO]: HOY ES ${hoyStr}. NO USES JAMÁS FECHAS DEL PASADO.`;
        let historyText = historial_mensajes.map(m => `${m.role === 'user' ? 'Cliente' : 'Zilla'}: ${m.contenido}`).join('\n');

        let prompt = `Resume esta conversación en 3 párrafos clave, manteniendo los datos importantes (nombre, servicio de interés, citas o detalles clave).\n\nConversación:\n${historyText}`;
        if (resumen_contexto) {
            prompt = `Aquí tienes el resumen anterior de este cliente:\n${resumen_contexto}\n\nAhora, concatena/actualiza ese resumen integrando esta nueva parte de la conversación en 3 párrafos clave, manteniendo los datos importantes.\n\nNueva parte de la conversación:\n${historyText}`;
        }

        // 📦 Modo COMPRESIÓN: usa modelos ligeros (Cerebras/SambaNova) para no gastar tokens pagados
        const waterfallResponse = await executeAiWaterfall([
            { role: 'system', content: systemPromptContexto },
            { role: 'user', content: prompt }
        ], { mode: 'compression', maxTokens: 600, temperature: 0.3 });
        const newSummary = waterfallResponse.content;

        const query = `
            UPDATE sesiones_chat 
            SET historial_mensajes = '[]'::jsonb,
                resumen_contexto = $1,
                ultima_actualizacion = CURRENT_TIMESTAMP
            WHERE id_usuario_red = $2
        `;
        await pool.query(query, [newSummary, senderId]);
        
        // Reflejar compresión en el Caché Activo
        activeSessionsCache.set(senderId, {
            historial_mensajes: [],
            resumen_contexto: newSummary
        });
        
        console.log(`[Compresión WA] ✅ Memoria comprimida y guardada para ${senderId}.`);
    } catch (e) {
        console.error("❌ Error comprimiendo contexto WA:", e);
    }
}
let currentQR = null;
let isConnected = false;
let qrServerStarted = false;

export const initWhatsAppBot = async () => {
    console.log("🟢 Iniciando Cliente de WhatsApp Local (whatsapp-web.js)...");

    // La limpieza de Chrome está garantizada por los handlers de SIGINT y uncaughtException al fondo.
    
    // ==============================================================================
    // 🚨 RECORDATORIO PARA FUTUROS AGENTES (ZILLA IA) 🚨
    // NUNCA, BAJO NINGUNA CIRCUNSTANCIA, BORRES O ALTERES LOS PERMISOS (chmod) DE ESTA SESIÓN.
    // Aunque el usuario ejecute la "Opción 10" (Limpieza Zombie), NO intentes
    // meter un "taskkill /F" aquí adentro ni borrar la carpeta `.wwebjs_auth`.
    // La sesión debe persistir siempre para evitar pedir el QR. Solo reinicia el bot
    // y deja que recupere su sesión existente. 
    // ==============================================================================

    // Ruta explícita al Chrome del sistema para evitar crasheos cuando el proceso
    // corre como Windows Service (NSSM/SYSTEM) que no tiene acceso al caché de puppeteer.
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    // Heartbeat global para evitar que Node.js se cierre silenciosamente si falla la inyección de Puppeteer
    setInterval(() => {}, 60000);

    // Ruta persistente segura fuera del despliegue para evitar que el Watcher de PM2
    // se vuelva loco y reinicie el bot cientos de veces cuando WhatsApp descarga la sesión.
    const sessionPath = path.join(os.homedir(), '.godzilla-sessions', 'baileys');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Godzilla Bot', 'Chrome', '124.0.0.0']
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            currentQR = qr;
            console.log('\n======================================================');
            console.log('📱 CÓDIGO QR GENERADO (BAILEYS). DISPONIBLE EN LA URL WEB Y TERMINAL 📱');
            console.log('RAW_QR_STRING_IS:' + qr);
            console.log('======================================================');
            qrcode.generate(qr, { small: true });
            
            // Guardar en un archivo HTML accesible desde Windows
            try {
                qrcodeLib.toDataURL(qr).then(qrImageURL => {
                    const htmlContent = `
                        <!DOCTYPE html>
                        <html lang="es">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Godzilla Bot - Vinculación WhatsApp</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
                            <style>
                                :root {
                                    --bg-color: #09090b;
                                    --card-bg: rgba(255, 255, 255, 0.03);
                                    --border-color: rgba(255, 255, 255, 0.08);
                                    --text-primary: #f4f4f5;
                                    --text-secondary: #a1a1aa;
                                    --accent-green: #10b981;
                                    --accent-red: #ef4444;
                                    --accent-blue: #3b82f6;
                                    --accent-yellow: #f59e0b;
                                }
                                body {
                                    margin: 0;
                                    padding: 0;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    min-height: 100vh;
                                    font-family: 'Outfit', sans-serif;
                                    background: radial-gradient(circle at center, #121026 0%, #050508 100%);
                                    color: var(--text-primary);
                                    overflow-x: hidden;
                                }
                                .container {
                                    width: 100%;
                                    max-width: 450px;
                                    padding: 20px;
                                    box-sizing: border-box;
                                }
                                .glass-card {
                                    background: var(--card-bg);
                                    backdrop-filter: blur(20px);
                                    -webkit-backdrop-filter: blur(20px);
                                    border: 1px solid var(--border-color);
                                    border-radius: 28px;
                                    padding: 40px 30px;
                                    text-align: center;
                                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                                    position: relative;
                                    overflow: hidden;
                                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                }
                                .glass-card:hover {
                                    border-color: rgba(255, 255, 255, 0.15);
                                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                                }
                                .glow {
                                    position: absolute;
                                    width: 250px;
                                    height: 250px;
                                    background: var(--accent-red);
                                    filter: blur(100px);
                                    opacity: 0.12;
                                    top: -50px;
                                    left: -50px;
                                    border-radius: 50%;
                                    pointer-events: none;
                                    transition: background-color 0.8s ease;
                                }
                                .glow.connected {
                                    background: var(--accent-green);
                                }
                                h1 {
                                    font-size: 28px;
                                    font-weight: 800;
                                    margin: 0 0 10px 0;
                                    background: linear-gradient(135deg, #fff 30%, #a1a1aa 100%);
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                    letter-spacing: -0.02em;
                                }
                                .subtitle {
                                    color: var(--text-secondary);
                                    font-size: 14px;
                                    line-height: 1.6;
                                    margin-bottom: 30px;
                                    font-weight: 300;
                                }
                                .qr-wrapper {
                                    position: relative;
                                    width: 280px;
                                    height: 280px;
                                    margin: 0 auto 30px auto;
                                    border-radius: 24px;
                                    padding: 16px;
                                    background: white;
                                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    box-sizing: border-box;
                                    transition: all 0.5s ease;
                                }
                                .qr-image {
                                    width: 100%;
                                    height: 100%;
                                    object-fit: contain;
                                    border-radius: 12px;
                                    transition: opacity 0.3s ease;
                                }
                                .scan-line {
                                    position: absolute;
                                    left: 16px;
                                    right: 16px;
                                    height: 3px;
                                    background: linear-gradient(90deg, transparent, var(--accent-red), transparent);
                                    box-shadow: 0 0 8px var(--accent-red);
                                    border-radius: 50%;
                                    animation: scan 2.5s linear infinite;
                                    pointer-events: none;
                                }
                                .status-container {
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 8px;
                                    padding: 8px 16px;
                                    background: rgba(255, 255, 255, 0.03);
                                    border: 1px solid var(--border-color);
                                    border-radius: 99px;
                                    font-size: 12px;
                                    font-weight: 600;
                                    color: var(--text-secondary);
                                    margin-bottom: 15px;
                                    transition: all 0.3s ease;
                                }
                                .status-dot {
                                    width: 8px;
                                    height: 8px;
                                    border-radius: 50%;
                                    background: var(--accent-yellow);
                                    box-shadow: 0 0 8px var(--accent-yellow);
                                    animation: pulse 1.8s infinite ease-in-out;
                                }
                                .status-dot.connected {
                                    background: var(--accent-green) !important;
                                    box-shadow: 0 0 8px var(--accent-green) !important;
                                }
                                .status-dot.loading {
                                    background: var(--accent-yellow);
                                    box-shadow: 0 0 8px var(--accent-yellow);
                                }
                                .spinner {
                                    width: 60px;
                                    height: 60px;
                                    border: 3px solid rgba(255, 255, 255, 0.05);
                                    border-top-color: var(--accent-red);
                                    border-radius: 50%;
                                    animation: spin 1s linear infinite;
                                }
                                .success-checkmark {
                                    width: 100px;
                                    height: 100px;
                                    margin: 40px auto;
                                    display: none;
                                }
                                .checkmark-circle {
                                    stroke-dasharray: 166;
                                    stroke-dashoffset: 166;
                                    stroke-width: 2;
                                    stroke-miterlimit: 10;
                                    stroke: var(--accent-green);
                                    fill: none;
                                    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                                }
                                .checkmark-check {
                                    transform-origin: 50% 50%;
                                    stroke-dasharray: 48;
                                    stroke-dashoffset: 48;
                                    stroke-width: 3;
                                    stroke: var(--accent-green);
                                    fill: none;
                                    animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                                }
                                @keyframes stroke { 100% { stroke-dashoffset: 0; } }
                                @keyframes scan {
                                    0% { top: 16px; }
                                    50% { top: calc(100% - 19px); }
                                    100% { top: 16px; }
                                }
                                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                @keyframes pulse {
                                    0% { transform: scale(0.8); opacity: 0.5; }
                                    50% { transform: scale(1.2); opacity: 1; }
                                    100% { transform: scale(0.8); opacity: 0.5; }
                                }
                                .brand-footer {
                                    margin-top: 30px;
                                    font-size: 11px;
                                    color: var(--text-secondary);
                                    opacity: 0.5;
                                    letter-spacing: 0.05em;
                                    text-transform: uppercase;
                                }
                                .brand-footer span { color: var(--accent-red); font-weight: 700; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="glass-card" id="card">
                                    <div class="glow" id="glow"></div>
                                    <div class="status-container">
                                        <span class="status-dot" id="statusDot"></span>
                                        <span id="statusText">Iniciando...</span>
                                    </div>
                                    <h1 id="title">Vincular Dispositivo</h1>
                                    <p class="subtitle" id="subtitle">Escanea el código QR desde WhatsApp para conectar la Inteligencia Artificial.</p>
                                    <div class="qr-wrapper" id="qrWrapper">
                                        <div class="spinner" id="spinner"></div>
                                        <img src="${qrImageURL}" class="qr-image" id="qrImage" style="display: block;" alt="Código QR WhatsApp" />
                                        <div class="scan-line" id="scanLine" style="display: block;"></div>
                                        <svg class="success-checkmark" id="checkmark" viewBox="0 0 52 52">
                                            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                        </svg>
                                    </div>
                                    <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.8;" id="instructions">
                                        Abre WhatsApp en tu teléfono celular > ve a <strong>Dispositivos Vinculados</strong> y toca en <strong>Vincular un dispositivo</strong>.
                                    </p>
                                    <div class="brand-footer">Godzilla <span>Consulting</span></div>
                                </div>
                            </div>
                            <script>
                                let currentQRString = '${qrImageURL}';
                                const qrImage = document.getElementById('qrImage');
                                const spinner = document.getElementById('spinner');
                                const scanLine = document.getElementById('scanLine');
                                const checkmark = document.getElementById('checkmark');
                                const statusDot = document.getElementById('statusDot');
                                const statusText = document.getElementById('statusText');
                                const title = document.getElementById('title');
                                const subtitle = document.getElementById('subtitle');
                                const instructions = document.getElementById('instructions');
                                const glow = document.getElementById('glow');
                                
                                async function checkStatus() {
                                    try {
                                        // Intentar consultar al servidor local en puerto 4010 o dinámico
                                        const response = await fetch(window.location.origin + '/qr/status');
                                        if (!response.ok) throw new Error('Network error');
                                        const data = await response.json();
                                        if (data.connected) {
                                            statusDot.className = 'status-dot connected';
                                            statusText.innerText = 'CONECTADO';
                                            glow.className = 'glow connected';
                                            spinner.style.display = 'none';
                                            qrImage.style.display = 'none';
                                            scanLine.style.display = 'none';
                                            checkmark.style.display = 'block';
                                            title.innerText = '¡Conexión Exitosa!';
                                            subtitle.innerText = 'El bot Godzilla ha sido vinculado correctamente y está en línea.';
                                            instructions.innerHTML = 'Ya puedes cerrar esta pestaña y comenzar a chatear. 🟢';
                                            clearInterval(pollInterval);
                                            return;
                                        }
                                        if (data.qr) {
                                            if (currentQRString !== data.qr) {
                                                currentQRString = data.qr;
                                                qrImage.style.opacity = 0;
                                                setTimeout(() => {
                                                    qrImage.src = data.qr;
                                                    qrImage.style.display = 'block';
                                                    spinner.style.display = 'none';
                                                    scanLine.style.display = 'block';
                                                    qrImage.style.opacity = 1;
                                                }, 250);
                                            }
                                            statusDot.className = 'status-dot';
                                            statusText.innerText = 'ESPERANDO ESCANEO';
                                            title.innerText = 'Vincular Dispositivo';
                                        } else {
                                            spinner.style.display = 'block';
                                            qrImage.style.display = 'none';
                                            scanLine.style.display = 'none';
                                            checkmark.style.display = 'none';
                                            statusDot.className = 'status-dot loading';
                                            statusText.innerText = 'GENERANDO QR...';
                                        }
                                    } catch (error) {
                                        console.error('Error polling status:', error);
                                        statusText.innerText = 'DESCONECTADO';
                                    }
                                }
                                const pollInterval = setInterval(checkStatus, 2000);
                                checkStatus();
                            </script>
                        </body>
                        </html>
                    `;
                    fs.writeFileSync(path.join(__dirname, 'uploads', 'qr.html'), htmlContent);
                    console.log('✅ Archivo QR HTML guardado en server/uploads/qr.html');
                }).catch(e => console.error(e));
            } catch(e) { console.error('Error guardando QR HTML:', e); }
        }

        if (connection === 'close') {
            isConnected = false;
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ [DISCONNECTED] Cliente cerrado. Razón:', lastDisconnect.error?.message);
            if (shouldReconnect) {
                console.log('🔄 Reconectando automáticamente Baileys...');
                initWhatsAppBot();
            } else {
                console.error('❌ Sesión de WhatsApp cerrada desde el celular. Debes borrar la carpeta baileys para reiniciar.');
                currentQR = null;
            }
        } else if (connection === 'open') {
            isConnected = true;
            currentQR = null;
            console.log('✅ ZillaBot (Baileys Engine) está conectado y listo!');
        }
    });

        // ===============================================
        // POLLING: COLA DE AUTOMATIZACIÓN (bot_outbound_queue)
        // ===============================================
        setInterval(async () => {
            if (!client?.user?.id) {
                return; // Wait until bot is connected
            }
            try {
                const res = await pool.query(`
                    SELECT id, payload 
                    FROM bot_outbound_queue 
                    WHERE bot_name = 'whatsapp' AND status = 'pending' 
                    ORDER BY id ASC LIMIT 5
                `);

                for (const row of res.rows) {
                    const { id, payload } = row;
                    try {
                        let toPhone = payload.to;
                        const message = payload.message;
                        
                        // Formatear a ID de WhatsApp (ej. 521656... @s.whatsapp.net)
                        if (!toPhone.includes('@s.whatsapp.net')) {
                            // Limpiar no numéricos
                            toPhone = toPhone.replace(/[^0-9]/g, '');
                            toPhone = `${toPhone}@s.whatsapp.net`;
                        }

                        console.log(`[WA Outbound Queue] 📤 Enviando mensaje a ${toPhone}...`);
                        await client.sendMessage(toPhone, { text: message });
                        
                        await pool.query(`UPDATE bot_outbound_queue SET status = 'sent', processed_at = NOW() WHERE id = $1`, [id]);
                        console.log(`[WA Outbound Queue] ✅ Mensaje ${id} enviado y marcado como 'sent'.`);
                    } catch (sendErr) {
                        console.error(`[WA Outbound Queue] ❌ Error enviando msj ${id}:`, sendErr.message);
                        await pool.query(`UPDATE bot_outbound_queue SET status = 'error', error_log = $1, processed_at = NOW() WHERE id = $2`, [sendErr.message, id]);
                    }
                    
                    // Pequeña pausa entre mensajes para evitar baneos
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (err) {
                console.error('[WA Outbound Queue] Error en el polling:', err.message);
            }
        }, 10000); // Polling cada 10 segundos
    // ===============================================
    // MICRO-SERVIDOR WEB PARA ENVIARLE EL QR AL CLIENTE
    // ===============================================
    if (!qrServerStarted) {
        qrServerStarted = true;
        const qrApp = express();

    qrApp.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    qrApp.get('/qr/status', async (req, res) => {
        try {
            let qrImageURL = null;
            if (currentQR) {
                qrImageURL = await qrcodeLib.toDataURL(currentQR);
            }
            res.json({
                connected: isConnected,
                qr: qrImageURL
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    qrApp.get('/qr', async (req, res) => {
        try {
            let qrImageURL = "";
            if (currentQR) {
                qrImageURL = await qrcodeLib.toDataURL(currentQR);
            }
            res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Godzilla Bot - Vinculación WhatsApp</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
                    <style>
                        :root {
                            --bg-color: #09090b;
                            --card-bg: rgba(255, 255, 255, 0.03);
                            --border-color: rgba(255, 255, 255, 0.08);
                            --text-primary: #f4f4f5;
                            --text-secondary: #a1a1aa;
                            --accent-green: #10b981;
                            --accent-red: #ef4444;
                            --accent-blue: #3b82f6;
                            --accent-yellow: #f59e0b;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            font-family: 'Outfit', sans-serif;
                            background: radial-gradient(circle at center, #121026 0%, #050508 100%);
                            color: var(--text-primary);
                            overflow-x: hidden;
                        }
                        .container {
                            width: 100%;
                            max-width: 450px;
                            padding: 20px;
                            box-sizing: border-box;
                        }
                        .glass-card {
                            background: var(--card-bg);
                            backdrop-filter: blur(20px);
                            -webkit-backdrop-filter: blur(20px);
                            border: 1px solid var(--border-color);
                            border-radius: 28px;
                            padding: 40px 30px;
                            text-align: center;
                            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                            position: relative;
                            overflow: hidden;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        }
                        .glass-card:hover {
                            border-color: rgba(255, 255, 255, 0.15);
                            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                        }
                        .glow {
                            position: absolute;
                            width: 250px;
                            height: 250px;
                            background: var(--accent-red);
                            filter: blur(100px);
                            opacity: 0.12;
                            top: -50px;
                            left: -50px;
                            border-radius: 50%;
                            pointer-events: none;
                            transition: background-color 0.8s ease;
                        }
                        .glow.connected {
                            background: var(--accent-green);
                        }
                        h1 {
                            font-size: 28px;
                            font-weight: 800;
                            margin: 0 0 10px 0;
                            background: linear-gradient(135deg, #fff 30%, #a1a1aa 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            letter-spacing: -0.02em;
                        }
                        .subtitle {
                            color: var(--text-secondary);
                            font-size: 14px;
                            line-height: 1.6;
                            margin-bottom: 30px;
                            font-weight: 300;
                        }
                        .qr-wrapper {
                            position: relative;
                            width: 280px;
                            height: 280px;
                            margin: 0 auto 30px auto;
                            border-radius: 24px;
                            padding: 16px;
                            background: white;
                            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-sizing: border-box;
                            transition: all 0.5s ease;
                        }
                        .qr-image {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            border-radius: 12px;
                            transition: opacity 0.3s ease;
                        }
                        .scan-line {
                            position: absolute;
                            left: 16px;
                            right: 16px;
                            height: 3px;
                            background: linear-gradient(90deg, transparent, var(--accent-red), transparent);
                            box-shadow: 0 0 8px var(--accent-red);
                            border-radius: 50%;
                            animation: scan 2.5s linear infinite;
                            pointer-events: none;
                        }
                        .status-container {
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            padding: 8px 16px;
                            background: rgba(255, 255, 255, 0.03);
                            border: 1px solid var(--border-color);
                            border-radius: 99px;
                            font-size: 12px;
                            font-weight: 600;
                            color: var(--text-secondary);
                            margin-bottom: 15px;
                            transition: all 0.3s ease;
                        }
                        .status-dot {
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: var(--accent-yellow);
                            box-shadow: 0 0 8px var(--accent-yellow);
                            animation: pulse 1.8s infinite ease-in-out;
                        }
                        .status-dot.connected {
                            background: var(--accent-green) !important;
                            box-shadow: 0 0 8px var(--accent-green) !important;
                        }
                        .status-dot.loading {
                            background: var(--accent-yellow);
                            box-shadow: 0 0 8px var(--accent-yellow);
                        }
                        .spinner {
                            width: 60px;
                            height: 60px;
                            border: 3px solid rgba(255, 255, 255, 0.05);
                            border-top-color: var(--accent-red);
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                        }
                        .success-checkmark {
                            width: 100px;
                            height: 100px;
                            margin: 40px auto;
                            display: none;
                        }
                        .checkmark-circle {
                            stroke-dasharray: 166;
                            stroke-dashoffset: 166;
                            stroke-width: 2;
                            stroke-miterlimit: 10;
                            stroke: var(--accent-green);
                            fill: none;
                            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                        }
                        .checkmark-check {
                            transform-origin: 50% 50%;
                            stroke-dasharray: 48;
                            stroke-dashoffset: 48;
                            stroke-width: 3;
                            stroke: var(--accent-green);
                            fill: none;
                            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                        }
                        @keyframes stroke { 100% { stroke-dashoffset: 0; } }
                        @keyframes scan {
                            0% { top: 16px; }
                            50% { top: calc(100% - 19px); }
                            100% { top: 16px; }
                        }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        @keyframes pulse {
                            0% { transform: scale(0.8); opacity: 0.5; }
                            50% { transform: scale(1.2); opacity: 1; }
                            100% { transform: scale(0.8); opacity: 0.5; }
                        }
                        .brand-footer {
                            margin-top: 30px;
                            font-size: 11px;
                            color: var(--text-secondary);
                            opacity: 0.5;
                            letter-spacing: 0.05em;
                            text-transform: uppercase;
                        }
                        .brand-footer span { color: var(--accent-red); font-weight: 700; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="glass-card" id="card">
                            <div class="glow" id="glow"></div>
                            <div class="status-container">
                                <span class="status-dot" id="statusDot"></span>
                                <span id="statusText">Iniciando...</span>
                            </div>
                            <h1 id="title">Vincular Dispositivo</h1>
                            <p class="subtitle" id="subtitle">Escanea el código QR desde WhatsApp para conectar la Inteligencia Artificial.</p>
                            <div class="qr-wrapper" id="qrWrapper">
                                <div class="spinner" id="spinner" style="${qrImageURL ? 'display: none;' : 'display: block;'}"></div>
                                <img src="${qrImageURL}" class="qr-image" id="qrImage" style="${qrImageURL ? 'display: block;' : 'display: none;'}" alt="Código QR WhatsApp" />
                                <div class="scan-line" id="scanLine" style="${qrImageURL ? 'display: block;' : 'display: none;'}"></div>
                                <svg class="success-checkmark" id="checkmark" viewBox="0 0 52 52">
                                    <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                    <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                </svg>
                            </div>
                            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.8;" id="instructions">
                                Abre WhatsApp en tu teléfono celular > ve a <strong>Dispositivos Vinculados</strong> y toca en <strong>Vincular un dispositivo</strong>.
                            </p>
                            <div class="brand-footer">Godzilla <span>Consulting</span></div>
                        </div>
                    </div>
                    <script>
                        let currentQRString = '${qrImageURL}';
                        const qrImage = document.getElementById('qrImage');
                        const spinner = document.getElementById('spinner');
                        const scanLine = document.getElementById('scanLine');
                        const checkmark = document.getElementById('checkmark');
                        const statusDot = document.getElementById('statusDot');
                        const statusText = document.getElementById('statusText');
                        const title = document.getElementById('title');
                        const subtitle = document.getElementById('subtitle');
                        const instructions = document.getElementById('instructions');
                        const glow = document.getElementById('glow');
                        async function checkStatus() {
                            try {
                                const response = await fetch(window.location.origin + '/qr/status');
                                if (!response.ok) throw new Error('Network error');
                                const data = await response.json();
                                if (data.connected) {
                                    statusDot.className = 'status-dot connected';
                                    statusText.innerText = 'CONECTADO';
                                    glow.className = 'glow connected';
                                    spinner.style.display = 'none';
                                    qrImage.style.display = 'none';
                                    scanLine.style.display = 'none';
                                    checkmark.style.display = 'block';
                                    title.innerText = '¡Conexión Exitosa!';
                                    subtitle.innerText = 'El bot Godzilla ha sido vinculado correctamente y está en línea.';
                                    instructions.innerHTML = 'Ya puedes cerrar esta pestaña y comenzar a chatear. 🟢';
                                    clearInterval(pollInterval);
                                    return;
                                }
                                if (data.qr) {
                                    if (currentQRString !== data.qr) {
                                        currentQRString = data.qr;
                                        qrImage.style.opacity = 0;
                                        setTimeout(() => {
                                            qrImage.src = data.qr;
                                            qrImage.style.display = 'block';
                                            spinner.style.display = 'none';
                                            scanLine.style.display = 'block';
                                            qrImage.style.opacity = 1;
                                        }, 250);
                                    }
                                    statusDot.className = 'status-dot';
                                    statusText.innerText = 'ESPERANDO ESCANEO';
                                    title.innerText = 'Vincular Dispositivo';
                                } else {
                                    spinner.style.display = 'block';
                                    qrImage.style.display = 'none';
                                    scanLine.style.display = 'none';
                                    checkmark.style.display = 'none';
                                    statusDot.className = 'status-dot loading';
                                    statusText.innerText = 'GENERANDO QR...';
                                }
                            } catch (error) {
                                console.error('Error polling status:', error);
                                statusText.innerText = 'DESCONECTADO';
                            }
                        }
                        const pollInterval = setInterval(checkStatus, 2000);
                        checkStatus();
                    </script>
                </body>
                </html>
            `);
        } catch (e) {
            res.status(500).send("Error generando imagen QR: " + e.message);
        }
    });

        const QR_PORT_BASE = parseInt(process.env.QR_PORT || 4010, 10);
    const tryListen = (port) => {
        const server = qrApp.listen(port, () => {
            console.log(`🌐 [Enlace de Escaneo Remoto] Envía esto a tu cliente: http://localhost:${port}/qr`);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.warn(`⚠️ [QR Server] Puerto ${port} ocupado, intentando ${port + 1}...`);
                server.close();
                if (port < QR_PORT_BASE + 8) tryListen(port + 1);
                else console.warn('⚠️ [QR Server] No se encontró puerto libre. El servidor QR no estará disponible.');
            }
        });
    };
    tryListen(QR_PORT_BASE);
    } // End of qrServerStarted check

    let dynamicPromptWA = null;

    let lastPromptCheckWA = 0;

    async function getSystemPromptWA() {
        if (Date.now() - lastPromptCheckWA > 60000 || !dynamicPromptWA) {
            try {
                const res = await pool.query("SELECT dm_system_prompt FROM bot_configs WHERE plataforma = 'whatsapp'");
                if (res.rows && res.rows.length > 0 && res.rows[0].dm_system_prompt) {
                    dynamicPromptWA = res.rows[0].dm_system_prompt;
                } else if (!dynamicPromptWA) {
                    dynamicPromptWA = SYSTEM_PROMPT;
                }
                lastPromptCheckWA = Date.now();
            } catch(e) {
                if (!dynamicPromptWA) dynamicPromptWA = SYSTEM_PROMPT;
            }
        }
        return dynamicPromptWA;
    }

    client.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`[DEBUG WA EVENT] Type: ${type} | messages count: ${messages.length}`);
        if (type !== 'notify') return;
        const message = messages[0];
        if (!message.message) return;
        
        let senderId = message.key.remoteJid;
        console.log(`[DEBUG WA] Recibió evento de: ${senderId} | fromMe: ${message.key.fromMe}`);
        
        if (message.key.fromMe) return;

        // Ignore groups and status broadcast (allow @lid for linked devices)
        if (senderId.endsWith('@g.us') || senderId === 'status@broadcast') return;

        // Marcar el mensaje como leído (Palomitas Azules / Visto)
        try { await client.readMessages([message.key]); } catch (e) { console.error("Error al marcar como leído:", e.message); }

        let rawMessageText = message.message.conversation || message.message.extendedTextMessage?.text;
        let attachmentUrl = null;
        let attachmentType = null;

        // --- DETECT AND DOWNLOAD MEDIA ATTACHMENTS (IMAGE OR VIDEO) ---
        const imageMessage = message.message.imageMessage;
        const videoMessage = message.message.videoMessage;

        if (imageMessage || videoMessage) {
            try {
                const mediaType = imageMessage ? 'image' : 'video';
                const messageMedia = imageMessage || videoMessage;
                rawMessageText = messageMedia.caption || rawMessageText || '';
                
                console.log(`[DEBUG WA] Downloading media attachment of type ${mediaType}...`);
                const stream = await downloadContentFromMessage(messageMedia, mediaType);
                let buffer = Buffer.alloc(0);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                if (mediaType === 'video') {
                    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`;
                    const destPath = path.join(process.env.ARCHIVOS_PESADOS_DIR || 'E:/assets', uniqueFilename);
                    fs.writeFileSync(destPath, buffer);
                    attachmentUrl = `/api/media/assets/${uniqueFilename}`;
                    attachmentType = 'video/mp4';
                    console.log(`[DEBUG WA] Video attachment saved locally to: ${attachmentUrl}`);
                } else {
                    const mimetype = imageMessage.mimetype || 'image/jpeg';
                    const filename = imageMessage.filename || `${Date.now()}.jpg`;
                    const dbRes = await pool.query(
                        `INSERT INTO media_storage (filename, mimetype, size, file_data) 
                         VALUES ($1, $2, $3, $4) RETURNING id`,
                        [filename, mimetype, buffer.length, buffer]
                    );
                    const fileId = dbRes.rows[0].id;
                    attachmentUrl = `/api/media/file/${fileId}`;
                    attachmentType = mimetype;
                    console.log(`[DEBUG WA] Image attachment saved in DB: ${attachmentUrl}`);
                }
            } catch (mediaErr) {
                console.error(`[DEBUG WA] Failed to download/save attachment:`, mediaErr.message);
            }
        }

        // --- AUTO RE-RENDER FROM WHATSAPP ---
        // If an attachment is present and text contains keywords to recreate or edit
        if (attachmentUrl && rawMessageText && rawMessageText.toLowerCase().match(/(rehacer|corregir|hazlo|rehaz|video|campeon|azul|pumas)/i)) {
            try {
                console.log(`[DEBUG WA] Correction keywords matched. Resolving task to recreate...`);
                // Get the last task that is pending approval, manual studio, or backlog to apply correction
                const tasksRes = await pool.query(
                    "SELECT * FROM studio_tasks WHERE status IN ('pending_cm_approval', 'manual_studio', 'backlog', 'rejected') ORDER BY id DESC LIMIT 1"
                );
                if (tasksRes.rows.length > 0) {
                    const taskToRebuild = tasksRes.rows[0];
                    let payload = typeof taskToRebuild.media_payload === 'string' ? JSON.parse(taskToRebuild.media_payload) : taskToRebuild.media_payload;
                    if (Array.isArray(payload) && payload.length > 0) payload = payload[0];

                    payload.refImage = attachmentUrl;

                    await pool.query(
                        `UPDATE studio_tasks 
                         SET status = 'pending_render_docker', 
                             feedback_notes = $1, 
                             media_payload = $2,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $3`,
                        [rawMessageText || 'Rehacer con referencia desde WhatsApp', JSON.stringify(payload), taskToRebuild.id]
                    );

                    console.log(`[DEBUG WA] Task #${taskToRebuild.id} updated to pending_render_docker using reference: ${attachmentUrl}`);
                    await client.sendMessage(senderId, { text: `¡Entendido! Recibí la referencia visual y la nota: "${rawMessageText}". Estoy rehaciendo el video ahora mismo... ⚙️` });
                    return;
                }
            } catch (rebuildErr) {
                console.error(`[DEBUG WA] Failed to trigger auto-rebuild from WhatsApp:`, rebuildErr.message);
            }
        }

        if (!rawMessageText) {
            console.log(`[DEBUG WA] Ignorado: No hay texto plano.`);
            return;
        }

        // 🛡️ FILTRO ANTI-SPAM — Ignorar mensajes de bots/cupones silenciosamente
        if (checkIsSpamMessage(rawMessageText)) {
            console.log(`🛡️ [WA Spam] Mensaje de spam/cupón ignorado de ${senderId.substring(0, 8)}***: "${rawMessageText.substring(0, 80)}"`);
            return;
        }



        const maskedSender = senderId.substring(0, 4) + "****" + senderId.substring(senderId.length - 4);
        console.log(`📩 WA Msg recibido [${maskedSender}]: [ENTRANDO A COLA DE ESPERA]`);

        if (!userMessageQueues.has(senderId)) {
            userMessageQueues.set(senderId, { timer: null, msgBuffer: [] });
        }
        
        const queueObj = userMessageQueues.get(senderId);
        queueObj.msgBuffer.push(rawMessageText);

        // ── FIX PRINCIPAL: Si ya hay un timer corriendo, solo añadir al buffer ──
        // El timer anterior procesará el mensaje nuevo porque lee todo el buffer al ejecutar.
        // NO hacemos return aquí porque eso ya está manejado por el timer existente.
        if (queueObj.timer) {
            console.log(`📦 Mensaje añadido al buffer de [${maskedSender}]. Hay timer activo, acumulando...`);
            return;
        }

        const jitter = Math.floor(Math.random() * 800) + 200;
        
        queueObj.timer = setTimeout(async () => {
            // Leer TODO el buffer acumulado y limpiar el estado ANTES de procesar
            const currentQueue = userMessageQueues.get(senderId);
            const messageText = currentQueue ? currentQueue.msgBuffer.join(" \n ") : rawMessageText;
            userMessageQueues.delete(senderId); // Limpia timer + buffer del mapa
            console.log(`🚀 WA Procesando batch para [${maskedSender}] (${messageText.split('\n').length} msg, Jitter: ${jitter}ms)`);

        // ── COLA GLOBAL SECUENCIAL — Un mensaje a la vez (comportamiento humano) ──
        // Igual que Terapias y Ventas. La sesión de cada cliente sigue aislada.
        globalBotQueue = globalBotQueue.then(async () => { try {
            // Generar retraso total humano aleatorio entre 6 y 15 segundos
            const totalDelay = Math.floor(Math.random() * 9000) + 6000;
            const thinkingDelay = Math.floor(totalDelay * 0.6);
            const typingDelay = totalDelay - thinkingDelay;

            // Esperar el thinkingDelay antes de abrir el mensaje y mostrar actividad
            await new Promise(r => setTimeout(r, thinkingDelay));

            // Iniciar presencia escribiendo ("composing")
            try {
                await client.sendPresenceUpdate('composing', senderId);
            } catch(e) {}

            const startTime = Date.now();

            // ── DISPARO DE MOTOR VISUAL (Automation Engine) ──
            AutomationEngine.triggerFlow('WhatsApp Bot', {
                senderId,
                message: messageText,
                timestamp: new Date().toISOString()
            }).catch(e => console.error("⚠️ [Engine] Error disparando flujo visual desde WA:", e.message));

            const sessionData = await appendMessageToSession(senderId, "user", messageText);
            if (!sessionData) return;

            const { historial_mensajes, resumen_contexto } = sessionData;

            let finalSystemPrompt = await getSystemPromptWA();
            if (resumen_contexto && resumen_contexto.trim() !== '') {
                finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}\n(Usa esta información para no preguntar cosas que ya sabes, pero no la repitas robóticamente).`;
            }

            // --- INYECTAR PERFIL DEL USUARIO (Memoria de Personalidad) ---
            const userMem = await getUserMemory(senderId);
            if (userMem && (userMem.personalidad || userMem.intereses)) {
                finalSystemPrompt += `\n\n## PERFIL DEL USUARIO (MEMORIA INDIVIDUAL):\n- Personalidad/Preferencias: ${userMem.personalidad}\n- Intereses/Nicho: ${userMem.intereses}\n(Adapta tu tono, palabras y ejemplos exactamente a este perfil).`;
            }
            // -------------------------------------------------------------

            // --- RAG: Inyectar Cerebro LanceDB ---
            try {
                const vectorMemories = await searchMemories(senderId, messageText, 3);
                if (vectorMemories && vectorMemories.length > 0) {
                    finalSystemPrompt += `\n\n## CEREBRO LANCEDB (Conocimiento Histórico):\n`;
                    vectorMemories.forEach(mem => {
                        finalSystemPrompt += `- ${mem.content}\n`;
                    });
                    finalSystemPrompt += `(Usa esta información vectorizada de discusiones previas si es relevante al mensaje actual).`;
                }
            } catch (ragErr) {
                console.error("⚠️ Fallo en RAG LanceDB:", ragErr.message);
            }
            // -------------------------------------

            const hoyStr = new Date().toLocaleString('es-MX', {timeZone: 'America/Denver'});
            const systemPromptContexto = `\n\n[CONTEXTO TEMPORAL CRÍTICO]: HOY ES ${hoyStr}. NO USES JAMÁS FECHAS DEL PASADO.`;

            let groqMessages = [
                { role: "system", content: finalSystemPrompt + systemPromptContexto }
            ];

            // 🔒 TRIM DE HISTORIAL: máx 14 mensajes para no reventar tokens de proveedor pagado
            let rawHistory = historial_mensajes.slice(0, -1).slice(-14);
            for (const msg of rawHistory) {
                groqMessages.push({
                    role: (msg.role === "assistant" || msg.role === "model") ? "assistant" : "user",
                    content: msg.contenido
                });
            }
            groqMessages.push({ role: "user", content: messageText });

            const groqTools = chatTools.map(t => ({
                type: "function",
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            }));

            // ─── GUARDIA PROGRAMÁTICA ANTI-ALUCINACIÓN ─────────────────────
            // Si el mensaje es un saludo puro, forzamos que el modelo NO pueda
            // invocar herramientas sin importar qué modelo esté activo (Groq/Gemini/Pollinations).
            const BOOKING_INTENT_REGEX = /(cita|agendar|horario|disponible|disponibilidad|espacio|reagendar|cancelar|reservar|reserva|consulta)/i;
            const hasBookingIntent = BOOKING_INTENT_REGEX.test(messageText);

            if (hasBookingIntent) {
                finalSystemPrompt += `\n\n${BOOKING_PROMPT}`;
            }

            let botReply = "Lo siento, fallé al entender.";
            let functionCalls = [];

            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const config = {
                    model: "gemini-3.6-flash",
                    systemInstruction: finalSystemPrompt + systemPromptContexto,
                    generationConfig: { temperature: 0.5, maxOutputTokens: hasBookingIntent ? 768 : 256 }
                };
                if (hasBookingIntent && chatTools && chatTools.length > 0) {
                    config.tools = [{
                        functionDeclarations: chatTools.map(t => ({
                            name: t.name, description: t.description, parameters: t.parameters
                        }))
                    }];
                }
                const geminiModel = genAI.getGenerativeModel(config);
                
                let contents = [];
                let lastRole = null;
                groqMessages.filter(m => m.role !== 'system').forEach(m => {
                    let role = (m.role === 'assistant' || m.role === 'model' || (m.tool_calls && m.tool_calls.length > 0)) ? 'model' : 'user';
                    let parts = [];
                    if (m.tool_calls && m.tool_calls.length > 0) {
                        parts = m.tool_calls.map(tc => {
                            let args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                            return { functionCall: { name: tc.function.name, args: args } };
                        });
                    } else if (m.role === 'tool') {
                        let resultData = { result: "ok" };
                        try { resultData = JSON.parse(m.content); } catch(e) { resultData = { result: m.content || "ok" }; }
                        parts = [{ functionResponse: { name: m.name || 'unknown_tool', response: resultData } }];
                    } else if (m.content) {
                        parts = [{ text: m.content }];
                    }
                    if (parts.length > 0) {
                        if (lastRole === role && contents.length > 0) {
                            contents[contents.length - 1].parts.push(...parts);
                        } else {
                            contents.push({ role, parts });
                        }
                        lastRole = role;
                    }
                });
                if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hola' }] });

                const result = await geminiModel.generateContent({ contents });
                const responseMessage = result.response;
                let finalContent = "";
                try { finalContent = responseMessage.text(); } catch(e) {}
                const fc = responseMessage.functionCalls();
                
                let geminiToolCalls = [];
                if (fc && fc.length > 0) {
                    geminiToolCalls = fc.map(c => ({
                        id: `call_${Math.random().toString(36).substring(2, 9)}`,
                        type: 'function',
                        function: { name: c.name, arguments: JSON.stringify(c.args) }
                    }));
                }

                botReply = finalContent && finalContent.trim() ? finalContent.trim() : "Entendido, ¿en qué más te puedo ayudar? 😊";

                if (geminiToolCalls.length > 0) {
                    botReply = "Un momento, estoy consultando el sistema... ⏳";
                    groqMessages.push({
                        role: 'assistant',
                        content: finalContent || null,
                        tool_calls: geminiToolCalls
                    });
                    functionCalls = geminiToolCalls.map(tc => {
                        let parsedArgs = {};
                        try { parsedArgs = JSON.parse(tc.function.arguments); } catch(e){}
                        return { name: tc.function.name, args: parsedArgs, id: tc.id };
                    });
                }
            } catch(error) {
                console.error("❌ Error de Gemini directo en WA:", error.message);
                botReply = "Dame un momento por favor, estoy procesando mucha información... ⏳";
            }

            if (functionCalls.length > 0) {
                for (const call of functionCalls) {
                    let fRes = {};
                    const callName = call.name;
                    let callArgs = call.args || {};

                    if (callName === "actualizar_perfil_usuario") {
                        const { personalidad, intereses } = callArgs;
                        try {
                            await pool.query(`
                                INSERT INTO user_memory (platform_id, personalidad, intereses, ultima_interaccion)
                                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                                ON CONFLICT (platform_id) DO UPDATE SET
                                    personalidad = EXCLUDED.personalidad,
                                    intereses = EXCLUDED.intereses,
                                    ultima_interaccion = CURRENT_TIMESTAMP
                            `, [senderId, personalidad || '', intereses || '']);
                            fRes = { success: true, message: "Perfil guardado en memoria permanentemente." };
                            console.log(`[WA Tool] Perfil actualizado para ${senderId}: ${personalidad} | ${intereses}`);
                        } catch(err) {
                            console.error("❌ Error guardando perfil de usuario:", err.message);
                            fRes = { success: false, error: "Error interno guardando perfil." };
                        }
                    } else if (callName === "check_availability") {
                        const { fecha, hora } = callArgs;
                        
                        // Anti-hallucination guard
                          if (!fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                              fRes = { error: "SISTEMA: No ejecutes herramientas sin fecha u hora exacta. Dile al usuario: '¿Para qué fecha y hora te gustaría agendar?'" };
                          } else {
                            const valErr = validateBusinessHours(fecha, hora);

                            if (valErr) {
                                fRes = { error: `La fecha/hora solicitada es inválida o está fuera de horario de atención: ${valErr}. Dile al usuario que elija otro horario.` };
                            } else {
                                const query = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                                const r = await pool.query(query, [fecha, hora]);
                                fRes = { disponible: parseInt(r.rows[0].total) === 0 };
                                console.log(`[WA Tool] Disponibilidad ${fecha} a las ${hora}: ${fRes.disponible}`);
                            }
                        }
                    } else if (callName === "save_appointment") {
                        try {
                            const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                            
                            // Anti-hallucination guard
                            if (!nombre || !fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                              fRes = { error: "SISTEMA: Faltan datos obligatorios. Pídele al usuario todos los datos faltantes." };
                          } else {
                                const valErr = validateBusinessHours(fecha, hora);

                                if (valErr) {
                                     fRes = { success: false, error: `Error de fecha/hora: ${valErr}` };
                                } else {
                                    const queryConflict = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                                    const conflictCheck = await pool.query(queryConflict, [fecha, hora]);
                                    
                                    if (parseInt(conflictCheck.rows[0].total) > 0) {
                                         console.warn(`⚠️ [WA Empalme] Intento de agendar ocupado: ${fecha} ${hora}`);
                                         fRes = { success: false, error: "Horario recién ocupado." };
                                    } else {
                                        const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                                        let calendarId = null;
                                    let gRes = null;
                                    
                                    try {
                                        gRes = await agendarEnGoogleCalendar(datosCita);
                                        calendarId = gRes.id;
                                        
                                        try {
                                            const r = await pool.query(
                                                "INSERT INTO citas (nombre_completo, telefono, email, tipo_sesion, fecha, hora, status, google_calendar_id, origen, notas_adicionales) VALUES ($1,$2,$3,$4,$5,$6,'confirmada',$7,'whatsapp',$8) RETURNING id",
                                                [nombre, telefono, correo || 'sin-correo@wa.com', servicio, fecha, hora, calendarId, notas]
                                            );
                                            
                                            if (correo && correo !== 'sin-correo@wa.com') {
                                                await sendCitaConfirmationEmail({
                                                    nombre,
                                                    email: correo,
                                                    fecha,
                                                    hora,
                                                    tipoSesion: servicio,
                                                    personalCalendarLink: gRes.personalCalendarLink
                                                });
                                            }
                                            
                                            fRes = { success: true, id: r.rows[0].id, alert: "Guardado en DB, Calendar y correo enviado." };
                                        } catch (dbErr) {
                                            console.error("❌ Fallo crítico al guardar en BD (Ejecutando Rollback de Calendar):", dbErr.message);
                                            if (calendarId) {
                                                await cancelarEnGoogleCalendar(calendarId).catch(rollbackErr => console.error("❌ Fallo en Rollback Calendar:", rollbackErr.message));
                                            }
                                            fRes = { success: false, error: "Hubo un error de base de datos tu cita no fue agendada (" + dbErr.message + "). Intenta más tarde." };
                                        }
                                    } catch (calErr) {
                                         console.error("❌ Fallo Google Calendar WA (NO se guardó en DB):", calErr.message);
                                         fRes = { success: false, error: "El sistema de agendas de Google rechazó el horario (" + calErr.message + "). Por favor intenta con otra fecha/hora." };
                                    }
                                }
                            }
                        }
                        } catch (waErr) {
                            console.error("❌ Error WA Webhook Save_Appointment:", waErr);
                            fRes = { success: false, error: "Error de servidor interno." };
                        }
                    } else if (callName === "cancel_appointment") {
                        const { telefono } = callArgs;
                        try {
                            const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                            if (result.rows.length === 0) {
                                fRes = { success: false, error: "No encontré ninguna cita activa con ese número de teléfono." };
                            } else {
                                const cita = result.rows[0];
                                if (cita.google_calendar_id) {
                                    await cancelarEnGoogleCalendar(cita.google_calendar_id).catch(e => console.error("Error cancelando en GC:", e.message));
                                }
                                await pool.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita.id]);
                                fRes = { success: true, message: "Cita cancelada exitosamente." };
                            }
                        } catch (err) {
                            console.error("❌ Error cancelando cita:", err);
                            fRes = { success: false, error: "Error técnico al cancelar." };
                        }
                    } else if (callName === "reschedule_appointment") {
                        const { telefono, nueva_fecha, nueva_hora } = callArgs;
                        try {
                            const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                            if (result.rows.length === 0) {
                                fRes = { success: false, error: "No encontré ninguna cita activa con ese número de teléfono." };
                            } else {
                                const cita = result.rows[0];
                                const valErr = validateBusinessHours(nueva_fecha, nueva_hora);
                                
                                if (valErr) {
                                    fRes = { success: false, error: valErr };
                                } else {
                                    const dateObj = new Date(`${nueva_fecha}T${nueva_hora}:00-07:00`);
                                    const now = new Date();

                                    if (dateObj < now) {
                                        fRes = { success: false, error: "La nueva fecha/hora ya pasó. Intenta con una fecha futura." };
                                    } else {
                                        const queryConflict = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                                        const conflictCheck = await pool.query(queryConflict, [nueva_fecha, nueva_hora]);
                                    
                                        if (parseInt(conflictCheck.rows[0].total) > 0) {
                                            fRes = { success: false, error: "Ese nuevo horario está ocupado. Intenta con otra fecha/hora." };
                                        } else {
                                            if (cita.google_calendar_id) {
                                                await actualizarEnGoogleCalendar(cita.google_calendar_id, nueva_fecha, nueva_hora).catch(e => console.error("Error reagendando en GC:", e.message));
                                            }
                                            await pool.query("UPDATE citas SET fecha = $1, hora = $2 WHERE id = $3", [nueva_fecha, nueva_hora, cita.id]);
                                            fRes = { success: true, message: "Cita reagendada exitosamente." };
                                            console.log(`[WA Tool] Cita ${cita.id} reagendada exitosamente.`);
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("❌ Error reagendando:", err);
                            fRes = { success: false, error: "Error técnico reagendando, intenta de nuevo más tarde." };
                        }
                    } else if (callName === "get_available_downloads") {
                        try {
                            const r = await pool.query("SELECT title, slug FROM lead_magnets");
                            fRes = { resources: r.rows };
                        } catch(dlErr) {
                            console.error("❌ Error en get_available_downloads:", dlErr.message);
                            fRes = { resources: [], error: "No se pudieron cargar los recursos." };
                        }
                    }
                    // Pushing tool response to Groq messages
                    groqMessages.push({
                        role: "tool",
                        tool_call_id: call.id,
                        name: callName,
                        content: JSON.stringify(fRes)
                    });
                }
                
                // Segunda llamada: SIEMPRE usa Groq primero porque el historial
                // contiene mensajes con role:'tool' que solo APIs OpenAI-compatible entienden.
                // SambaNova/Pollinations crashean si reciben ese formato.
                // Segunda llamada post-tool: respuesta conversacional corta, maxTokens = 512
                try {
                    const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const geminiModel2 = genAI2.getGenerativeModel({
                        model: "gemini-3.6-flash",
                        systemInstruction: finalSystemPrompt + systemPromptContexto,
                        generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
                    });
                    
                    let contents2 = [];
                    let lastRole2 = null;
                    groqMessages.filter(m => m.role !== 'system').forEach(m => {
                        let role = (m.role === 'assistant' || m.role === 'model' || (m.tool_calls && m.tool_calls.length > 0)) ? 'model' : 'user';
                        let parts = [];
                        if (m.tool_calls && m.tool_calls.length > 0) {
                            parts = m.tool_calls.map(tc => {
                                let args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                                return { functionCall: { name: tc.function.name, args: args } };
                            });
                        } else if (m.role === 'tool') {
                            let resultData = { result: "ok" };
                            try { resultData = JSON.parse(m.content); } catch(e) { resultData = { result: m.content || "ok" }; }
                            parts = [{ functionResponse: { name: m.name || 'unknown_tool', response: resultData } }];
                        } else if (m.content) {
                            parts = [{ text: m.content }];
                        }
                        if (parts.length > 0) {
                            if (lastRole2 === role && contents2.length > 0) {
                                contents2[contents2.length - 1].parts.push(...parts);
                            } else {
                                contents2.push({ role, parts });
                            }
                            lastRole2 = role;
                        }
                    });

                    const result2 = await geminiModel2.generateContent({ contents: contents2 });
                    let text2 = "";
                    try { text2 = result2.response.text(); } catch(e) {}
                    botReply = text2 || 'Reserva procesada.';
                } catch(e) {
                    console.error("❌ Error en segunda llamada directa a Gemini:", e.message);
                    botReply = "Procesé tu solicitud pero tuve un problema al redactar la respuesta. ¿Puedes repetirme tu pregunta?";
                }
            }

            console.log(`🤖 ZillaBot (WA) respondió a [${maskedSender}] exitosamente.`);
            
            // 🔒 SAFETY NET FINAL: Nunca enviar JSON crudo ni string vacío a WhatsApp
            if (!botReply || !botReply.trim()) {
                botReply = "Entendido, ¿en qué más te puedo ayudar? 😊";
            }
            // Detectar si botReply es JSON crudo accidental (tool_call filtrado)
            if (botReply.trim().startsWith('{') && botReply.trim().endsWith('}')) {
                try {
                    const parsed = JSON.parse(botReply);
                    if (parsed.type === 'function' || parsed.name || parsed.tool_calls) {
                        console.warn("⚠️ [SAFETY NET] Se detectó JSON crudo en botReply. Reemplazando con mensaje seguro.");
                        botReply = "Ya processé tu solicitud. ¿Hay algo más en lo que pueda ayudarte? 😊";
                    }
                } catch(e) { /* No es JSON válido, es texto normal con llaves */ }
            }
            
            // Esperar la duración de escritura restante descontando el tiempo transcurrido desde startTime
            const elapsed = Date.now() - startTime;
            const remainingTyping = Math.max(typingDelay - elapsed, 1500); // al menos 1.5s
            await new Promise(r => setTimeout(r, remainingTyping));

            try {
                await client.sendPresenceUpdate('paused', senderId);
            } catch(e) {}

            await client.sendMessage(senderId, { text: botReply });

            const postBotSession = await appendMessageToSession(senderId, "model", botReply);
            if (postBotSession && postBotSession.historial_mensajes && postBotSession.historial_mensajes.length >= 20) {
                compressContextIfNeeded(senderId, postBotSession.historial_mensajes, postBotSession.resumen_contexto);
            }

            // GC (Garbage Collection Manual - Limpieza Agresiva)
            groqMessages = null;
            rawHistory = null;
            finalSystemPrompt = null;
            // chatCompletion eliminado - variable nunca declarada (causaba ReferenceError)

        } catch (error) {
            console.error("❌ Error interno procesando WA message:", error);
        } finally {
            // Jitter entre respuestas para parecer humano (1s - 2s)
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 1000));
        }
        }).catch(e => { console.error('❌ [globalBotQueue] Error:', e.message); });
        }, 5000 + jitter); // Ventana de 5 segundos de agrupación de mensajes + Jitter
    });
    const emergencyShutdown = async (err, origin) => {
        // Ignorar errores de puerto ocupado (no fatales para WhatsApp)
        if (err && err.code === 'EADDRINUSE') {
            console.warn(`⚠️ [Ignorado] Puerto ocupado (EADDRINUSE). El bot sigue corriendo.`);
            return;
        }

        console.error(`🛑 [ERROR] (${origin}):`, err?.message || err);
        console.warn(`⚠️ [BLINDAJE] Error no fatal ignorado para mantener el bot 24/7.`);
        // Solo morir si es un error absolutamente catastrófico de Node mismo
        if (err && (err.code === 'ERR_WORKER_INIT_FAILURE' || err.code === 'MODULE_NOT_FOUND')) {
            console.error('💀 Error catastrófico de módulo. Apagando para forzar recarga de PM2.');
            process.exit(1);
        }
    };

    process.on('uncaughtException', (err) => emergencyShutdown(err, 'uncaughtException'));
    process.on('unhandledRejection', (err) => emergencyShutdown(err, 'unhandledRejection'));

    process.on('SIGINT', async () => {
        console.log('🛑 [SIGINT] Recibida orden de apagado (PM2). Cerrando limpiamente...');
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        console.log('🛑 [SIGTERM] Recibida orden de apagado (PM2). Cerrando limpiamente...');
        process.exit(0);
    });
};

// AUTO-START for PM2 standalone

const isPM2 = process.env.pm_id !== undefined;
if (isPM2 || process.argv[1] === _wa_fileURLToPath(import.meta.url)) {
    initWhatsAppBot();
}


