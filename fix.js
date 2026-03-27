import fs from 'fs';

const file = 'server/controllers/leadController.js';
let c = fs.readFileSync(file, 'utf8');

c = `import pool from '../config/db.js';
import { sendLeadMagnetEmail } from '../services/emailService.js';

export const processLead = async (req, res) => {
    const client = await pool.connect();
    try {
        const email = req.body.email.trim().toLowerCase();
        const slug = req.body.lead_magnet_slug;
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

        // 3. Buscar el Lead Magnet solicitado en la tabla SQL
        const magnetResult = await client.query(
            'SELECT id, email_subject, email_body, file_url FROM lead_magnets WHERE slug = $1',
            [slug]
        );

        if (magnetResult.rows.length === 0) {
            throw new Error('No se encontró el Recurso solicitado (' + slug + ') o está deshabilitado.');
        }

        const magnet = magnetResult.rows[0];

        // 5. Registrar la descarga
        let downloadId = null;
        try {
            const downloadResult = await client.query(
                'INSERT INTO downloads (user_id, sent) VALUES ($1, false) RETURNING id',
                [userId]
            );
            downloadId = downloadResult.rows[0].id;
        } catch (e) {
            console.error('Warning: download tracking missing', e.message);
        }

        // 6. ENVIAR CORREO usando la plantilla profesional dinámica
        const emailSuccess = await sendLeadMagnetEmail({
            to: email,
            subject: magnet.email_subject,
            body: magnet.email_body,
            fileUrl: magnet.file_url
        });

        if (emailSuccess) {
            if (downloadId) {
                await client.query('UPDATE downloads SET sent = true WHERE id = $1', [downloadId]);
            }

            await client.query(
                \`INSERT INTO subscribers (email, name, source, status)
                 VALUES ($1, $2, 'lead_magnet', 'active')
                 ON CONFLICT (email) DO NOTHING\`,
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
`;

fs.writeFileSync(file, c);
console.log("Restored leadController to use lead_magnets SQL table like the user wanted.");
