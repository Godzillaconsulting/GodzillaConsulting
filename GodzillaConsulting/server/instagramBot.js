import { IgApiClient } from 'instagram-private-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import pool, { connectDB } from './config/db.js';
import { agendarEnGoogleCalendar } from './services/calendarService.js';

dotenv.config();

// Inicializamos la API de Instagram Privada
const ig = new IgApiClient();

// Helper: Generador de delays aleatorios (Typing Simulation / Anti-Ban)
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

// Prompt Base
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

## REGLAS DE CONVERSACIÓN (¡CRÍTICO!)
1. **Identidad Ultra Humana**: NUNCA digas "Como IA", "Soy una inteligencia artificial". Habla como experto humano, relajado pero directo.
2. **Micro-Mensajes**: Tus respuestas deben ser EXTREMADAMENTE cortas. Máximo 1 a 2 renglones físicos. Ve al grano inmediatamente sin saludos formales.
3. **Paso a paso**: Haz **SOLO UNA PREGUNTA** por mensaje al final de tu texto.
4. **Precios Prohibidos**: TIENES ESTRICTAMENTE PROHIBIDO dar precios. Dirígelos a https://godzillaconsulting.ai
5. **Citas (PROTOCOLO)**: Si el cliente tiene intención real, ofrécele agendar una llamada. Obtén: Nombre, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM).
6. **MUY IMPORTANTE**: En Instagram NO pedimos el correo electrónico en la herramienta, solo el Nombre y Teléfono.

