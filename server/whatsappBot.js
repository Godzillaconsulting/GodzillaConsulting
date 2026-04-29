import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import qrcodeLib from 'qrcode';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import pool from './config/db.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from './services/calendarService.js';
import { validateBusinessHours } from './utils/businessHours.js';
import { sendCitaConfirmationEmail } from './services/emailService.js';
import { SYSTEM_PROMPT, chatTools, withTimeout } from './config/zilla-prompt.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import { executeAiWaterfall } from './utils/aiWaterfall.js';
import { searchMemories } from './core_engine/aiCore.js';

// child_process ya no se usa — limpieza garantizada por shutdown handlers
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

        const waterfallResponse = await executeAiWaterfall([
            { role: 'system', content: systemPromptContexto },
            { role: 'user', content: prompt }
        ]);
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


export const initWhatsAppBot = async () => {
    console.log("🟢 Iniciando Cliente de WhatsApp Local (whatsapp-web.js)...");

    // La limpieza de Chrome está garantizada por los handlers de SIGINT y uncaughtException al fondo.
    
    // Ruta persistente segura fuera del despliegue: ~/.godzilla-sessions

    // ==============================================================================
    // 🚨 RECORDATORIO PARA FUTUROS AGENTES (ZILLA IA) 🚨
    // NUNCA, BAJO NINGUNA CIRCUNSTANCIA, BORRES O ALTERES LOS PERMISOS (chmod) DE ESTA SESIÓN.
    // Aunque el usuario ejecute la "Opción 10" (Limpieza Zombie), NO intentes
    // meter un "taskkill /F" aquí adentro ni borrar la carpeta `.wwebjs_auth`.
    // La sesión debe persistir siempre para evitar pedir el QR. Solo reinicia el bot
    // y deja que recupere su sesión existente. 
    // ==============================================================================
    const sessionPath = 'C:\\Users\\GODZILLA.IA\\GodzillaConsulting\\server\\.wwebjs_auth';
    
    try {
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
            console.log(`[Seguridad] Directorio de sesión creado.`);
        }
    } catch (e) {
        console.warn(`⚠️ [Seguridad] Error verificando el directorio de sesión: ${e.message}`);
    }
    
    // 🧹 Limpieza al arrancar: Evitamos taskkill /F porque corrompe la sesión de LevelDB de Chrome.
    // Si Chrome quedó colgado, permitimos que el OS maneje los locks o que client.destroy() lo haya limpiado antes.

    // Ruta explícita al Chrome del sistema para evitar crasheos cuando el proceso
    // corre como Windows Service (NSSM/SYSTEM) que no tiene acceso al caché de puppeteer.
    const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    const client = new Client({

        authStrategy: new LocalAuth({ dataPath: sessionPath }),
        puppeteer: {
            headless: true,
            executablePath: CHROME_PATH,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-gpu',
                '--disable-gpu-sandbox',       // Requerido bajo SYSTEM (sin sesión de escritorio)
                '--disable-software-rasterizer',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--mute-audio',
                '--disable-translate',
                '--safebrowsing-disable-auto-update',
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

    client.on('authenticated', (session) => {
        console.log('🔑 [AUTH] ¡Autenticación exitosa! Esperando el evento ready...');
    });

    client.on('auth_failure', msg => {
        console.error('❌ [AUTH FAILURE] Falla en la autenticación:', msg);
        currentQR = null;
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️ [DISCONNECTED] Cliente desconectado. Razón:', reason);
        currentQR = null;
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

        // ===============================================
        // POLLING: COLA DE AUTOMATIZACIÓN (bot_outbound_queue)
        // ===============================================
        setInterval(async () => {
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
                        
                        // Formatear a ID de WhatsApp (ej. 521656... @c.us)
                        if (!toPhone.includes('@c.us')) {
                            // Limpiar no numéricos
                            toPhone = toPhone.replace(/[^0-9]/g, '');
                            toPhone = `${toPhone}@c.us`;
                        }

                        console.log(`[WA Outbound Queue] 📤 Enviando mensaje a ${toPhone}...`);
                        await client.sendMessage(toPhone, message);
                        
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

            let rawHistory = historial_mensajes.slice(0, -1);
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
            const GREETING_REGEX = /^(hola|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|buenas|hey|hi|hello|buen\s+d[ií]a|qu[eé]\s+tal|saludos|qué\s+onda|q\s+onda|good\s+morning|good\s+afternoon|good\s+evening|sup|howdy|yo)[!¡.,\s]*$/i;
            const isGreetingOnly = GREETING_REGEX.test(messageText.trim());

            let botReply = "Lo siento, fallé al entender.";
            let functionCalls = [];

            try {
                // Si es saludo: no pasamos tools al waterfall (evita alucinaciones de tool_call)
                const waterfallOptions = isGreetingOnly
                    ? { temperature: 0.5 }
                    : { tools: groqTools };
                const waterfallResponse = await executeAiWaterfall(groqMessages, waterfallOptions);
                botReply = waterfallResponse.content || "";
                
                if (waterfallResponse.tool_calls && waterfallResponse.tool_calls.length > 0) {
                    groqMessages.push({ 
                        role: 'assistant', 
                        content: botReply, 
                        tool_calls: waterfallResponse.tool_calls 
                    });
                    
                    functionCalls = waterfallResponse.tool_calls.map(tc => {
                        let parsedArgs = {};
                        try { parsedArgs = JSON.parse(tc.function.arguments); } catch(e){}
                        return {
                            name: tc.function.name,
                            args: parsedArgs,
                            id: tc.id
                        };
                    });
                }
            } catch(error) {
                console.error("❌ Waterfall Error en WA:", error.message);
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
                            fRes = { error: "Faltan parámetros reales. DEBES preguntarle al usuario para qué fecha y hora quiere agendar ANTES de revisar disponibilidad." };
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
                                fRes = { success: false, error: "Faltan datos obligatorios o son marcadores de posición. Pídele al usuario todos los datos faltantes (Nombre, fecha, hora, etc)." };
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
                        const r = await pool.query("SELECT title, slug FROM lead_magnets");
                        fRes = { resources: r.rows };
                    }
                    // Pushing tool response to Groq messages
                    groqMessages.push({
                        role: "tool",
                        tool_call_id: call.id,
                        name: callName,
                        content: JSON.stringify(fRes)
                    });
                }
                
                // Second call to Groq with tool results
                try {
                    const waterfallResponse2 = await executeAiWaterfall(groqMessages);
                    botReply = waterfallResponse2.content || 'Reserva procesada.';
                } catch(e) {
                    console.error("❌ Error en segunda llamada Waterfall (tools):", e.message);
                }
            }

            console.log(`🤖 ZillaBot (WA) respondió a [${maskedSender}] exitosamente.`);
            await client.sendMessage(senderId, botReply);

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
        if (err && err.code === 'EADDRINUSE') {
            console.warn(`⚠️ [Ignorado] PM2 lanzó uncaughtException por EADDRINUSE. Escaneo QR usando puerto ocupado. El bot seguirá corriendo.`);
            return; // No matar el proceso de WhatsApp, dejar que el callback se ocupe!
        }
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
        try { await client.destroy(); console.log('✅ Chrome cerrado limpiamente.'); } catch (e) {}
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        console.log('🛑 [SIGTERM] Recibida orden de apagado (PM2). Cerrando Chrome/Puppeteer...');
        try { await client.destroy(); console.log('✅ Chrome cerrado limpiamente.'); } catch (e) {}
        process.exit(0);
    });
};

// AUTO-START for PM2 standalone
import { fileURLToPath } from 'url';
const isPM2 = process.env.pm_id !== undefined;
if (isPM2 || process.argv[1] === fileURLToPath(import.meta.url)) {
    initWhatsAppBot();
}
