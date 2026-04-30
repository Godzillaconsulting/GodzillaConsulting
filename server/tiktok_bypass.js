import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import pool from './config/db.js';
import { executeAiWaterfall } from './utils/aiWaterfall.js';
import { chatTools } from './config/zilla-prompt.js';
import { withTimeout } from './config/zilla-prompt.js';

puppeteer.use(StealthPlugin());

const POLLING_INTERVAL_MS = 15000;
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
        
            const hoyStr = new Date().toLocaleString('es-MX', {timeZone: 'America/Denver'});
        const systemPromptContexto = `\n\n[CONTEXTO TEMPORAL CRÍTICO]: HOY ES ${hoyStr}. NO USES JAMÁS FECHAS DEL PASADO.`;

        let historyText = historial_mensajes.map(m => `${m.role === 'user' ? 'Cliente' : 'Zilla'}: ${m.contenido}`).join('\n');
        let prompt = `Resume esta conversación en 3 párrafos clave, manteniendo los datos importantes.\n\nConversación:\n${historyText}`;
        if (resumen_contexto) {
            prompt = `Aquí tienes el resumen anterior de este cliente:\n${resumen_contexto}\n\nActualiza el resumen integrando la nueva parte:\n${historyText}`;
        }
        
        const aiRes = await executeAiWaterfall([
            { role: 'system', content: systemPromptContexto },
            { role: 'user', content: prompt }
        ], { mode: 'compression', temperature: 0.3 });
        
        const newSummary = aiRes.content || '';

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
        
        try {
            const configResult = await pool.query("SELECT dm_system_prompt FROM bot_configs WHERE plataforma='tiktok'");
            if (configResult.rows.length > 0 && configResult.rows[0].dm_system_prompt) {
                finalSystemPrompt += `\n\n## INSTRUCCIONES ESPECÍFICAS DE ESTA RED SOCIAL:\n${configResult.rows[0].dm_system_prompt}`;
            }
        } catch(e) {}

        if (resumen_contexto && resumen_contexto.trim() !== '') {
            finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}\n(Usa esta información para no preguntar cosas que ya sabes, pero no la repitas robóticamente).`;
        }

        let waterfallMessages = [{ role: "system", content: finalSystemPrompt }];
        for (const msg of historial_mensajes.slice(0, -1)) {
            waterfallMessages.push({
                role: (msg.role === "assistant" || msg.role === "model") ? "assistant" : "user",
                content: msg.contenido
            });
        }
        waterfallMessages.push({ role: "user", content: messageText });

        const waterfallTools = chatTools.map(t => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        }));

        let aiResult = await executeAiWaterfall(waterfallMessages, {
            temperature: 0.1,
            maxTokens: 1024,
            mode: 'gemini_exclusive'
        });

        let botReply = aiResult.content || "Lo siento, fallé al entender.";
        let functionCalls = aiResult.tool_calls || [];

        if (functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = {};
                const callName = call.name;
                let callArgs = call.args || {};

                                if (callName === "check_availability") {
                    const { fecha, hora } = callArgs;
                    
                    if (!fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                        fRes = { error: "Faltan parámetros reales. DEBES preguntarle al usuario para qué fecha y hora quiere agendar ANTES de revisar disponibilidad." };
                    } else {
                        const valErr = validateBusinessHours(fecha, hora);

                        if (valErr) {
                            fRes = { error: `La fecha/hora solicitada es inválida o está fuera de horario de atención: ${valErr}. Dile al usuario que elija otro horario.` };
                        } else {
                            const query = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                            const r = await pool.query(query, [fecha, hora]);
                            fRes = { disponible: parseInt(r.rows[0].total) === 0 };
                        }
                    }
                                } else if (callName === "save_appointment") {
                    try {
                        const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                        try {
                            if (!nombre || !fecha || !hora || fecha.includes('YYYY') || hora.includes('HH')) {
                                fRes = { success: false, error: "Faltan datos obligatorios o son marcadores de posición. Pídele al usuario todos los datos faltantes (Nombre, fecha, hora, etc)." };
                            } else {
                                const valErr = validateBusinessHours(fecha, hora);
                                if (valErr) {
                                    fRes = { success: false, error: `Error de fecha/hora: ${valErr}` };
                                } else {
                                    const queryConflict = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                                    const conflictCheck = await pool.query(queryConflict, [fecha, hora]);
                                    
                                    if (parseInt(conflictCheck.rows[0].total) > 0) {
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
                                                    "INSERT INTO citas (nombre_completo, telefono, email, tipo_sesion, fecha, hora, status, google_calendar_id, origen, notas_adicionales) VALUES ($1,$2,$3,$4,$5,$6,'confirmada',$7,'tiktok',$8) RETURNING id",
                                                    [nombre, telefono, correo || 'sin-correo@tiktok.com', servicio, fecha, hora, calendarId, notas]
                                                );
                                                if (correo && correo !== 'sin-correo@tiktok.com') {
                                                    await sendCitaConfirmationEmail({
                                                        nombre, email: correo, fecha, hora, tipoSesion: servicio, personalCalendarLink: gRes.personalCalendarLink
                                                    });
                                                }
                                                fRes = { success: true, id: r.rows[0].id, alert: "Guardado en DB, Calendar y correo enviado." };
                                            } catch (dbErr) {
                                                if (calendarId) await cancelarEnGoogleCalendar(calendarId).catch(console.error);
                                                fRes = { success: false, error: "Hubo un error de base de datos (" + dbErr.message + ")." };
                                            }
                                        } catch (calErr) {
                                            fRes = { success: false, error: "Google Calendar rechazó (" + calErr.message + ")." };
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            fRes = { success: false, error: "Error de servidor interno." };
                        }
                } else if (callName === "cancel_appointment") {
                    const { telefono } = callArgs;
                    try {
                        const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                        if (result.rows.length === 0) fRes = { success: false, error: "No encontré cita activa." };
                        else {
                            const cita = result.rows[0];
                            if (cita.google_calendar_id) await cancelarEnGoogleCalendar(cita.google_calendar_id);
                            await pool.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita.id]);
                            fRes = { success: true, message: "Cita cancelada correctamente." };
                        }
                    } catch(e) { fRes = { success: false, error: "Error." }; }
                }
                waterfallMessages.push({
                    role: "assistant",
                    tool_calls: aiResult.tool_calls
                });
                waterfallMessages.push({
                    role: "tool",
                    tool_call_id: call.id || "tool_call_id",
                    name: callName,
                    content: JSON.stringify(fRes)
                });
                
                // Segunda llamada a la IA después de ejecutar tools
                const aiResult2 = await executeAiWaterfall(waterfallMessages, {
                    temperature: 0.1,
                    maxTokens: 1024,
                    mode: 'gemini_exclusive'
                });
                
                botReply = aiResult2.content || botReply;
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
    
    // ⏱️ DELAY HUMANO: Esperar ~8 segundos para simular tiempo de lectura/redacción
    const humanDelay = Math.floor(Math.random() * 2000) + 7000;
    console.log(`⏱️ Esperando ${humanDelay}ms antes de escribir en TikTok...`);
    await new Promise(r => setTimeout(r, humanDelay));

    await page.click(selector);
    // Retraso entre teclas (algo rápido para optimizar la automatización)
    for (const char of text) {
        await page.type(selector, char, { delay: Math.floor(Math.random() * 50) + 10 });
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
            const chatThread = await page.evaluate((sender) => {
                const rawMessages = document.querySelectorAll('[data-e2e="chat-item"]');
                let thread = [];
                const senderLower = sender.toLowerCase();
                rawMessages.forEach(el => {
                    const linkEl = el.querySelector('a');
                    // En TikTok Desktop, ambos tienen avatar. Diferenciamos por el href del link (que tiene el username).
                    // Si el link NO tiene el nombre del sender, entonces el mensaje es nuestro (godzilla).
                    const isMine = linkEl && !linkEl.href.toLowerCase().includes(senderLower);
                    
                    const textEl = el.querySelector('p[class*="PText"]');
                    if(textEl && textEl.innerText.trim() !== '') {
                        thread.push({ role: isMine ? 'assistant' : 'user', content: textEl.innerText.trim() });
                    }
                });
                return thread;
            }, chat.senderName);

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

const checkComments = async (page) => {
    try {
        console.log('🔍 Revisando Notificaciones de Comentarios...');
        
        let configRow = null;
        try {
            const result = await pool.query("SELECT * FROM bot_configs WHERE plataforma='tiktok'");
            if (result.rows.length > 0) configRow = result.rows[0];
        } catch(e) { console.error('Error fetching bot config:', e); }
        
        // Defaults if missing or failed
        const triggerKeywords = configRow && configRow.keywords ? configRow.keywords.split(',').map(s=>s.trim().toLowerCase()) : ['tecnologia', 'info'];
        const autoCommentTemplate = configRow && configRow.comment_template ? configRow.comment_template : '¡Hola {USER}! Te invitamos a ver la información exclusiva. Mándanos un DM por aquí con la palabra "TECNOLOGIA" y nuestro bot te atenderá enseguida. 🚀';

        await page.goto('https://www.tiktok.com/notification', { waitUntil: 'networkidle2' });
        await delay(3000, 5000);

        // Click en la pestaña de Comentarios
        await page.evaluate(() => {
            const commentsTab = document.querySelector('[data-e2e="comments"]');
            if (commentsTab) commentsTab.click();
        });
        await delay(3000, 5000);

        const newComments = await page.evaluate((keywords) => {
            let arr = [];
            document.querySelectorAll('[data-e2e="inbox-list-item"]').forEach(el => {
                const titleEl = el.querySelector('[data-e2e="inbox-title"]');
                const contentEl = el.querySelector('[data-e2e="inbox-content"]');
                const title = titleEl ? titleEl.innerText : '';
                const content = contentEl ? contentEl.innerText.toLowerCase() : '';

                // Extraemos nombre de usuario de manera robusta
                // El titulo suele ser "Username comentó:"
                const usernameRaw = title.split(' ')[0] || "Usuario";
                
                // Checar dinamicamente
                const matches = keywords.some(kw => content.includes(kw));
                if(matches) {
                    arr.push({ username: usernameRaw, text: content });
                }
            });
            return arr;
        }, triggerKeywords);

        if (newComments.length === 0) return;

        console.log(`[TikTok] 💭 Comentarios clave encontrados: ${newComments.length}`);

        // Iterar sobre notificaciones
        for (let comment of newComments) {
            const hash = comment.username + comment.text;
            if (processedMessages.has(hash)) continue;
            
            console.log(`[TikTok] 💭 Respondiendo al comentario de: ${comment.username}`);
            
            // Hacer click en la notificación para abrir el video
            const clicked = await page.evaluate((u) => {
                const items = [...document.querySelectorAll('[data-e2e="inbox-list-item"]')];
                const target = items.find(el => el.innerText.includes(u));
                if(target) {
                    target.click();
                    return true;
                }
                return false;
            }, comment.username);

            if (!clicked) continue;
            await delay(4000, 6000); // Esperar que cargue el reproductor y los comentarios

            // Preparar respuesta
            const aiResponse = autoCommentTemplate.replace('{USER}', comment.username);

            // Buscar input de comentario/respuesta
            const inputSelector = '[contenteditable="true"]';
            const inputExists = await page.$(inputSelector);

            if (inputExists) {
                await simulateHumanTyping(page, inputSelector, aiResponse);
                processedMessages.add(hash);
                console.log(`[TikTok] ✅ Comentario respondido a ${comment.username}`);
            }

            // Cerrar el modal del video (Generalmente presionar ESC u Ocultar)
            await page.keyboard.press('Escape');
            await delay(1000, 2000);
        }
    } catch (err) {
        console.error('⚠️ Error en checkComments:', err.message);
    }
};

const publishQueuedVideos = async (page) => {
    try {
        const result = await pool.query(`SELECT * FROM studio_tasks WHERE (status = 'published' OR status = 'ready_to_publish') AND (ig_publish_date IS NULL OR ig_publish_date <= NOW())`);
        const tasks = result.rows.filter(t => t.publish_targets && t.publish_targets.includes('tiktok') && t.media_payload && t.media_payload.url && !t.media_payload.published_on_tiktok);
        if (tasks.length === 0) return;

        console.log(`[TikTok] 🎬 Encontré ${tasks.length} videos en cola para publicar.`);
        for (const task of tasks) {
            console.log(`[TikTok] Subiendo video de tarea #${task.id}...`);
            const urlPath = task.media_payload.url; 
            const localPath = path.join(__dirname, '..', 'public', urlPath.replace(/^\//, ''));
            
            if (!fs.existsSync(localPath)) {
                console.error(`[TikTok] ❌ Archivo de video no encontrado localmente: ${localPath}`);
                continue;
            }

            await page.goto('https://www.tiktok.com/creator-center/upload?from=upload', { waitUntil: 'networkidle2' });
            await delay(4000, 6000);

            let uploadFrame = page;
            for (const frame of page.frames()) {
                if (frame.url().includes('creator-center')) uploadFrame = frame;
            }

            const fileInput = await uploadFrame.$('input[type="file"][accept*="video"]');
            if (!fileInput) {
                console.error('[TikTok] ❌ No se encontró el input de archivo (anti-bot dom).');
                continue;
            }

            console.log(`[TikTok] 🔄 Cargando archivo: ${localPath}`);
            await fileInput.uploadFile(localPath);
            
            console.log(`[TikTok] ⏳ Esperando carga de video en TikTok (20s)...`);
            await delay(20000, 25000); 

            // Escribir descripción
            const descInput = await uploadFrame.$('.public-DraftEditor-content, .DraftEditor-editorContainer div[contenteditable="true"]');
            if (descInput && task.prompt) {
                console.log(`[TikTok] ✍️ Escribiendo caption...`);
                await simulateHumanTyping(uploadFrame, '.public-DraftEditor-content, .DraftEditor-editorContainer div[contenteditable="true"]', task.prompt);
            }

            // Click Post
            const posted = await uploadFrame.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const postBtn = btns.find(b => b.innerText.toLowerCase().includes('post') || b.innerText.toLowerCase().includes('publicar'));
                if (postBtn && !postBtn.disabled) {
                    postBtn.click();
                    return true;
                }
                return false;
            });

            if (posted) {
                console.log(`[TikTok] ✅ Botón de publicar clickeado exitosamente.`);
                await delay(8000, 10000);
                
                task.media_payload.published_on_tiktok = true;
                await pool.query(`UPDATE studio_tasks SET media_payload = $1 WHERE id = $2`, [JSON.stringify(task.media_payload), task.id]);
                console.log(`[TikTok] ✅ Tarea #${task.id} marcada como publicada en DB.`);
            } else {
                console.error(`[TikTok] ❌ Botón de publicar bloqueado o no encontrado.`);
            }
        }
    } catch (e) {
        console.error('⚠️ Error en publishQueuedVideos:', e.message);
    }
};

