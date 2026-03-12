import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";
import { agendarEnGoogleCalendar } from "../services/calendarService.js";

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
7. **Memoria**: NO repitas información. Si el usuario ya mencionó su producto/leads, úsalo pero no lo repitas.
8. **Citas**: Si el cliente tiene intención real, guíalo suavemente a agendar usando el protocolo.

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
**MUY IMPORTANTE**: Inmediatamente después de agendar exitosamente usando la herramienta, envía un mensaje final de confirmación profesional que resuma los datos de la cita (ej. "¡Perfecto, [Nombre]! Tu cita para [Servicio] ha quedado agendada para el [Fecha] a las [Hora]. Te enviaremos un correo de confirmación pronto.").
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
                fecha: { type: "STRING", description: "YYYY-MM-DD" },
                hora: { type: "STRING", description: "HH:MM (24h)" },
                notas: { type: "STRING", description: "Notas adicionales" }
            },
            required: ["nombre", "correo", "telefono", "servicio", "fecha", "hora", "notas"]
        }
    },
    {
        name: "get_available_downloads",
        description: "Obtiene recursos descargables.",
        parameters: { type: "OBJECT", properties: {} }
    }
];

export const processChatMessage = async (req, res) => {
    const { messages } = req.body;
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: chatTools }]
        });

        let rawHistory = messages.slice(0, -1).map(m => ({
            role: m.role === "assistant" || m.role === "model" ? "model" : "user",
            parts: [{ text: m.content || m.text }]
        }));

        let history = [];
        for (const msg of rawHistory) {
            if (history.length > 0 && history[history.length - 1].role === msg.role) {
                history[history.length - 1].parts[0].text += `\n[Mensaje adicional]: ${msg.parts[0].text}`;
            } else {
                history.push(msg);
            }
        }

        while (history.length > 0 && history[0].role !== "user") history.shift();

        if (history.length > 0 && history[history.length - 1].role === "user") {
            history.push({ role: "model", parts: [{ text: "(Esperando respuesta...)" }] });
        }

        const chat = model.startChat({ history });
        const lastMsg = messages[messages.length - 1].content || messages[messages.length - 1].text;

        let result = await chat.sendMessage(lastMsg);
        let responseText = result.response.text();

        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                let fRes = {};
                if (call.name === "check_availability") {
                    const { fecha, hora } = call.args;
                    const r = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                    fRes = { disponible: parseInt(r.rows[0].count) === 0 };
                } else if (call.name === "save_appointment") {
                    try {
                        const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                        
                        // Candado Anti-Empalme Crítico (Double Booking Preventer)
                        const conflictCheck = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
                        if (parseInt(conflictCheck.rows[0].count) > 0) {
                             console.warn(`⚠️ [Web Cita Rechazada] Intento de agendar en horario ocupado: ${fecha} ${hora}`);
                             fRes = { success: false, error: "Ese horario acaba de ser ocupado. Por favor pídele al cliente que elija otra hora." };
                        } else {
                            const datosCita = { nombre, correo, telefono, servicio, fecha, hora, notas };
                            try {
                                await agendarEnGoogleCalendar(datosCita);
                                
                                // Si llegamos aquí, Google Calendar tuvo éxito. Guardar en DB.
                                const r = await pool.query(
                                    "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada') RETURNING id",
                                    [nombre, correo, telefono, servicio, fecha, hora, notas]
                                );
                                
                                fRes = { success: true, id: r.rows[0].id, alert: "Guardado en DB y Calendar." };
                            } catch (calErr) {
                                console.error("❌ Fallo Google Calendar Web (NO se guardó en DB):", calErr.message);
                                // Obligar a Gemini a notificar al usuario que intente otra vez
                                fRes = { success: false, error: "El sistema de agendas de Google rechazó el horario o los datos (" + calErr.message + "). Por favor indícale al cliente que intente nuevamente o elija otro horario." };
                            }
                        }
                    } catch (appErr) {
                        console.error("❌ Error al agendar cita en Web Chat:", appErr);
                        fRes = { success: false, error: "Hubo un pequeño problema técnico procesando la cita, pero ya estoy notificando al equipo de Godzilla Consulting. Por favor intenta de nuevo más tarde." };
                    }
                } else if (call.name === "get_available_downloads") {
                    const r = await pool.query("SELECT title, slug FROM lead_magnets");
                    fRes = { resources: r.rows };
                }
                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: fRes } }]);
                responseText = result.response.text();
            }
        }
        res.status(200).json({ reply: responseText });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Error", details: e.message });
    }
};
