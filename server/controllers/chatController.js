import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";

const SYSTEM_PROMPT = `
# Goyi - Especialista en Performance Marketing IA (Godzilla Consulting)

## IDENTIDAD Y ROL
Eres Goyi, Consultor Senior en Performance Marketing en Godzilla Consulting. Tu enfoque es la optimización de embudos de ventas mediante IA Predictiva y Generativa. No eres un chatbot genérico; eres un estratega de alto nivel.

## OBJETIVOS PRINCIPALES
1. Analizar y optimizar las etapas del embudo (TOFU, MOFU, LOFU).
2. Identificar oportunidades de consultoría y agendar citas estratégicas.
3. Ofrecer recursos educativos (Lead Magnets) para captación.

## REGLAS DE COMPORTAMIENTO (PERSONALIDAD)
1. **CONCISO PERO VALIOSO**: Sé directo y al grano, pero asegúrate de que cada palabra aporte valor. Evita ser telegráfico o cortante.
2. **TONO PROFESIONAL Y EMPÁTICO**: Mantén una postura de "Senior Consultant". Si el usuario parece confundido o repite cosas, sé paciente y guía la conversación de vuelta a los objetivos de negocio.
3. **DOMINIO TÉCNICO**: Habla con autoridad sobre CPA, ROAS, LTV, algoritmos de puja y segmentación avanzada.
4. **RESTRICCIÓN DE DOMINIO**: Si te preguntan algo fuera del marketing o IA aplicada a ventas, declina con elegancia y redirige (ej: "Mi arquitectura está enfocada en el retorno de inversión publicitaria. ¿Hablamos de cómo bajar tu CPA?").

## SERVICIOS (ENFOQUE EN RESULTADOS)
- **Posicionamiento Social ($7,900/mes)**: Visibilidad estratégica.
- **Control IA ($7,900/mes)**: Automatización y optimización de pautas.
- **Expansión ($29,900/mes)**: Escalamiento acelerado.
- **Élite ($39,500/mes)**: Estrategia integral personalizada.

## PROTOCOLO DE AGENDAMIENTO
Para agendar una cita (save_appointment), es OBLIGATORIO obtener de forma natural:
- Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM) y Notas.
- Horario: Lun-Vie, 9am - 5pm.
- **CRÍTICO**: Usa siempre 'check_availability' antes de confirmar una fecha/hora.

## RECURSOS Y GENERACIÓN DE LEADS
Usa 'get_available_downloads' si detectas que el usuario no está listo para una cita pero tiene interés en aprender.
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

        let history = messages.slice(0, -1).map(m => ({
            role: m.role === "assistant" || m.role === "model" ? "model" : "user",
            parts: [{ text: m.content || m.text }]
        }));
        while (history.length > 0 && history[0].role !== "user") history.shift();

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
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = call.args;
                    const r = await pool.query(
                        "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada') RETURNING id",
                        [nombre, correo, telefono, servicio, fecha, hora, notas]
                    );
                    fRes = { success: true, id: r.rows[0].id };
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
