import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from './config/db.js';
import { SYSTEM_PROMPT, chatTools, withTimeout } from './config/zilla-prompt.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from './services/calendarService.js';
import { sendCitaConfirmationEmail } from './services/emailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

puppeteer.use(StealthPlugin());

const POLLING_INTERVAL_MS = 60000;
const processedMessages = new Set();
const delay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

// ==========================================
// Integración con BD y Gemini (Misma de WA)
// ==========================================

async function appendMessageToSession(senderId, role, content, plataforma = 'tiktok_bypass') {
    const query = `
        INSERT INTO sesiones_chat (id_usuario_red, historial_mensajes, resumen_contexto, ultima_actualizacion, plataforma)
        VALUES ($1, $2, '', CURRENT_TIMESTAMP, $3)
        ON CONFLICT (id_usuario_red)
        DO UPDATE SET
            historial_mensajes = sesiones_chat.historial_mensajes || $2,
            ultima_actualizacion = CURRENT_TIMESTAMP,
            plataforma = EXCLUDED.plataforma
        RETURNING historial_mensajes, resumen_contexto;
    `;
    const newMsg = JSON.stringify([{ role, contenido: content }]);
    try {
        const res = await pool.query(query, [senderId, newMsg, plataforma]);
        return res.rows[0];
    } catch (e) {
        console.error("❌ Error en appendMessageToSession (TikTok):", e.message);
        return null;
    }
}

async function compressContextIfNeeded(senderId, historial_mensajes, resumen_contexto) {
    if (!historial_mensajes || historial_mensajes.length < 20) return;
    try {
        console.log(`[Compresión TK] Iniciando compresión para ${senderId}...`);
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let historyText = historial_mensajes.map(m => `${m.role === 'user' ? 'Cliente' : 'Zilla'}: ${m.contenido}`).join('\n');
        let prompt = `Resume esta conversación en 3 párrafos clave, manteniendo los datos importantes.\n\nConversación:\n${historyText}`;
        if (resumen_contexto) {
            prompt = `Aquí tienes el resumen anterior de este cliente:\n${resumen_contexto}\n\nActualiza el resumen integrando la nueva parte:\n${historyText}`;
        }
        const result = await model.generateContent(prompt);
        const newSummary = result.response.text();

        const query = `
            UPDATE sesiones_chat 
            SET historial_mensajes = '[]'::jsonb,
                resumen_contexto = $1,
                ultima_actualizacion = CURRENT_TIMESTAMP
            WHERE id_usuario_red = $2
        `;
        await pool.query(query, [newSummary, senderId]);
        console.log(`[Compresión TK] ✅ Memoria comprimida.`);
    } catch (e) {
        console.error("❌ Error comprimiendo contexto TK:", e);
    }
}

