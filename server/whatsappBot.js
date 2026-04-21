import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import qrcodeLib from 'qrcode';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from './config/db.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from './services/calendarService.js';
import { sendCitaConfirmationEmail } from './services/emailService.js';
import { SYSTEM_PROMPT, chatTools, withTimeout } from './config/zilla-prompt.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
dotenv.config();

const activeSessionsCache = new Map();
const userMessageQueues = new Map();

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

// Helper: Compresión con Gemini
async function compressContextIfNeeded(senderId, historial_mensajes, resumen_contexto) {
    if (!historial_mensajes || historial_mensajes.length < 20) return;

    try {
        console.log(`[Compresión WA] Iniciando compresión de memoria para ${senderId}...`);
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let historyText = historial_mensajes.map(m => `${m.role === 'user' ? 'Cliente' : 'Zilla'}: ${m.contenido}`).join('\n');

        let prompt = `Resume esta conversación en 3 párrafos clave, manteniendo los datos importantes (nombre, servicio de interés, citas o detalles clave).\n\nConversación:\n${historyText}`;
        if (resumen_contexto) {
            prompt = `Aquí tienes el resumen anterior de este cliente:\n${resumen_contexto}\n\nAhora, concatena/actualiza ese resumen integrando esta nueva parte de la conversación en 3 párrafos clave, manteniendo los datos importantes.\n\nNueva parte de la conversación:\n${historyText}`;
        }

        const chatCompletion = await model.generateContent(prompt);
        const newSummary = chatCompletion.response.text();

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


export const initWhatsAppBot = () => {
    console.log("🟢 Iniciando Cliente de WhatsApp Local (whatsapp-web.js)...");

    // 🔥 PREVENCIÓN DE HILOS ZOMBIES Y CONSUMO DE RAM 🔥
    // Si PM2 reinicia el bot, nos aseguramos de que no queden procesos huérfanos de Chrome
    try {
        const out = execSync('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine', { encoding: 'utf-8', windowsHide: true });
        const lines = out.split('\n');
        let killed = 0;
        for (const line of lines) {
            if (line.includes('--headless') || line.includes('puppeteer') || line.includes('.wwebjs_auth') || line.includes('whatsapp-web.js')) {
                const match = line.match(/\s+(\d+)\s*$/);
                if (match) {
                    try {
                        execSync(`taskkill /F /PID ${match[1]} /T`, { windowsHide: true, stdio: 'ignore' });
                        killed++;
                    } catch(e){}
                }
            }
        }
        if (killed > 0) console.log(`[Seguridad WA] 🧹 Se asesinaron ${killed} procesos zombies de Chrome/Node antes de levantar.`);
    } catch(e) { /* silent fail si wmic no está disponible */ }
    
    // Ruta persistente segura fuera del despliegue: ~/.godzilla-sessions

    const sessionPath = path.join(os.homedir(), '.godzilla-sessions', 'whatsapp');
    
    // Rutina de Seguridad: Bloquear lectura externa (chmod 700)
    try {
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true, mode: 0o700 });
        } else {
            fs.chmodSync(sessionPath, 0o700);
        }
        console.log(`🔒 [Seguridad] Permisos 700 aplicados a la sesión de WhatsApp.`);
    } catch (e) {
        console.warn(`⚠️ [Seguridad] No se pudieron aplicar permisos 700 a la sesión: ${e.message}`);
    }
    
    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: sessionPath }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',       // Evita crash en RAM baja (usa /tmp)
                '--disable-accelerated-2d-canvas',// Apaga canvas GPU
                '--no-first-run',
                '--no-zygote',                   // Reduce procesos hijo de Chrome
                '--single-process',              // Corre todo en 1 proceso (menos RAM)
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--metrics-recording-only',
                '--mute-audio',
                '--safebrowsing-disable-auto-update',
                '--js-flags=--max-old-space-size=256', // Limitar JS heap a 256MB
            ]
        }
    });

    let currentQR = null;

    client.on('qr', (qr) => {
        currentQR = qr;
        console.log('\n======================================================');
        console.log('📱 CÓDIGO QR GENERADO. DISPONIBLE EN LA URL WEB Y TERMINAL 📱');
        console.log('======================================================');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', async () => {
        currentQR = null;
        console.log('✅ ZillaBot (WhatsApp Web) está conectado y listo!');
        console.log('🔄 Escaneando y recuperando mensajes que entraron mientras estaba apagado...');
        try {
            const chats = await client.getChats();
            let unreadCount = 0;
            for (const chat of chats) {
                if (chat.unreadCount > 0 && !chat.isGroup) {
                    const messages = await chat.fetchMessages({ limit: chat.unreadCount });
                    for (const msg of messages) {
                        if (!msg.fromMe) {
                            unreadCount++;
                            // Forzamos al bot a que procese este mensaje como si acabara de llegar
                            client.emit('message', msg);
                        }
                    }
                }
            }
            console.log(`✅ Se recuperaron y enviaron a procesar ${unreadCount} mensajes perdidos.`);
        } catch (e) {
            console.error('⚠️ Error al recuperar mensajes perdidos:', e.message);
        }
    });

    // ===============================================
    // MICRO-SERVIDOR WEB PARA ENVIARLE EL QR AL CLIENTE
    // ===============================================
    const qrApp = express();
    qrApp.get('/qr', async (req, res) => {
        if (!currentQR) {
            return res.send(`
                <h2 style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    ✅ El bot ya está conectado, o el QR aún se está generando (Recarga en 5 segundos).
                </h2>
            `);
        }
        try {
            const qrImageURL = await qrcodeLib.toDataURL(currentQR);
            res.send(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #111; color: white;">
                    <h1 style="color: #ff0000;">Escanea con WhatsApp</h1>
                    <p>Abre WhatsApp en tu celular > Dispositivos Vinculados > Vincular un dispositivo</p>
                    <img src="${qrImageURL}" style="width: 350px; height: 350px; border-radius: 10px; padding: 20px; background: white;" />
                    <p style="margin-top: 20px; opacity: 0.6;">Godzilla Consulting - Bot Authentication</p>
                </div>
            `);
        } catch (e) {
            res.status(500).send("Error generando imagen QR: " + e.message);
        }
    });

        const QR_PORT_BASE = parseInt(process.env.QR_PORT || 3002, 10);
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

    client.on('message', async (message) => {
        if (message.isGroupMsg) return;
        if (!message.body) return;

        const senderId = message.from;
        const rawMessageText = message.body;

        const maskedSender = senderId.substring(0, 4) + "****" + senderId.substring(senderId.length - 4);
        console.log(`📩 WA Msg recibido [${maskedSender}]: [ENTRANDO A COLA DE ESPERA]`);

        if (!userMessageQueues.has(senderId)) {
            userMessageQueues.set(senderId, { timer: null, msgBuffer: [] });
        }
        
        const queueObj = userMessageQueues.get(senderId);
        queueObj.msgBuffer.push(rawMessageText);

        if (queueObj.timer) return; // Si ya hay un timer corriendo, solo aglomera el spam

        const jitter = Math.floor(Math.random() * 800) + 200; // Inyectar 200 a 1000ms de retardo
        
        queueObj.timer = setTimeout(async () => {
            const messageText = queueObj.msgBuffer.join(" \\n ");
            userMessageQueues.delete(senderId); // Limpiar cola
            console.log(`🚀 WA Procesando batch para [${maskedSender}] (Jitter: ${jitter}ms)`);


        try {
            const sessionData = await appendMessageToSession(senderId, "user", messageText);
            if (!sessionData) return;

            const { historial_mensajes, resumen_contexto } = sessionData;

            let finalSystemPrompt = await getSystemPromptWA();
            if (resumen_contexto && resumen_contexto.trim() !== '') {
                finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}\n(Usa esta información para no preguntar cosas que ya sabes, pero no la repitas robóticamente).`;
            }

            let geminiMessages = [];
            let rawHistory = historial_mensajes.slice(0, -1);
            for (const msg of rawHistory) {
                geminiMessages.push({
                    role: (msg.role === "assistant" || msg.role === "model") ? "model" : "user",
                    parts: [{ text: msg.contenido }]
                });
            }

            const apiKey = (process.env.GEMINI_API_KEY || "").trim();
            const genAI = new GoogleGenerativeAI(apiKey);
            
            // Format tools for Gemini 1.5
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

            const chat = model.startChat({ history: geminiMessages });

            let chatCompletion = await withTimeout(
                chat.sendMessage(messageText),
                "Lo lamento, la señal de mi servidor es un poco débil ahora mismo. ¿Podemos intentarlo en unos minutos?"
            );

            let botReply = "Lo siento, fallé al entender.";
            let responseMessage = null;
            let functionCalls = [];

            if (chatCompletion && chatCompletion.response) {
                const response = chatCompletion.response;
                try { botReply = response.text() || botReply; } catch(e){}
                
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

                    if (callName === "check_availability") {
                        const { fecha, hora } = callArgs;
                        const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
                        const isSunday = dateObj.getDay() === 0;
                        const hourInt = parseInt(hora.split(':')[0], 10);
                        const now = new Date();

                        if (dateObj < now) {
                            fRes = { disponible: false, razon: "La fecha solicitada es en el pasado. Solicita una fecha futura." };
                            console.log(`[WA Guardián] Rechazo: Fecha Pasada para ${fecha} a las ${hora}`);
                        } else if (isSunday) {
                            fRes = { disponible: false, razon: "Los domingos no laboramos. Por favor solicita otro día." };
                            console.log(`[WA Guardián] Rechazo: Domingo para ${fecha} a las ${hora}`);
                        } else if (hourInt < 9 || hourInt >= 19) {
                            fRes = { disponible: false, razon: "Fuera de horario de oficina (9am a 7pm). Por favor solicita otra hora." };
                            console.log(`[WA Guardián] Rechazo: Fuera de Horario para ${fecha} a las ${hora}`);
                        } else {
                            const query = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                            const r = await pool.query(query, [fecha, hora]);
                            fRes = { disponible: parseInt(r.rows[0].total) === 0 };
                            console.log(`[WA Tool] Disponibilidad ${fecha} a las ${hora}: ${fRes.disponible}`);
                        }
                    } else if (callName === "save_appointment") {
                        try {
                            const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                            
                            const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
                            const isSunday = dateObj.getDay() === 0;
                            const hourInt = parseInt(hora.split(':')[0], 10);
                            const now = new Date();

                            if (dateObj < now) {
                                 console.warn(`⚠️ [Cita Rechazada por Guardián Final]: Fecha pasada ${fecha} ${hora}`);
                                 fRes = { success: false, error: "Intento de agendar en el pasado. Pide otra fecha/hora a futuro." };
                            } else if (isSunday || hourInt < 9 || hourInt >= 19) {
                                 console.warn(`⚠️ [Cita Rechazada por Guardián Final]: ${fecha} ${hora}`);
                                 fRes = { success: false, error: "Intento de agendar fuera de horario o en domingo. Pide otra fecha/hora al cliente." };
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
                                    await cancelarEnGoogleCalendar(cita.google_calendar_id);
                                }
                                await pool.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita.id]);
                                fRes = { success: true, message: "Cita cancelada correctamente." };
                                console.log(`[WA Tool] Cita ${cita.id} cancelada exitosamente.`);
                            }
                        } catch (err) {
                            console.error("❌ Error cancelando:", err);
                            fRes = { success: false, error: "Error interno procesando cancelación." };
                        }
                    } else if (callName === "reschedule_appointment") {
                        const { telefono, nueva_fecha, nueva_hora } = callArgs;
                        try {
                            const result = await pool.query("SELECT id, google_calendar_id FROM citas WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                            if (result.rows.length === 0) {
                                fRes = { success: false, error: "No encontré ninguna cita activa previa con ese número de teléfono." };
                            } else {
                                const cita = result.rows[0];
                                
                                // Verificar empalme para la nueva hora
                                const dateObj = new Date(`${nueva_fecha}T${nueva_hora}:00-07:00`);
                                const isSunday = dateObj.getDay() === 0;
                                const hourInt = parseInt(nueva_hora.split(':')[0], 10);
                                const now = new Date();

                                if (dateObj < now) {
                                    fRes = { success: false, error: "La nueva fecha/hora ya pasó. Intenta con una fecha futura." };
                                } else if (isSunday || hourInt < 9 || hourInt >= 19) {
                                    fRes = { success: false, error: "El nuevo horario está fuera de horario de oficina o es domingo." };
                                } else {
                                    const queryConflict = `SELECT COUNT(*) as total FROM citas WHERE fecha=$1 AND ABS(EXTRACT(EPOCH FROM (hora::time - $2::time))) < 3600 AND status!='cancelada'`;
                                    const conflictCheck = await pool.query(queryConflict, [nueva_fecha, nueva_hora]);
                                
                                    if (parseInt(conflictCheck.rows[0].total) > 0) {
                                        fRes = { success: false, error: "Ese nuevo horario está ocupado. Intenta con otra fecha/hora." };
                                    } else {
                                        if (cita.google_calendar_id) {
                                            await actualizarEnGoogleCalendar(cita.google_calendar_id, nueva_fecha, nueva_hora);
                                        }
                                        await pool.query("UPDATE citas SET fecha = $1, hora = $2 WHERE id = $3", [nueva_fecha, nueva_hora, cita.id]);
                                        fRes = { success: true, message: "Cita reagendada exitosamente." };
                                        console.log(`[WA Tool] Cita ${cita.id} reagendada exitosamente.`);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("❌ Error reagendando:", err);
                            fRes = { success: false, error: "Error técnico reagendando, intenta de nuevo más tarde." };
                        }
                    } else if (callName === "get_available_downloads") {
                        const r = await pool.query("SELECT title, slug FROM lead_magnets");
                        fRes = { resources: r.rows };
                    }

                    // Send tool results back to Gemini via existing chat object
                    const chatCompletion2 = await withTimeout(
                        chat.sendMessage([{
                            functionResponse: {
                                name: callName,
                                response: fRes
                            }
                        }]),
                        "Disculpa la demora, estaba registrando los datos pero mi conexión falló un instante. ¿Podrías confirmarme lo último?"
                    );
                    
                    if (chatCompletion2 && chatCompletion2.response) {
                         try { botReply = chatCompletion2.response.text() || 'Reserva procesada.'; } catch(e){}
                    }
                }
            }

            console.log(`🤖 ZillaBot (WA) respondió a [${maskedSender}] exitosamente.`);
            await client.sendMessage(senderId, botReply);

            const postBotSession = await appendMessageToSession(senderId, "model", botReply);
            if (postBotSession && postBotSession.historial_mensajes && postBotSession.historial_mensajes.length >= 20) {
                compressContextIfNeeded(senderId, postBotSession.historial_mensajes, postBotSession.resumen_contexto);
            }

            // GC (Garbage Collection Manual - Limpieza Agresiva)
            geminiMessages = null;
            rawHistory = null;
            finalSystemPrompt = null;
            chatCompletion = null;

        } catch (error) {
            console.error("❌ Error interno procesando WA message:", error);
        }
        }, 2000 + jitter); // Ventana de 2 segundos de agrupación de mensajes + Jitter
    });

    client.initialize();

    // ==========================================
    // 🛡️ PM2 GRACEFUL SHUTDOWN (WINDOWS FIX)
    // ==========================================
    // Escucha las señales de PM2 para destruir limpiamente Puppeteer
    // y evitar que quede congelado en memoria RAM tomando rehén la sesión.
    
    const emergencyShutdown = async (err, origin) => {
        console.error(`🛑 [CRASH] Fatal Error (${origin}):`, err);
        try {
            console.log('Cerrando Chrome de emergencia...');
            await client.destroy();
        } catch (e) {}
        process.exit(1);
    };

    process.on('uncaughtException', (err) => emergencyShutdown(err, 'uncaughtException'));
    process.on('unhandledRejection', (err) => emergencyShutdown(err, 'unhandledRejection'));

    process.on('SIGINT', async () => {
        console.log('🛑 [SIGINT] Recibida orden de apagado (PM2). Cerrando Chrome/Puppeteer...');
        try {
            await client.destroy();
            console.log('✅ Chrome cerrado limpiamente.');
        } catch (e) {
            console.error('⚠️ Error cerrando Chrome:', e.message);
        }
        process.exit(0);
    });
};

// AUTO-START for PM2 standalone
import { fileURLToPath } from 'url';
const isPM2 = process.env.pm_id !== undefined;
if (isPM2 || process.argv[1] === fileURLToPath(import.meta.url)) {
    initWhatsAppBot();
}
