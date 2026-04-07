import pool from '../config/db.js';
import { sendLeadMagnetEmail } from '../services/emailService.js';

export const processLead = async (req, res) => {
    const client = await pool.connect();
    try {
        const email = req.body.email.trim().toLowerCase();
        const slug = req.body.lead_magnet_slug; // Vendrá como 'recurso1', 'recurso2' etc
        const ip = req.ip || req.connection.remoteAddress;

        await client.query('BEGIN');

        let userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        let userId;

        if (userResult.rows.length === 0) {
            const newUser = await client.query(
                'INSERT INTO users (email, ip_address) VALUES ($1, $2) RETURNING id',
                [email, ip]
            );
            userId = newUser.rows[0].id;
        } else {
            userId = userResult.rows[0].id;
        }

        // 3. Buscar la configuración del Recurso en la tabla lead_magnets
        const magnetResult = await client.query("SELECT email_subject, email_body, file_url FROM lead_magnets WHERE slug = $1", [slug]);
        
        let emailSubject, emailBody, fileUrl;

        // BARRERA DE BLINDAJE (Bulletproof): Si la tabla se corrompe, se borra o falla, JAMÁS se cae el correo.
        if (magnetResult.rows.length === 0 || !magnetResult.rows[0].email_subject) {
            console.warn(`[Lead Blinder] Recurso '${slug}' no encontrado en DB o sin datos. Aplicando Fallback Maestro.`);
            
            const HOST = process.env.PUBLIC_URL || 'https://godzillaconsulting.ai';
            const FALLBACKS = {
                'recurso1': {
                    subject: '📂 Acceso a tu Bóveda de Scripts de IA',
                    body: 'Hola,\n\nAquí tienes acceso a los 7 pasos estructurales que te permitirán automatizar tus respuestas.\n\nAtentamente,\nEl equipo de Godzilla Consulting',
                    url: `${HOST}/lead-magnets/prompts-ia.pdf`
                },
                'recurso2': {
                    subject: '📂 Tu descarga: El Protocolo Lázaro',
                    body: 'Hola,\n\nTu recurso está listo. A continuación, puedes acceder a los 7 guiones estratégicos para reactivar prospectos.\n\nAtentamente,\nEl equipo de Godzilla Consulting',
                    url: `${HOST}/lead-magnets/whatsapp-guia.pdf`
                },
                'recurso3': {
                    subject: '📂 Acceso inmediato: Tu Tablero de Control de Ventas',
                    body: 'Hola,\n\nGracias por solicitar el Tablero de Control de Ventas. Sugerimos prestar especial atención a la pestaña Semáforo de Leads.\n\nAtentamente,\nEl equipo de Godzilla Consulting',
                    url: `${HOST}/lead-magnets/crm-template.xlsx`
                }
            };
            
            const fallback = FALLBACKS[slug] || FALLBACKS['recurso1'];
            emailSubject = fallback.subject;
            emailBody = fallback.body;
            fileUrl = fallback.url;
        } else {
            emailSubject = magnetResult.rows[0].email_subject;
            emailBody = magnetResult.rows[0].email_body;
            fileUrl = magnetResult.rows[0].file_url;
        }

        // 5. Registrar la descarga y obtener ID (try/catch para tracking sin romper el proceso)
        let downloadId = null;
        try {
            const downloadResult = await client.query(
                "INSERT INTO downloads (user_id, sent) VALUES ($1, false) RETURNING id",
                [userId]
            );
            downloadId = downloadResult.rows[0].id;
        } catch (e) {
            console.error("Warning: tracking downloads failed:", e.message);
        }

        // 6. ENVIAR CORREO usando la plantilla profesional dinámica
        const emailSuccess = await sendLeadMagnetEmail({
            to: email,
            subject: emailSubject,
            body: emailBody,
            fileUrl: fileUrl
        });

        if (emailSuccess) {
            if (downloadId) {
                await client.query("UPDATE downloads SET sent = true WHERE id = $1", [downloadId]);
            }

            await client.query(
                `INSERT INTO subscribers (email, name, source, status)
                 VALUES ($1, $2, 'lead_magnet', 'active')
                 ON CONFLICT (email) DO NOTHING`,
                [email, email.split('@')[0]]  
            );
        }

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'email_sent'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Controlador CRÍTICO Error (PostgreSQL):", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        client.release();
    }
};
