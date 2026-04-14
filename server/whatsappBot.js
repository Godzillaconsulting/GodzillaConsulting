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
dotenv.config();


async function appendMessageToSession(senderId, role, content, plataforma = 'whatsapp_web') {
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
        console.error("❌ Error en appendMessageToSession (WA):", e.message);
        return null;
    }
}

// Helper: Compresión con Gemini
async function compressContextIfNeeded(senderId, historial_mensajes, resumen_contexto) {
    if (!historial_mensajes || historial_mensajes.length < 20) return;

    try {
        console.log(`[Compresión WA] Iniciando compresión de memoria para ${senderId}...`);
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let historyText = historial_mensajes.map(m => `${m.role === 'user' ? 'Cliente' : 'Zilla'}: ${m.contenido}`).join('\n');

        let prompt = `Resume esta conversación en 3 párrafos clave, manteniendo los datos importantes (nombre, servicio de interés, citas o detalles clave).\n\nConversación:\n${historyText}`;
        if (resumen_contexto) {
            prompt = `Aquí tienes el resumen anterior de este cliente:\n${resumen_contexto}\n\nAhora, concatena/actualiza ese resumen integrando esta nueva parte de la conversación en 3 párrafos clave, manteniendo los datos importantes.\n\nNueva parte de la conversación:\n${historyText}`;
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
        console.log(`[Compresión WA] ✅ Memoria comprimida y guardada para ${senderId}.`);
    } catch (e) {
        console.error("❌ Error comprimiendo contexto WA:", e);
    }
}


export const initWhatsAppBot = () => {
    console.log("🟢 Iniciando Cliente de WhatsApp Local (whatsapp-web.js)...");
    
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

    client.on('ready', () => {
        currentQR = null;
        console.log('✅ ZillaBot (WhatsApp Web) está conectado y listo!');
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

    const QR_PORT = process.env.QR_PORT || 3002;
    qrApp.listen(QR_PORT, () => {
        console.log(`🌐 [Enlace de Escaneo Remoto] Envía esto a tu cliente: http://localhost:${QR_PORT}/qr`);
    });

    client.on('message', async (message) => {
        if (message.isGroupMsg) return;
        if (!message.body) return;

        const senderId = message.from;
        const messageText = message.body;

        const maskedSender = senderId.substring(0, 4) + "****" + senderId.substring(senderId.length - 4);
        console.log(`📩 WA Msg recibido [${maskedSender}]: [MENSAJE OCULTO POR SEGURIDAD PII]`);

let dynamicPromptWA = null;
let lastPromptCheckWA = 0;

async function getSystemPromptWA() {
    if (Date.now() - lastPromptCheckWA > 60000 || !dynamicPromptWA) {
        try {
            const res = await pool.query("SELECT dm_system_prompt FROM bot_configs WHERE plataforma = 'whatsapp'");
            if (res.rows.length > 0 && res.rows[0].dm_system_prompt) {
                dynamicPromptWA = res.rows[0].dm_system_prompt;
                console.log('[WA] 🔄 SYSTEM PROMPT actualizado desde Cerebro Central');
            } else if (!dynamicPromptWA) {
                dynamicPromptWA = SYSTEM_PROMPT; // fallback init
            }
            lastPromptCheckWA = Date.now();
        } catch(e) {
            console.error("Error leyendo bot config WA:", e.message);
            if (!dynamicPromptWA) dynamicPromptWA = SYSTEM_PROMPT;
        }
    }
    return dynamicPromptWA;
}

// ... helper to get chat config
        try {
            const sessionData = await appendMessageToSession(senderId, "user", messageText);
            if (!sessionData) return;

            const { historial_mensajes, resumen_contexto } = sessionData;

            let finalSystemPrompt = await getSystemPromptWA();
            if (resumen_contexto && resumen_contexto.trim() !== '') {
                finalSystemPrompt += `\n\n## MEMORIA A LARGO PLAZO DEL CLIENTE:\n${resumen_contexto}\n(Usa esta información para no preguntar cosas que ya sabes, pero no la repitas robóticamente).`;
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
                "Lo lamento, la señal de mi servidor es un poco débil ahora mismo. ¿Podemos intentarlo en unos minutos?"
            );
            let botReply = "Lo siento, fallé al entender.";
            try { botReply = result.response.text(); } catch(e) {}

            let rawFc = result.response.functionCalls;
            const functionCalls = typeof rawFc === 'function' ? rawFc.call(result.response) : rawFc;
            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    let fRes = {};
                    if (call.name === "check_availability") {
                        const { fecha, hora } = call.args;
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
                    } else if (call.name === "save_appointment") {
                        try {
                            const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                            
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
                    } else if (call.name === "cancel_appointment") {
                        const { telefono } = call.args;
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
                    } else if (call.name === "reschedule_appointment") {
                        const { telefono, nueva_fecha, nueva_hora } = call.args;
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
                    } else if (call.name === "get_available_downloads") {
                        const r = await pool.query("SELECT title, slug FROM lead_magnets");
                        fRes = { resources: r.rows };
                    }

                    result = await withTimeout(
                        chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]),
                        "Disculpa la demora, estaba registrando los datos pero mi conexión falló un instante. ¿Podrías confirmarme lo último?"
                    );
                    try { botReply = result.response.text(); } catch(e) {}
                }
            }

            console.log(`🤖 ZillaBot (WA) respondió a [${maskedSender}] exitosamente.`);
            await client.sendMessage(senderId, botReply);

            const postBotSession = await appendMessageToSession(senderId, "model", botReply);
            if (postBotSession && postBotSession.historial_mensajes && postBotSession.historial_mensajes.length >= 20) {
                compressContextIfNeeded(senderId, postBotSession.historial_mensajes, postBotSession.resumen_contexto);
            }

        } catch (error) {
            console.error("❌ Error interno procesando WA message:", error);
        }
    });

    client.initialize();

    // ==========================================
    // 🛡️ PM2 GRACEFUL SHUTDOWN (WINDOWS FIX)
    // ==========================================
    // Escucha las señales de PM2 para destruir limpiamente Puppeteer
    // y evitar que quede congelado en memoria RAM tomando rehén la sesión.
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
