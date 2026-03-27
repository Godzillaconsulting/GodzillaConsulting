import pool from '../config/db.js';
import { sendLeadMagnetEmail } from '../services/emailService.js';

export const processLead = async (req, res) => {
    try {
        const email = req.body.email.trim().toLowerCase();
        const slug = req.body.lead_magnet_slug;
        const ip = req.ip || req.connection.remoteAddress;

        // 1. Obtener o crear usuario sin abortar transacciones globales
        let userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        let userId;

        if (userResult.rows.length === 0) {
            try {
                const newUser = await pool.query(
                    'INSERT INTO users (email, ip_address) VALUES ($1, $2) RETURNING id',
                    [email, ip]
                );
                userId = newUser.rows[0].id;
            } catch (err) {
                // Manejar posible condición de carrera si se insertó simultáneamente
                userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
                userId = userResult.rows?.[0]?.id || 0;
            }
        } else {
            userId = userResult.rows[0].id;
        }

        // 2. Buscar el Lead Magnet solicitado
        const magnetResult = await pool.query(
            'SELECT id, email_subject, email_body, file_url FROM lead_magnets WHERE slug = $1',
            [slug]
        );

        if (magnetResult.rows.length === 0) {
            throw new Error('No se encontró el Recurso solicitado (' + slug + ') en la base de datos o está deshabilitado.');
        }

        const magnet = magnetResult.rows[0];

        // 3. ENVIAR CORREO PRIMERO Y DE FORMA GARANTIZADA (No importa si ya está registrado)
        const emailSuccess = await sendLeadMagnetEmail({
            to: email,
            subject: magnet.email_subject,
            body: magnet.email_body,
            fileUrl: magnet.file_url
        });

        // 4. Trackear post-envío de manera resiliente (Fire & Forget interno)
        if (emailSuccess && userId) {
            pool.query('INSERT INTO downloads (user_id, sent) VALUES ($1, true)', [userId])
                .catch(e => console.error('Warning: download tracking duplicado omitido', e.message));

            pool.query(
                `INSERT INTO subscribers (email, name, source, status)
                 VALUES ($1, $2, 'lead_magnet', 'active')
                 ON CONFLICT (email) DO NOTHING`,
                [email, email.split('@')[0]]  
            ).catch(e => console.error('Warning: suscriptor ya existía, omitido'));
        }

        return res.status(200).json({
            success: true,
            message: 'email_sent'
        });

    } catch (error) {
        console.error("❌ Controlador CRÍTICO Error (PostgreSQL):", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