let browserClient;

export const initTikTokBypass = async (isHeadless = true) => {
    console.log('🚀 Iniciando ZillaBot Bypass (TikTok Neurona)...');
    
    // Carpeta de sesión persistente local
    const sessionDir = path.join(path.dirname(__dirname), 'tiktok_session');
    let browser = null;

    // 🧹 Limpieza quirúrgica al arrancar: matar solo los Chrome de ESTE bot
    try {
        const { execSync } = await import('child_process');
        const out = execSync('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine', { encoding: 'utf-8', windowsHide: true });
        const lines = out.split('\n');
        let count = 0;
        for (const line of lines) {
            if (line.includes('tiktok_session')) {
                const match = line.match(/\s+(\d+)\s*$/);
                if (match) {
                    try { execSync(`taskkill /F /PID ${match[1]} /T`, { windowsHide: true, stdio: 'ignore' }); count++; } catch(_){}
                }
            }
        }
        if (count > 0) console.log(`[TikTok] 🧹 ${count} Chrome zombie(s) del perfil eliminado(s).`);
    } catch(_) { /* wmic no disponible, omitir */ }

    browser = await puppeteer.launch({
        headless: 'old',
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        userDataDir: sessionDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
        protocolTimeout: 120000
    });

    browserClient = browser;
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    if (!isHeadless) {
        console.log('🟢 MODO LOGIN MANUAL ACTIVO. Abre tu navegador y conéctate. Cierra Chromium al terminar.');
        await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2' });
        return; // Sale y espera intervención humana
    }

    // BUG FIX: El loop debe ser awaitable para que el finally no se ejecute prematuramente.
    // Usamos un while(true) directo en vez de un IIFE sin await.
    let iterations = 0;
    try {
        while (true) {
            try {
                await scrapeAndRespondDMs(page);

                // GC: Limpiar processedMessages si crece demasiado (memory leak fix)
                if (processedMessages.size > 2000) {
                    let i = 0;
                    for (const key of processedMessages) {
                        if (i++ < 1000) processedMessages.delete(key);
                        else break;
                    }
                    console.log('[TikTok] 🧹 GC: Liberando memoria de processedMessages.');
                }

                // NUEVO: Cola de Publicación de Videos Autónomos
                await publishQueuedVideos(page);

                // Solo checar comentarios 1 de cada 4 veces (cada 60s)
                if (iterations % 4 === 0) {
                    await checkComments(page);
                }
                iterations++;
            } catch (e) {
                console.error('Error iteración TikTok:', e.message);
                // Self-healing: igual que Instagram — reparar pestaña detached
                if (e.message && (e.message.includes('detached') || e.message.includes('timeout') || e.message.includes('ProtocolError'))) {
                    console.log('[TikTok] ⚠️ Pestaña corrupta. Auto-reparando...');
                    try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch(err){}
                }
            }
            console.log(`💤 Esperando ${POLLING_INTERVAL_MS / 1000}s para próximo chequeo...`);
            await delay(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS + 5000);
        }
    } finally {
        // ✅ El finally corre SOLO cuando el while termina (nunca en condiciones normales)
        // o cuando el proceso recibe SIGINT/SIGTERM y el loop se interrumpe.
        if (browser) {
            console.log('[TikTok] 🧹 Cerrando Chrome limpiamente (finally)...');
            await browser.close().catch(() => {});
            browserClient = null;
        }
    }
};