## HERRAMIENTA OBLIGATORIA
Si ya tienes la fecha, hora, nombre y teléfono, utiliza SIEMPRE la herramienta 'validar_y_guardar_cita_ig' antes de decirle al cliente que ya está agendado.
Si fue exitosa, confírmale. Si el slot está ocupado, dile amablemente que sugiera otro horario.
`;

const chatTools = [
    {
        name: "validar_y_guardar_cita_ig",
        description: "Valida disponibilidad de un horario y si está libre, agenda la cita en la base de datos de Instagram y Google Calendar.",
        parameters: {
            type: "OBJECT",
            properties: {
                nombre: { type: "STRING" },
                telefono: { type: "STRING" },
                servicio: { type: "STRING" },
                fecha: { type: "STRING", description: "YYYY-MM-DD" },
                hora: { type: "STRING", description: "HH:MM (24h)" },
                resumen_para_bd: { type: "STRING", description: "Un breve resumen de la plática o dolor del cliente (1 párrafo max)." }
            },
            required: ["nombre", "telefono", "servicio", "fecha", "hora"]
        }
    }
];

// Estado en Memoria de Sesiones 
const userSessions = new Map();
// Caché de mensajes procesados para no responder doble a mensajes ya leídos
const processedMessageIds = new Set();
// Bloqueo de concurrencia: Evitar que el loop corra dos veces a la vez
let isLoopRunning = false;

async function checkAvailability(fecha, hora) {
    // Guardián de Horario y Días
    const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
    const isSunday = dateObj.getDay() === 0;
    const hourInt = parseInt(hora.split(':')[0], 10);
    
    if (isSunday || hourInt < 9 || hourInt >= 19) {
        return { isAvailable: false, error: "Fuera de horario o en domingo." };
    }
    
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
    const isBusy = parseInt(r.rows[0].total) > 0;
    return { isAvailable: !isBusy, error: isBusy ? "Horario acupado." : null };
}

async function handleIgInbox() {
    if (isLoopRunning) return;
    isLoopRunning = true;

    try {
        const inboxFeed = ig.feed.directInbox();
        const threads = await inboxFeed.items();

        for (const thread of threads) {
            // Solo nos interesan los threads que tienen mensajes sin leer O que acaban de llegar
            // y cuyo último mensaje NO fue nuestro.
            const lastItem = thread.last_permanent_item;
            if (!lastItem) continue;
            
            // lastItem.user_id indica quién mandó el último mensaje
            // Si fuimos nosotros, lo ignoramos.
            if (lastItem.user_id === ig.state.cookieUserId) continue;

            // Ver si ya procesamos este mensaje_id específico
            if (processedMessageIds.has(lastItem.item_id)) continue;
            
            // Añadir al caché para no procesarlo 2 veces
            processedMessageIds.add(lastItem.item_id);
            if(processedMessageIds.size > 1000) processedMessageIds.delete(processedMessageIds.keys().next().value); // Rotación

            // Es un mensaje de usuario a procesar.
            // Ignorar audios u otras cosas raras (solo tomamos texto)
            if (lastItem.item_type !== 'text') {
                console.log(`[IG Bot] Ignorando mensaje no-texto de ${thread.users[0]?.username}`);
                continue;
            }

            const messageText = lastItem.text;
            const senderUserId = lastItem.user_id;
            const igUsername = thread.users.find(u => u.pk === senderUserId)?.username || "usuario_ig";

            const maskedUserName = igUsername.substring(0, 3) + "***" + igUsername.substring(igUsername.length - 2);
            console.log(`📬 [IG Bot] Mensaje recibido de @${maskedUserName}: [MENSAJE OCULTO POR SEGURIDAD PII]`);
            
            // Recuperar o crear sesión
            if (!userSessions.has(senderUserId)) {
                userSessions.set(senderUserId, []);
            }
            const history = userSessions.get(senderUserId);
            
            // Limitar memoria a últimos 15 msgs para clúster local
            if (history.length > 15) history.shift();
            history.push({ role: "user", parts: [{ text: messageText }] });

            // Gemini Procesamiento
            const apiKey = (process.env.GEMINI_API_KEY || "").trim();
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: chatTools }]
            });

            // Evitar doble-user en historial para Gemini (compactar)
            let safeHistory = [];
            let rawForGemini = history.slice(0, -1);
            for (const m of rawForGemini) {
                if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === m.role) {
                    safeHistory[safeHistory.length - 1].parts[0].text += `\n[Mensaje]: ${m.parts[0].text}`;
                } else {
                    safeHistory.push(m);
                }
            }

            const chat = model.startChat({ history: safeHistory });
            let result = await chat.sendMessage(messageText);
            let botReply = result.response.text();

            // Evaluar Tool Calls
            const functionCalls = result.response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    if (call.name === 'validar_y_guardar_cita_ig') {
                        const { nombre, telefono, servicio, fecha, hora, resumen_para_bd } = call.args;
                        
                        const availabilityCheck = await checkAvailability(fecha, hora);
                        
                        let fRes = {};
                        if (!availabilityCheck.isAvailable) {
                            console.warn(`⚠️ [IG Bot] Rechazo de disponibilidad: ${fecha} ${hora}`);
                            fRes = { success: false, error: "Ese horario ya está ocupado o fuera de servicio. Pide otra hora al cliente." };
                        } else {
                            try {
                                // 1. Google Calendar
                                const gcId = await agendarEnGoogleCalendar({
                                    nombre, 
                                    correo: `cliente_ig_${igUsername}@godzilla.tmp`, // Proxy Dummie Email
                                    telefono, 
                                    servicio, 
                                    fecha, 
                                    hora, 
                                    notas: `Lead IG: @${igUsername}\nResumen: ${resumen_para_bd||''}` 
                                });

                                // 2. Guardar en Base de Datos IG Independiente
                                await pool.query(
                                    `INSERT INTO citas_instagram (username_ig, nombre, telefono, fecha_cita, resumen_gemini)
                                     VALUES ($1, $2, $3, $4, $5)`,
                                    [igUsername, nombre, telefono, `${fecha} ${hora}`, resumen_para_bd || '']
                                );

                                fRes = { success: true, validado: true };
                                
                                console.log(`✅ [IG Bot] Cita concretada para @${igUsername} el ${fecha} a las ${hora}`);

                            } catch (e) {
                                console.error("❌ [IG Bot] Fallo técnico al procesar el guardado de la cita:", e);
                                fRes = { success: false, error: "Fallo de conexión interno al guardar. Pide al cliente que confirme en 5 minutos." };
                            }
                        }

                        // Completar el call
                        result = await chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]);
                        botReply = result.response.text();
                    }
                }
            }

            history.push({ role: "model", parts: [{ text: botReply }] });

            // =========== ANTI-BAN (TYPING SIMULATION) =========== 
            // 1. Marcar como leído
            await ig.entity.directThread(thread.thread_id).markItemSeen(lastItem.item_id);
            
            // 2. Esperar (Retraso aleatorio humano entre 2 y 5 segundos)
            console.log(`⏳ [IG Bot] Simulando delay humano para @${igUsername}...`);
            await delay(2500, 5000);
            
            // 3. (El paquete de la api privada no exporta broadcastTyping de forma nativa sencilla
            // para enviar texto a un hilo, basta con usar broadcastText con pausas).
            await ig.entity.directThread(thread.thread_id).broadcastText(botReply);
            console.log(`🤖 [IG Bot] Respondido a @${maskedUserName} exitosamente.`);
        }

    } catch (e) {
        console.error("❌ [IG Bot] Error crítico procesando inbox:", e);
    } finally {
        isLoopRunning = false;
    }
}

import fs from 'fs';
import os from 'os';
import path from 'path';

// Inicialización Principal (Log In e Insta Loop)
export async function startIgBot() {
    try {
        await connectDB();
        
        const username = process.env.IG_USERNAME;
        const password = process.env.IG_PASSWORD;
        
        if (!username || !password) {
            console.error("❌ [IG Bot] Faltan variables de entorno IG_USERNAME o IG_PASSWORD. Deteniendo servicio.");
            process.exit(1);
        }

        console.log(`🚀 [IG Bot] Iniciando sesión en cuenta @${username} (API Privada)...`);
        
        const sessionDir = path.join(os.homedir(), '.godzilla-sessions', 'instagram');
        const sessionPath = path.join(sessionDir, `${username}.json`);
        
        // Rutina de Seguridad: Bloquear lectura externa (chmod 700)
        try {
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
            } else {
                fs.chmodSync(sessionDir, 0o700);
            }
            console.log(`🔒 [Seguridad] Permisos 700 aplicados a la sesión de Instagram.`);
        } catch (e) {
            console.warn(`⚠️ [Seguridad] No se pudieron aplicar permisos 700 a la sesión: ${e.message}`);
        }

        ig.state.generateDevice(username);
        
        let shouldLogin = true;
        if (fs.existsSync(sessionPath)) {
            try {
                const savedState = await fs.promises.readFile(sessionPath, 'utf8');
                await ig.state.deserialize(savedState);
                shouldLogin = false;
                console.log(`[IG Bot] Sesión persistente restaurada desde ${sessionPath}`);
            } catch (e) {
                console.error("[IG Bot] Error restaurando sesión, forzando re-login:", e.message);
            }
        }
        
        if (shouldLogin) {
            // Simulamos app realista
            await ig.simulate.preLoginFlow();
            await ig.account.login(username, password);
            process.nextTick(async () => await ig.simulate.postLoginFlow());
            
            // Guardar Estado
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            const stateInfo = await ig.state.serialize();
            delete stateInfo.constants; // Recomendado por la lib
            await fs.promises.writeFile(sessionPath, JSON.stringify(stateInfo));
            
            console.log(`[IG Bot] Sesión nueva guardada en la caché persistente.`);
        }
        
        console.log(`✅ [IG Bot] Login exitoso. Bot activo y escuchando la bandeja Inbox...`);

        // Polling constante y amigable (1 vez cada 12 segundos)
        setInterval(handleIgInbox, 12000);

    } catch (error) {
        console.error("❌ [IG Bot] Error de Arranque:", error);
        process.exit(1);
    }
}
