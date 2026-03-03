import User from '../models/User.js';
import LeadMagnet from '../models/LeadMagnet.js';
import Download from '../models/Download.js';
import { sendLeadMagnetEmail } from '../services/emailService.js';

export const processLead = async (req, res) => {
    try {
        // 1. Descomponer y Sanitizar datos
        const email = req.body.email.trim().toLowerCase();
        const slug = req.body.lead_magnet_slug;
        const ip = req.ip || req.connection.remoteAddress;

        // 2. Encontrar al Usuario (o crearlo si no existe)
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, ip_address: ip });
        }

        // 3. Buscar el Lead Magnet solicitado en MongoDB
        const magnet = await LeadMagnet.findOne({ slug });

        if (!magnet) {
            throw new Error('No se encontró el Recurso solicitado o está deshabilitado.');
        }

        // 4. Revisar si el usuario ya bajó este recurso particular
        const existingDownload = await Download.findOne({
            user_id: user._id,
            lead_magnet_id: magnet._id
        });

        if (existingDownload) {
            // Ya lo enviamos anteriormente. Devolvemos respuesta idempotente.
            return res.status(200).json({
                success: true,
                message: 'already_sent'
            });
        }

        // 5. Registrar la descarga en MongoDB (Crear la descarga con sent: false)
        const newDownload = await Download.create({
            user_id: user._id,
            lead_magnet_id: magnet._id,
            sent: false
        });

        // 6. ENVIAR CORREO usando la API de Resend
        const emailSuccess = await sendLeadMagnetEmail({
            to: email,
            subject: magnet.email_subject,
            body: magnet.email_body,
            fileUrl: magnet.file_url
        });

        if (emailSuccess) {
            // 7. Si fue exitoso, marcamos como enviado
            newDownload.sent = true;
            await newDownload.save();
        }

        // 8. Contestamos afirmativamente al frontend
        return res.status(200).json({
            success: true,
            message: 'email_sent'
        });

    } catch (error) {
        console.error("❌ Controlador CRÍTICO Error (MongoDB):", error);
        return res.status(500).json({
            success: false,
            message: 'Ha ocurrido un problema procesando la solicitud. Intenta más tarde.'
        });
    }
};
