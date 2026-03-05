import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";

// Initialize Gemini Pro model
const genAI = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY ?
    new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : null;

const SYSTEM_PROMPT = `
# PROMPT 1 — BOT IA PARA PÁGINA WEB (ESPECIALISTA EN PERFORMANCE MARKETING IA)
# Cliente: Godzilla Consulting (https://godzillaconsulting.ai)

## ROL Y IDENTIDAD
Actúa como un Senior Performance Marketer especializado en IA Predictiva y Generativa aplicada a embudos de ventas. 
Tu rol oficial es Goyi, el Especialista en Performance Marketing de Godzilla Consulting.
Tu único objetivo es analizar, estructurar y optimizar el rendimiento de las etapas TOFU, MOFU y BOFU (que aquí denominaremos LOFU por el enfoque en Loyalty/Low Funnel).
Además, tienes la función de evaluar si prospectos y clientes requieren una consultoría a profundidad y agendar citas para el equipo.

## RESTRICCIÓN DE DOMINIO ESTRICTA Y SÍNTESIS
- SINTETIZA TUS RESPUESTAS EXTREMADAMENTE. Sé directo, al grano y nunca te extiendas en explicaciones largas o párrafos innecesarios.
- No eres un asistente de información general.
- Si se te solicita información fuera del marketing, publicidad digital o tecnología de IA en ventas, deberás declinar la respuesta de forma MUY CORTA (ej: "Mi arquitectura está limitada a Performance Marketing. ¿Puedo ayudarte a optimizar métricas como el CPA o ROAS?").
- Tu lenguaje debe ser técnico: enfocado en métricas (CTR, CPA, ROAS, LTV), algoritmos de puja, segmentación por clusters y personalización sintética de contenidos.

## CONOCIMIENTO DE ESTADO DEL ARTE (TOFU, MOFU, LOFU)
- **TOFU (Top of the Funnel):** Sabes que la IA mejora el alcance mediante audiencias lookalike de nueva generación y la creación masiva de creatividades dinámicas (DCO) para captar atención y bajar el CPA.
- **MOFU (Middle of the Funnel):** Utilizas Lead Scoring predictivo y Chatbots de nutrición (Nurturing) para filtrar la intención de compra (MQL a SQL).
- **LOFU (Low/Loyalty Funnel):** Optimizas algoritmos de conversión de "último clic" y modelos de atribución basados en IA para maximizar el LTV (Lifetime Value).

## IDIOMA
Detecta automáticamente el idioma en que escribe el usuario y responde siempre en ese mismo idioma.

## BASE DE CONOCIMIENTO (Godzilla Consulting)
Toda consulta inicial en Godzilla Consulting es confidencial y sin costo.
Los tiempos de entrega se definen en propuesta formal tras la primera reunión.
Para cancelar o reprogramar una cita, se requiere aviso con al menos 24 horas de anticipación.

### SERVICIOS:
- **Automatización de Bots:** Atención 24/7 con bots entrenados, calificación de prospectos e integración con WhatsApp/CRM.
- **Producción Audiovisual:** Contenido estratégico para generar confianza y autoridad.
- **Embudos de Venta:** Estructuras digitales para conversión de tráfico en citas.
- **Gestión de Redes Sociales:** Estrategia de contenido enfocada en posicionamiento.
- **Optimización Web y SEO:** Mejora de visibilidad y experiencia de usuario.
- **CRM con SaaS Personalizado:** Centralización de contactos y automatización comercial.

### PAQUETES Y PRECIOS (MXN):
- **Posicionamiento Social ($7,900/mes):** Estrategia omnicanal, copy, community management. Garantía: 14 días o siguiente mes GRATIS.
- **Control IA ($7,900/mes):** Agente IA (Web + WhatsApp), respuesta < 5s, captura automática. Garantía: 7 días o siguiente mes GRATIS.
- **Expansión ($29,900/mes):** Todo lo anterior + Ads (Meta/Google) + Landing Page. Garantía: 30 días o devolución completa.
- **Élite ($39,500/mes):** Estrategia Godfather, reactivación de DB, consultoría mensual. Garantía: +20% en citas en 90 días o trabajamos GRATIS.

## FLUJO DE RESPUESTA Y ESCALAMIENTO A ASESOR HUMANO (AGENDAMIENTO)
Si el usuario requiere asistencia técnica directa, una auditoría, o implementar las estrategias, dirígelo al agendamiento.
Cuando el usuario mencione querer agendar, reservar o programar una cita, activa el flujo de agendamiento.
Datos a recolectar: Nombre completo, Correo electrónico, Teléfono (opcional), Servicio o motivo, Fecha deseada (DD/MM/YYYY), Hora deseada.

### Reglas de validación y Agendamiento (OBLIGATORIAS)
✅ DÍAS VÁLIDOS: Lunes a viernes.
✅ HORARIO VÁLIDO: 9:00 AM a 5:00 PM.
✅ SIN EMPALMES: Usar "check_availability" antes de confirmar.
✅ FERIADOS (NO agendar): 1 ene, 19 jun, 4 jul, 11 nov, 25 dic.

### Herramientas
Tienes herramientas disponibles: \`check_availability(fecha, hora)\` y \`save_appointment(nombre, correo, telefono, servicio, fecha, hora)\`. 
DEBES USARLAS PARA CONFIRMAR Y GUARDAR LAS CITAS.
`

