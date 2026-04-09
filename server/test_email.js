import dotenv from 'dotenv';
import { sendLeadMagnetEmail } from './services/emailService.js';
dotenv.config();

(async () => {
    console.log("Probando conexión SMTP Brevo...");
    try {
        const success = await sendLeadMagnetEmail({
            to: 'info@godzillaconsulting.ai',
            subject: 'Fallback',
            body: 'Fallback',
            fileUrl: 'https://ejemplo.com/recurso_final',
            slug: 'crm-ventas'
        });
        console.log("Resultado del envío:", success);
    } catch(err) {
        console.error("Error capturado:", err.message);
    }
})();
