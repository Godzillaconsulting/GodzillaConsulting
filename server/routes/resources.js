import express from 'express';
import pool from '../config/db.js';
import { sendLeadMagnetEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/send', async (req, res) => {
    const { email, recursoId } = req.body;
    
    if (!email || !recursoId) {
        return res.status(400).json({ error: 'Faltan datos requeridos (email, recursoId)' });
    }

    try {
        const result = await pool.query("SELECT * FROM site_nodes WHERE id = 'recursos'");
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración de recursos no encontrada en Local' });
        }
        
        const nodeData = result.rows[0];
        const publishedData = nodeData.published_data || {};
        
        // Mapeo de recursoId al índice en la Base de Datos (Admin Panel)
        const recursoMap = {
            'boveda-scripts': 1,
            'prompts': 2,
            'crm': 3
        };
        
        let idx = recursoMap[recursoId];
        
        if (!idx) {
            return res.status(400).json({ error: 'Recurso ID desconocido o no configurado' });
        }

        const subjectKey = `recurso${idx}EmailSubject`;
        const bodyKey = `recurso${idx}EmailBody`;
        const urlKey = `recurso${idx}FileUrl`;
        
        let subject = publishedData[subjectKey];
        let body = publishedData[bodyKey];
        let fileUrl = publishedData[urlKey];

        // Reparación de URL relativa: Los correos obligatoriamente necesitan rutas absolutas (https://...)
        // Si el admin pegó una ruta que empieza con '/' (como /api/media/... ), la transformamos
        if (fileUrl && fileUrl.startsWith('/')) {
            const baseUrl = `https://godzillaconsulting.ai`;
            fileUrl = `${baseUrl}${fileUrl}`;
        }


        // Fallbacks si no han publicado en Admin Studio
        if (!subject || !body || !fileUrl) {
            if (idx === 1) {
                subject = "📂 Acceso a tu Bóveda de Scripts de IA";
                body = "Hola,\n\nAquí tienes acceso a los 7 pasos estructurales que te permitán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos.\n\nDentro del documento encontrarás pautas fundamentales, tales como las reglas de oro para preservar la naturalidad en la comunicación generada por IA y la técnica de \"Doble Opción\" para incrementar considerablemente tus tasas de agendamiento.\n\nDelegar tareas repetitivas a un sistema inteligente es el paso fundamental para la verdadera escalabilidad. Si requieres que implementemos tu infraestructura técnica y tu clon digital en 48 horas, no dudes en responder a este correo.\n\nAtentamente,\nEl equipo de Godzilla Consulting";
                fileUrl = "https://godzillaconsulting.ai/scripts.pdf";
            } else if (idx === 2) {
                subject = "📂 Tu descarga: El Protocolo Lázaro";
                body = "Hola,\n\nTu recurso está listo. A continuación, puedes acceder a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días.\n\nComo paso inicial, te sugerimos implementar de inmediato el **Guion #4** con una lista de 20 contactos enfriados recientemente. Estos mensajes aplican una psicología de riesgo nulo que facilita retomar conversaciones de manera natural y sin fricciones.\n\nLa ejecución manual de este protocolo puede consumir tiempo valioso. Si buscas escalar tus resultados, podemos integrar un agente de Inteligencia Artificial que aplique esta estrategia de forma automatizada las 24 horas del día.\n\nMucho éxito en la recuperación de tu base de contactos.\n\nAtentamente,\nEl equipo de Godzilla Consulting";
                fileUrl = "https://godzillaconsulting.ai/lazaro.pdf";
            } else if (idx === 3) {
                subject = "📂 Acceso inmediato: Tu Tablero de Control de Ventas";
                body = "Hola,\n\nGracias por solicitar el Tablero de Control de Ventas. Accede inmediatamente al recurso en el siguiente enlace:\n\nEste documento ha sido estructurado para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Sugerimos prestar especial atención a la pestaña *Semáforo de Leads* para gestionar contactos de manera oportuna.\n\nTen en cuenta que este tablero te proporciona el diagnóstico y el mapa. Si requieres infraestructura tecnológica para automatizar el seguimiento y el cierre, en Godzilla Consulting nos especializamos en instalar motores de IA para acelerar tus procesos.\n\nQuedamos a tu disposición para cualquier consulta.\n\nAtentamente,\nEl equipo de Godzilla Consulting";
                fileUrl = "https://godzillaconsulting.ai/tablero.pdf";
            }
        }
        
        console.log(`[Resources] Enviando recurso ${idx} a ${email}`);

        // Enviar correo a través de nuestro emailService, que usa PM2 y logs
        const sent = await sendLeadMagnetEmail({ 
            to: email, 
            subject, 
            body, 
            fileUrl 
        });

        if (sent) {
            console.log(`[Resources] Correo enviado exitosamente a ${email}`);
            return res.status(200).json({ success: true, message: 'Recurso enviado a tu correo' });
        } else {
            console.error(`[Resources] Falló el envío de correo a ${email}`);
            return res.status(500).json({ error: 'Fallo al enviar correo. Por favor intenta de nuevo.' });
        }
    } catch (error) {
        console.error('❌ Error en el endpoint /api/resources/send:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar tu solicitud' });
    }
});

export default router;
