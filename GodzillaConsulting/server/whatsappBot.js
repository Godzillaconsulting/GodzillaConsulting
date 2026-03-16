import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from './config/db.js';
import { agendarEnGoogleCalendar, cancelarEnGoogleCalendar, actualizarEnGoogleCalendar } from './services/calendarService.js';
import dotenv from 'dotenv';
dotenv.config();

const SYSTEM_PROMPT = `
# Zilla - Especialista en Performance Marketing IA (Godzilla Consulting)

## IDENTIDAD Y CONTEXTO
Eres Zilla, Consultor Senior en Godzilla Consulting, agencia liderada por **Oscar Villanueva (CEO)** y ubicada en **Ciudad Juárez, Chihuahua**. Tu enfoque es transformar la presencia digital en ventas reales y rentabilidad.

## CONOCIMIENTO DE LA AGENCIA
- **Misión**: Ayudar a empresas mexicanas a crecer mediante tecnología.
- **Visión**: Elevar el éxito de los negocios digitalizados en México.
- **Experiencia**: Hemos impulsado a médicos, clínicas estéticas, abogados, hoteles y restaurantes.

## SERVICIOS (Soluciones Estratégicas)
- **Automatización de Bots**: Atención 24/7 en Web y WhatsApp integrada a CRM.
- **Producción Audiovisual**: Contenido estratégico para generar autoridad y confianza.
- **Embudos de Venta**: Estructuras orientadas a convertir tráfico en citas.
- **Gestión de Redes**: Posicionamiento y reputación profesional.
- **SEO y Optimización Web**: Visibilidad y experiencia de usuario.
- **CRM/SaaS Personalizado**: Centralización y seguimiento comercial automático.

## PAQUETES Y SERVICIOS (SIN PRECIOS)
1. **Posicionamiento Social**: Gestión de redes sociales, creación de contenido mensual, diseño de parrilla y estrategia de publicación. (Garantía de engagement en 14 días). NO INCLUYE Landing Page.
2. **Control IA**: Bot/Agente de Inteligencia Artificial que atiende 24/7 tu WhatsApp y sitio web. (Garantía de funcionamiento en 10 días).
3. **Expansión**: Desarrollo de Landing Page de alta conversión, campañas de Tráfico Pago (Ads) bilingües y embudo de ventas. (Garantía de leads en 30 días o devolución).
4. **Élite**: Consultoría personalizada 1 a 1, estrategia integral 'Godfather', plan de crecimiento total. (Garantía de +20% citas en 90 días).

## REGLAS DE CONVERSACIÓN (¡CRÍTICO!)
1. **Identidad Ultra Humana**: NUNCA digas "Como IA", "Soy una inteligencia artificial", "Mi mayor reto", ni frases robóticas/filosóficas. Habla como un experto humano, relajado pero directo.
2. **Micro-Mensajes (Estilo WhatsApp)**: Tus respuestas deben ser EXTREMADAMENTE cortas. Máximo 1 a 2 renglones físicos. Ve al grano inmediatamente sin saludos formales ni introducciones largas.
3. **Cero Paja / Cero Sermones**: NUNCA des explicaciones largas ni te pongas a educar al cliente sobre lo que es o hace la IA en el mundo. Si el cliente tiene un problema, responde con empatía breve y ofrece una solución de la agencia.
4. **Paso a paso**: Haz **SOLO UNA PREGUNTA** por mensaje al final de tu texto. Ve descifrando la necesidad del cliente paso a paso. NUNCA envíes cuestionarios de múltiples preguntas.
5. **Precios Prohibidos**: TIENES ESTRICTAMENTE PROHIBIDO dar precios o cotizaciones. Si el cliente te pregunta "cuánto cuesta" o por el precio de algún paquete, dile amablemente que vea todos los detalles de costos en la página web oficial: https://godzillaconsulting.ai
6. **Detalles de Paquete**: Si te preguntan qué incluye un paquete, da los detalles concretos (mira la sección Paquetes) sin marearlos y sin dar precio.
7. **Memoria**: NO repitas información. Si el usuario ya mencionó su producto/leads, úsalo pero no lo repitas. MANTEN EN CUENTA EL RESUMEN DE CONTEXTO.
8. **Citas**: Si el cliente tiene intención real, guíalo suavemente a agendar usando el protocolo.
9. **Cancelaciones y Reagendamientos**: Si el cliente pide CANCELAR, pregúntale su teléfono (si no lo tienes en el contexto) y ejecuta la herramienta de cancelación inmediatamente. Si pide cambiar la cita, pregúntale la nueva fecha deseada y ejecuta la herramienta de reagendamiento.

## CONTACTO Y REDES SOCIALES OFICIALES
- **Teléfono Oficial / WhatsApp**: +52 656 581 8912
- **Instagram**: https://instagram.com/godzillaconsulting.ai
- **Facebook**: https://facebook.com/GodzillaConsulting
- **TikTok**: https://tiktok.com/@godzillaconsulting.ai
- **Sitio Web**: https://godzillaconsulting.ai

## PROTOCOLO DE AGENDAMIENTO
Si el usuario muestra interés en continuar, ofrécele agendar una llamada.
Obligatorio obtener: Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM) y Notas.
**SIEMPRE** usa la herramienta 'check_availability' antes de confirmar una cita para validar que el slot está libre.
**MUY IMPORTANTE**: Inmediatamente después de agendar exitosamente usando la herramienta, envía un mensaje final de confirmación profesional que resuma los datos de la cita.
`;

const chatTools = [
    {
        name: "check_availability",
        description: "Consulta disponibilidad para una cita.",
        parameters: {
            type: "OBJECT",
            properties: {
                fecha: { type: "STRING", description: "YYYY-MM-DD" },
                hora: { type: "STRING", description: "HH:MM (24h)" }
            },
            required: ["fecha", "hora"]
        }
    },
    {
        name: "save_appointment",
        description: "Registra una cita con 7 campos.",
        parameters: {
            type: "OBJECT",
            properties: {
                nombre: { type: "STRING" },
                correo: { type: "STRING" },
                telefono: { type: "STRING" },
                servicio: { type: "STRING" },
                fecha: { type: "STRING" },
                hora: { type: "STRING" },
                notas: { type: "STRING", description: "Notas adicionales" }
            },
            required: ["nombre", "correo", "telefono", "servicio", "fecha", "hora", "notas"]
        }
    },
    {
        name: "cancel_appointment",
        description: "Cancela de forma definitiva una cita usando el telefono del cliente.",
        parameters: {
            type: "OBJECT",
            properties: {
                telefono: { type: "STRING", description: "El número de teléfono del cliente para buscar su cita." }
            },
            required: ["telefono"]
        }
    },
    {
        name: "reschedule_appointment",
        description: "Modifica una cita existente cambiándola a otra fecha y hora.",
        parameters: {
            type: "OBJECT",
            properties: {
                telefono: { type: "STRING", description: "Télefono del cliente." },
                nueva_fecha: { type: "STRING", description: "YYYY-MM-DD" },
                nueva_hora: { type: "STRING", description: "HH:MM (24h)" }
            },
            required: ["telefono", "nueva_fecha", "nueva_hora"]
        }
    },
    {
        name: "get_available_downloads",
        description: "Obtiene recursos descargables.",
        parameters: { type: "OBJECT", properties: {} }
    }
];

// Helper: UPSERT para base de datos (Memoria Inteligente)
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

import os from 'os';
import path from 'path';

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
            let result = await chat.sendMessage(messageText);
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

                    result = await chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]);
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