async function forceKillBrowser() {
    if (browserClient) {
        try {
            console.log('[TikTok] 🛑 Forzando cierre de Chrome/Puppeteer...');
            // On Windows, process.kill with SIGKILL leaves renderer and GPU child processes as zombies.
            // Using browser.close() is the safest way to terminate all child processes gracefully.
            if (browserClient.close) await browserClient.close().catch(()=>null);
            else if (browserClient.destroy) await browserClient.destroy().catch(()=>null);
            console.log('[TikTok] ✅ Chrome cerrado limpiamente.');
        } catch (e) {
            console.error('[TikTok] ⚠️ Error cerrando Chrome:', e.message);
        }
    }
}

// AUTO-START for PM2 standalone
const isLoginMode = process.argv.includes('--login');
initTikTokBypass(!isLoginMode).catch(async err => {
    console.error('[TikTok] ❌ Fatal:', err.message);
    await forceKillBrowser();
    process.exit(1);
});

// PM2 Cleanup
process.on('SIGINT', async () => { await forceKillBrowser(); process.exit(0); });
process.on('SIGTERM', async () => { await forceKillBrowser(); process.exit(0); });
process.on('message', async (msg) => {
    if (msg === 'shutdown') {
        await forceKillBrowser();
        process.exit(0);
    }
});
process.on('uncaughtException', async (err) => {
    console.error('[TikTok] Uncaught Exception:', err.message);
    await forceKillBrowser();
    process.exit(1);
});
process.on('unhandledRejection', async (reason) => {
    console.error('[TikTok] Unhandled Rejection:', reason);
    await forceKillBrowser();
    process.exit(1);
});
