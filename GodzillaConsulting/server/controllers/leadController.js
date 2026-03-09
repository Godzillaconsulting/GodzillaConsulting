import pool from '../config/db.js';
import { sendLeadMagnetEmail } from '../services/emailService.js';

export const processLead = async (req, res) => {
    const client = await pool.connect();
    try {
        // 1. Descomponer y Sanitizar datos
        const email = req.body.email.trim().toLowerCase();
        const slug = req.body.lead_magnet_slug;
        const ip = req.ip || req.connection.remoteAddress;

        await client.query('BEGIN');

        // 2. Encontrar al Usuario (o crearlo si no existe)
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

        // 3. Buscar el Lead Magnet solicitado
        const magnetResult = await client.query(
            'SELECT id, email_subject, email_body, file_url FROM lead_magnets WHERE slug = $1',
            [slug]
        );

        if (magnetResult.rows.length === 0) {
            throw new Error('No se encontró el Recurso solicitado o está deshabilitado.');
        }

        const magnet = magnetResult.rows[0];

        // 4. (Opcional) Revisar si el usuario ya bajó este recurso.
        // Se ha removido el bloqueo de 'already_sent' para permitir auditoría de múltiples descargas.
        const existingDownload = await client.query(
            'SELECT id FROM downloads WHERE user_id = $1 AND lead_magnet_id = $2',
            [userId, magnet.id]
        );

        // 5. Registrar la descarga (sent: false por ahora)
        const downloadResult = await client.query(
            'INSERT INTO downloads (user_id, lead_magnet_id, sent) VALUES ($1, $2, false) RETURNING id',
            [userId, magnet.id]
        );
        const downloadId = downloadResult.rows[0].id;

        // 6. ENVIAR CORREO usando la API de Resend
        const emailSuccess = await sendLeadMagnetEmail({
            to: email,
            subject: magnet.email_subject,
            body: magnet.email_body,
            fileUrl: magnet.file_url
        });

        if (emailSuccess) {
            // 7. Si fue exitoso, marcamos como enviado
            await client.query('UPDATE downloads SET sent = true WHERE id = $1', [downloadId]);
        }

        await client.query('COMMIT');

        // 8. Contestamos afirmativamente al frontend
        return res.status(200).json({
            success: true,
            message: 'email_sent'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Controlador CRÍTICO Error (PostgreSQL):", error.message);
        return res.status(500).json({
            success: false,
            message: 'Ha ocurrido un problema procesando la solicitud. Intenta más tarde.'
        });
    } finally {
        client.release();
    }
};