const chatTools = [
    {
        name: "check_availability",
        description: "Consulta la base de datos SQL para ver si una fecha y hora están disponibles para una cita. Retorna un objeto con si está disponible y los slots sugeridos.",
        parameters: {
            type: "OBJECT",
            properties: {
                fecha: {
                    type: "STRING",
                    description: "Fecha deseada de la cita con formato YYYY-MM-DD"
                },
                hora: {
                    type: "STRING",
                    description: "Hora deseada de la cita con formato HH:MM en 24h (ej: 14:00, 09:30)"
                }
            },
            required: ["fecha", "hora"]
        }
    },
    {
        name: "save_appointment",
        description: "Inserta una cita confirmada en la tabla citas de la base de datos SQL y retorna la confirmación.",
        parameters: {
            type: "OBJECT",
            properties: {
                nombre: {
                    type: "STRING",
                    description: "Nombre completo del usuario"
                },
                correo: {
                    type: "STRING",
                    description: "Correo electrónico del usuario"
                },
                telefono: {
                    type: "STRING",
                    description: "Número de teléfono del usuario (opcional)"
                },
                servicio: {
                    type: "STRING",
                    description: "Servicio de interés o motivo de la cita"
                },
                fecha: {
                    type: "STRING",
                    description: "Fecha de la cita con formato YYYY-MM-DD"
                },
                hora: {
                    type: "STRING",
                    description: "Hora de la cita con formato HH:MM en 24h"
                }
            },
            required: ["nombre", "correo", "servicio", "fecha", "hora"]
        }
    }
];

export const processChatMessage = async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
    }

    if (!genAI) {
        return res.status(500).json({ error: "GEMINI_API_KEY no configurada en el servidor." });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-pro",
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: chatTools }]
        });

        let history = messages.slice(0, -1).map(m => ({
            role: m.role || "user",
            parts: [{ text: m.content || m.text }]
        }));

        // Google Gemini requiere estrictamente que el primer mensaje en el historial sea del 'user'
        while (history.length > 0 && history[0].role !== "user") {
            history.shift();
        }

        const chat = model.startChat({ history });

        const lastMessage = messages[messages.length - 1].content || messages[messages.length - 1].text;

        // We send message and potentially handle function calls
        let result = await chat.sendMessage(lastMessage);
        let responseText = result.response.text();

        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                let functionResponse = {};

                if (call.name === "check_availability") {
                    const { fecha, hora } = call.args;
                    try {
                        const query = `
                            SELECT COUNT(*) FROM citas
                            WHERE fecha = $1 AND hora = $2 AND status != 'cancelada';
                        `;
                        const dbRes = await pool.query(query, [fecha, hora]);
                        const isBooked = parseInt(dbRes.rows[0].count) > 0;

                        functionResponse = { disponible: !isBooked };
                    } catch (error) {
                        console.error(error);
                        functionResponse = { error: "Failed to check availability" };
                    }
                } else if (call.name === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora } = call.args;

                    try {
                        const query = `
                            INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, status)
                            VALUES ($1, $2, $3, $4, $5, $6, 'confirmada')
                            RETURNING id;
                        `;
                        const dbRes = await pool.query(query, [nombre, correo, telefono || "", servicio, fecha, hora]);

                        functionResponse = { success: true, id_cita: dbRes.rows[0].id };
                    } catch (error) {
                        console.error(error);
                        functionResponse = { success: false, error: "Failed to save appointment in database" };
                    }
                }

                result = await chat.sendMessage([{
                    functionResponse: {
                        name: call.name,
                        response: functionResponse
                    }
                }]);
                responseText = result.response.text();
            }
        }

        return res.status(200).json({ reply: responseText });
    } catch (error) {
        console.error("Error in chat controller:", error);
        return res.status(500).json({ error: "Failed to process chat response", details: error.message });
    }
};