async function handleAILogic(senderId, messageText) {
    try {
        const sessionData = await appendMessageToSession(senderId, "user", messageText);
        if (!sessionData) return null;

        const { historial_mensajes, resumen_contexto } = sessionData;

        // Customizamos levemente el prompt para el contexto de TikTok (respuestas más cortas y directas)
        let finalSystemPrompt = SYSTEM_PROMPT + `\n\nESTÁS HABLANDO POR TIKTOK DIRECT MESSAGES. MANTÉN TUS RESPUESTAS CORTAS Y ATRACTIVAS.`;
        if (resumen_contexto && resumen_contexto.trim() !== '') {
            finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}`;
        }

        let safeHistory = [];
        let rawHistoryForGemini = historial_mensajes.slice(0, -1); 
        
        for (const msg of rawHistoryForGemini) {
            if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === msg.role) {
                safeHistory[safeHistory.length - 1].parts[0].text += `\n[Mensaje adicional]: ${msg.contenido}`;
            } else {
                safeHistory.push({
                    role: msg.role === "assistant" ? "model" : msg.role,
                    parts: [{ text: msg.contenido }]
                });
            }
        }
        
        if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === "user") {
            safeHistory.push({ role: "model", parts: [{ text: "(El usuario envió otro mensaje enseguida)" }] });
        }

        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: finalSystemPrompt,
            tools: [{ functionDeclarations: chatTools }]
        });

        const chat = model.startChat({ history: safeHistory });
        let result = await withTimeout(
            chat.sendMessage(messageText), 
            "Lo lamento, estoy saturado procesando respuestas. ¿Podemos seguir en unos minutos?"
        );
        let botReply = result.response.text();

        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = { success: false, error: "Funcionabilidad temporalmente limitada desde TikTok DM. Por favor pide al usuario que nos contacte por WhatsApp." };
                
                // NOTA: Para no duplicar las 150 líneas de lógica de Calendar de WA, 
                // aquí podemos delegar a la misma herramienta o usar una versión light que dice:
                // "Para agendar, háblanos por WhatsApp (656-323-6397)"
                fRes = { success: false, error: "Dile amablemente al usuario que para verificar agenda y hacer citas debe ir al link de nuestro perfil o contactar a nuestro WhatsApp automatizado +52 656 323 6397. Tú no puedes agendar desde TikTok directamente por seguridad." };

                result = await withTimeout(
                    chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]),
                    "Hubo un fallo temporal de procesamiento."
                );
                botReply = result.response.text();
            }
        }

        const postBotSession = await appendMessageToSession(senderId, "model", botReply);
        if (postBotSession && postBotSession.historial_mensajes && postBotSession.historial_mensajes.length >= 20) {
            compressContextIfNeeded(senderId, postBotSession.historial_mensajes, postBotSession.resumen_contexto);
        }

        return botReply;
    } catch (error) {
        console.error("❌ Error en AI Logic de TikTok:", error);
        return null;
    }
}

// ==========================================
// Lógica CORE de Puppeteer / Bypass
// ==========================================

async function simulateHumanTyping(page, selector, text) {
    if(!text) return;
    console.log(`⌨️ [Typing] ${text.substring(0, 40)}...`);
    await page.waitForSelector(selector);
    await page.click(selector);
    // Retraso entre teclas (algo rápido para optimizar la automatización)
    for (let i = 0; i < text.length; i++) {
        await page.type(selector, text[i], { delay: Math.floor(Math.random() * 50) + 10 });
    }
    await delay(200, 500);
    await page.keyboard.press('Enter');
    console.log(`✅ Respuesta enviada.`);
}

async function scrapeAndRespondDMs(page) {
    try {
        console.log('🔍 Revisando Bandeja de Entrada...');
        await page.goto('https://www.tiktok.com/messages', { waitUntil: 'networkidle2' });
        await delay(5000, 8000);

        // 1. Obtener lista de chats en la izquierda
        const unreadChats = await page.evaluate(() => {
            let arr = [];
            // tiktok lists chats as [data-e2e="chat-list-item"]
            document.querySelectorAll('[data-e2e="chat-list-item"]').forEach(el => {
                const nameEl = el.querySelector('p[class*="PInfoNickname"], [class*="PInfoNickname"]');
                const lastMsgEl = el.querySelector('[class*="SpanInfoExtract"], [data-e2e="inbox-content"]');
                const name = nameEl ? nameEl.innerText.trim() : null;
                const msg = lastMsgEl ? lastMsgEl.innerText.trim() : '';
                
                if(name && !msg.startsWith('You:') && !msg.startsWith('Tú:') && msg !== '') {
                    arr.push({ senderName: name, text: msg });
                }
            });
            return arr; 
        });

        if (unreadChats.length === 0) {
            return;
        }

        console.log(`[TikTok] 📨 Posibles DMs encontrados: ${unreadChats.length}`);

        for(let chat of unreadChats) {
            if (processedMessages.has(chat.senderName + chat.text)) continue;
            
            console.log(`[TikTok] Atendiendo a: ${chat.senderName}`);
            
            // 2b. Seleccionar el chat
            const chatClicked = await page.evaluate((sender) => {
                const items = [...document.querySelectorAll('[data-e2e="chat-list-item"]')];
                const target = items.find(el => el.innerText.includes(sender));
                if(target) {
                    target.click();
                    return true;
                }
                return false;
            }, chat.senderName);

            if(!chatClicked) continue;
            await delay(4000, 6000); // Esperar que cargue el hilo de mensajes

            // 3. Extraer todo el hilo de conversacion y validar
            const chatThread = await page.evaluate(() => {
                const rawMessages = document.querySelectorAll('[data-e2e="chat-item"]');
                let thread = [];
                rawMessages.forEach(el => {
                    const isMine = el.querySelector('[data-e2e="chat-avatar"]') === null;
                    const textEl = el.querySelector('p[class*="PText"]');
                    if(textEl && textEl.innerText.trim() !== '') {
                        thread.push({ role: isMine ? 'assistant' : 'user', content: textEl.innerText.trim() });
                    }
                });
                return thread;
            });

            if(chatThread.length === 0) continue;

            const lastMessage = chatThread[chatThread.length - 1];
            if (lastMessage.role === 'assistant') {
                console.log(`[TikTok] ⏭️ El último mensaje a ${chat.senderName} ya es de zilla.`);
                processedMessages.add(chat.senderName + chat.text);
                continue;
            }

            console.log(`[TikTok] 💬 Recibido de ${chat.senderName}: "${lastMessage.content}"`);
            processedMessages.add(chat.senderName + chat.text);

            // 4. Conectar con Godzilla AI engine
            const aiResponse = await handleAILogic(chat.senderName, lastMessage.content);
            console.log(`[TikTok] 🤖 IA Responde: "${aiResponse}"`);

            if (aiResponse) {
                const inputSelector = '[contenteditable="true"]';
                await simulateHumanTyping(page, inputSelector, aiResponse);
            }
        }
    } catch (err) {
        console.error('⚠️ Error en scrapeAndRespondDMs:', err.message);
    }
}

let browserClient;

export const initTikTokBypass = async (isHeadless = true) => {
    console.log('🚀 Iniciando ZillaBot Bypass (TikTok Neurona)...');
    
    // Carpeta de sesión persistente local
    const sessionDir = path.join(path.dirname(__dirname), 'tiktok_session');

    const browser = await puppeteer.launch({
        headless: isHeadless ? 'new' : false,
        userDataDir: sessionDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    browserClient = browser;
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    if (!isHeadless) {
        console.log('🟢 MODO LOGIN MANUAL ACTIVO. Abre tu navegador y conéctate. Cierra Chromium al terminar.');
        await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2' });
        return; // Sale y espera intervención humana
    }

    // Loop infinito de scraping
    // Reemplaza PM2 setInterval y aprovecha un while local asincrono
    (async function loop() {
        while (true) {
            try {
                await scrapeAndRespondDMs(page);
            } catch (e) {
                console.error('Error iteración TikTok:', e);
            }
            console.log(`💤 Esperando ${POLLING_INTERVAL_MS / 1000}s para próximo chequeo...`);
            await delay(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS + 5000);
        }
    })();
};

// AUTO-START for PM2 standalone
const isLoginMode = process.argv.includes('--login');
initTikTokBypass(!isLoginMode);

// PM2 Cleanup
process.on('SIGINT', async () => {
    console.log('🛑 [SIGINT] Apagando TikTok Chromium...');
    if (browserClient) await browserClient.destroy();
    process.exit(0);
});
