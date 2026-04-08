import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT draft_data, published_data FROM site_nodes WHERE id = 'recursos'");
        if (res.rows.length === 0) {
            console.log("No recursos node found.");
            return;
        }

        let draft = res.rows[0].draft_data || {};
        let pub = res.rows[0].published_data || {};

        const defaultTemplates = {
            1: {
                subject: "📂 Acceso inmediato: Tu Tablero de Control de Ventas",
                body: "Hola,\n\nGracias por solicitar el Tablero de Control de Ventas. Accede inmediatamente al recurso en el siguiente enlace:\n\nEste documento ha sido estructurado para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Sugerimos prestar especial atención a la pestaña *Semáforo de Leads* para gestionar contactos de manera oportuna.\n\nTen en cuenta que este tablero te proporciona el diagnóstico y el mapa. Si requieres infraestructura tecnológica para automatizar el seguimiento y el cierre, en Godzilla Consulting nos especializamos en instalar motores de IA para acelerar tus procesos.\n\nQuedamos a tu disposición para cualquier consulta.\n\nAtentamente,\nEl equipo de Godzilla Consulting",
                url: "https://godzillaconsulting.ai/tablero.pdf"
            },
            2: {
                subject: "📂 Tu descarga: El Protocolo Lázaro",
                body: "Hola,\n\nTu recurso está listo. A continuación, puedes acceder a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días.\n\nComo paso inicial, te sugerimos implementar de inmediato el **Guion #4** con una lista de 20 contactos enfriados recientemente. Estos mensajes aplican una psicología de riesgo nulo que facilita retomar conversaciones de manera natural y sin fricciones.\n\nLa ejecución manual de este protocolo puede consumir tiempo valioso. Si buscas escalar tus resultados, podemos integrar un agente de Inteligencia Artificial que aplique esta estrategia de forma automatizada las 24 horas del día.\n\nMucho éxito en la recuperación de tu base de contactos.\n\nAtentamente,\nEl equipo de Godzilla Consulting",
                url: "https://godzillaconsulting.ai/lazaro.pdf"
            },
            3: {
                subject: "📂 Acceso a tu Bóveda de Scripts de IA",
                body: "Hola,\n\nAquí tienes acceso a los 7 pasos estructurales que te permitirán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos.\n\nDentro del documento encontrarás pautas fundamentales, tales como las reglas de oro para preservar la naturalidad en la comunicación generada por IA y la técnica de \"Doble Opción\" para incrementar considerablemente tus tasas de agendamiento.\n\nDelegar tareas repetitivas a un sistema inteligente es el paso fundamental para la verdadera escalabilidad. Si requieres que implementemos tu infraestructura técnica y tu clon digital en 48 horas, no dudes en responder a este correo.\n\nAtentamente,\nEl equipo de Godzilla Consulting",
                url: "https://godzillaconsulting.ai/scripts.pdf"
            }
        };

        let updated = false;

        for (let i = 1; i <= 3; i++) {
            if (!pub['recurso'+i+'Nombre'] && !draft['recurso'+i+'Nombre']) continue; // If it doesn't exist, skip
            
            if (!pub['recurso'+i+'EmailSubject']) { pub['recurso'+i+'EmailSubject'] = defaultTemplates[i].subject; updated = true; }
            if (!pub['recurso'+i+'EmailBody']) { pub['recurso'+i+'EmailBody'] = defaultTemplates[i].body; updated = true; }
            if (!pub['recurso'+i+'FileUrl']) { pub['recurso'+i+'FileUrl'] = defaultTemplates[i].url; updated = true; }

            if (!draft['recurso'+i+'EmailSubject']) draft['recurso'+i+'EmailSubject'] = defaultTemplates[i].subject;
            if (!draft['recurso'+i+'EmailBody']) draft['recurso'+i+'EmailBody'] = defaultTemplates[i].body;
            if (!draft['recurso'+i+'FileUrl']) draft['recurso'+i+'FileUrl'] = defaultTemplates[i].url;
        }

        if (updated) {
            await client.query("UPDATE site_nodes SET draft_data = $1, published_data = $2 WHERE id = 'recursos'", [JSON.stringify(draft), JSON.stringify(pub)]);
            console.log("✅ Live database patched with default email templates! Downloads are working again.");
        } else {
            console.log("Data already populated. No action needed.");
        }

    } catch(e) {
        console.error("Error migrating db:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
