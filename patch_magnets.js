import pool from './server/config/db.js';

const magnets = [
    {
        name: 'Boveda de Scripts',
        slug: 'recurso1',
        subject: '📂 Acceso a tu Bóveda de Scripts de IA',
        body: 'Hola,\n\nAquí tienes acceso a los 7 pasos estructurales que te permitirán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos.\n\nDentro del documento encontrarás pautas fundamentales, tales como las reglas de oro para preservar la naturalidad en la comunicación generada por IA y la técnica de "Doble Opción" para incrementar considerablemente tus tasas de agendamiento.\n\nDelegar tareas repetitivas a un sistema inteligente es el paso fundamental para la verdadera escalabilidad. Si requieres que implementemos tu infraestructura técnica y tu clon digital en 48 horas, no dudes en responder a este correo.\n\nAtentamente,\nEl equipo de Godzilla Consulting',
        url: 'https://godzillaconsulting.ai/scripts.pdf'
    },
    {
        name: 'El Protocolo Lazaro',
        slug: 'recurso2',
        subject: '📂 Tu descarga: El Protocolo Lázaro',
        body: 'Hola,\n\nTu recurso está listo. A continuación, puedes acceder a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días.\n\nComo paso inicial, te sugerimos implementar de inmediato el **Guion #4** con una lista de 20 contactos enfriados recientemente. Estos mensajes aplican una psicología de riesgo nulo que facilita retomar conversaciones de manera natural y sin fricciones.\n\nLa ejecución manual de este protocolo puede consumir tiempo valioso. Si buscas escalar tus resultados, podemos integrar un agente de Inteligencia Artificial que aplique esta estrategia de forma automatizada las 24 horas del día.\n\nMucho éxito en la recuperación de tu base de contactos.\n\nAtentamente,\nEl equipo de Godzilla Consulting',
        url: 'https://godzillaconsulting.ai/lazaro.pdf'
    },
    {
        name: 'Tablero de Control',
        slug: 'recurso3',
        subject: '📂 Acceso inmediato: Tu Tablero de Control de Ventas',
        body: 'Hola,\n\nGracias por solicitar el Tablero de Control de Ventas. Este documento ha sido estructurado para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Sugerimos prestar especial atención a la pestaña *Semáforo de Leads* para gestionar contactos de manera oportuna.\n\nTen en cuenta que este tablero te proporciona el diagnóstico y el mapa. Si requieres infraestructura tecnológica para automatizar el seguimiento y el cierre, en Godzilla Consulting nos especializamos en instalar motores de IA para acelerar tus procesos.\n\nQuedamos a tu disposición para cualquier consulta.\n\nAtentamente,\nEl equipo de Godzilla Consulting',
        url: 'https://godzillaconsulting.ai/tablero.pdf'
    }
];

async function patchMagnets() {
    try {
        for (const magnet of magnets) {
            await pool.query(
                `INSERT INTO lead_magnets (slug, name, email_subject, email_body, file_url) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (slug) DO UPDATE 
                 SET name = EXCLUDED.name,
                     email_subject = EXCLUDED.email_subject,
                     email_body = EXCLUDED.email_body,
                     file_url = EXCLUDED.file_url`,
                [magnet.slug, magnet.name, magnet.subject, magnet.body, magnet.url]
            );
        }
        console.log('Lead magnets inyectados correctamente');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
patchMagnets();
