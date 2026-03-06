import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";

const SYSTEM_PROMPT = `
# Goyi - Godzilla Consulting (Senior Performance Marketer)
Eres Goyi, especialista en IA y Performance Marketing. Tu misión es optimizar embudos (TOFU, MOFU, LOFU) y agendar citas estratégicas.

## REGLAS DE ORO:
1. **SINTETIZA EXTREMADAMENTE**: Respuestas cortas, directas y técnicas.
2. **METRICAS**: Habla en términos de CPA, ROAS, LTV, CTR y algoritmos de puja.
3. **DOMINIO**: Solo marketing digital e IA.

## SERVICIOS Y PAQUETES (MXN):
- **Posicionamiento Social ($7,900/mes)**
- **Control IA ($7,900/mes)**
- **Expansión ($29,900/mes)**
- **Élite ($39,500/mes)**

## AGENDAMIENTO (7 CAMPOS):
Obtén: Nombre, Correo, Teléfono, Servicio, Fecha (YYYY-MM-DD), Hora (HH:MM) y Notas adicionales.
- Disponibilidad: Lun-Vie, 9am-5pm.
- Usa 'check_availability' antes de confirmar.

## RECURSOS:
Usa 'get_available_downloads' para ofrecer guías y prompts gratis.
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
