import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from './config/db.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from './services/calendarService.js';
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
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-gpu'
            ],
            headless: 'new'
        }
    });

    client.on('qr', (qr) => {
        console.log('\n======================================================');
        console.log('📱 ESCANEA ESTE CÓDIGO QR CON LA APP DE WHATSAPP 📱');
        console.log('======================================================');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ ZillaBot (WhatsApp Web) está conectado y listo!');
    });

    client.on('message', async (message) => {
        if (message.isGroupMsg) return;
        if (!message.body) return;

        const senderId = message.from;
        const messageText = message.body;

        const maskedSender = senderId.substring(0, 4) + "****" + senderId.substring(senderId.length - 4);
        console.log(`📩 WA Msg recibido [${maskedSender}]: [MENSAJE OCULTO POR SEGURIDAD PII]`);

        try {
            const sessionData = await appendMessageToSession(senderId, "user", messageText);
            if (!sessionData) return;

            const { historial_mensajes, resumen_contexto } = sessionData;

            let finalSystemPrompt = SYSTEM_PROMPT;
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
            let botReply = result.response.text();

            const functionCalls = result.response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    let fRes = {};
                    if (call.name === "check_availability") {
                        const { fecha, hora } = call.args;
                        const query = `
                            SELECT SUM(c) as total FROM (
                                SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                                UNION ALL
                                SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                UNION ALL
                                SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                            ) as sum_tables
                        `;
                        const r = await pool.query(query, [fecha, hora]);
                        fRes = { disponible: parseInt(r.rows[0].total) === 0 };
                        console.log(`[WA Tool] Disponibilidad ${fecha} a las ${hora}: ${fRes.disponible}`);
                    } else if (call.name === "save_appointment") {
                        try {
                            const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                            
                            const queryConflict = `
                                SELECT SUM(c) as total FROM (
                                    SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                    UNION ALL
                                    SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                ) as sum_tables
                            `;
                            const conflictCheck = await pool.query(queryConflict, [fecha, hora]);
                            
                            if (parseInt(conflictCheck.rows[0].total) > 0) {
                                 console.warn(`⚠️ [WA Empalme] Intento de agendar ocupado: ${fecha} ${hora}`);
                                 fRes = { success: false, error: "Horario recién ocupado." };
                            } else {
                                const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                                
                                try {
                                    const calendarId = await agendarEnGoogleCalendar(datosCita);
                                    
                                    const r = await pool.query(
                                        "INSERT INTO citas_whatsapp (nombre, telefono, fecha_cita, hora, status, google_calendar_id) VALUES ($1,$2,$3,$4,'confirmada',$5) RETURNING id",
                                        [nombre, telefono, fecha, hora, calendarId]
                                    );
                                    
                                    fRes = { success: true, id: r.rows[0].id, alert: "Guardado en DB y Calendar." };
                                    
                                } catch (calErr) {
                                    console.error("❌ Fallo Google Calendar WA (NO se guardó en DB):", calErr.message);
                                    fRes = { success: false, error: "El sistema de agendas de Google rechazó el horario (" + calErr.message + "). Por favor intenta con otra fecha/hora." };
                                }
                            }
                        } catch (waErr) {
                            console.error("❌ Error WA Webhook Save_Appointment:", waErr);
                            fRes = { success: false, error: "Error de servidor interno." };
                        }
                    } else if (call.name === "cancel_appointment") {
                        const { telefono } = call.args;
                        try {
                            const result = await pool.query("SELECT id, google_calendar_id FROM citas_whatsapp WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                            if (result.rows.length === 0) {
                                fRes = { success: false, error: "No encontré ninguna cita activa con ese número de teléfono." };
                            } else {
                                const cita = result.rows[0];
                                if (cita.google_calendar_id) {
                                    await cancelarEnGoogleCalendar(cita.google_calendar_id);
                                }
                                await pool.query("UPDATE citas_whatsapp SET status = 'cancelada' WHERE id = $1", [cita.id]);
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
                            const result = await pool.query("SELECT id, google_calendar_id FROM citas_whatsapp WHERE telefono = $1 AND status = 'confirmada' ORDER BY id DESC LIMIT 1", [telefono]);
                            if (result.rows.length === 0) {
                                fRes = { success: false, error: "No encontré ninguna cita activa previa con ese número de teléfono." };
                            } else {
                                const cita = result.rows[0];
                                
                                // Verificar empalme para la nueva hora
                                const queryConflict = `
                                    SELECT SUM(c) as total FROM (
                                        SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                                        UNION ALL
                                        SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                        UNION ALL
                                        SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                                    ) as sum_tables
                                `;
                                const conflictCheck = await pool.query(queryConflict, [nueva_fecha, nueva_hora]);
                                
                                if (parseInt(conflictCheck.rows[0].total) > 0) {
                                    fRes = { success: false, error: "Ese nuevo horario está ocupado. Intenta con otra fecha/hora." };
                                } else {
                                    if (cita.google_calendar_id) {
                                        await actualizarEnGoogleCalendar(cita.google_calendar_id, nueva_fecha, nueva_hora);
                                    }
                                    await pool.query("UPDATE citas_whatsapp SET fecha_cita = $1, hora = $2 WHERE id = $3", [nueva_fecha, nueva_hora, cita.id]);
                                    fRes = { success: true, message: "Cita reagendada exitosamente." };
                                    console.log(`[WA Tool] Cita ${cita.id} reagendada exitosamente.`);
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
                    botReply = result.response.text();
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
