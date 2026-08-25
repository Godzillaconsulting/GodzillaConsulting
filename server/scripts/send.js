import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function send() {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST || 'smtp-relay.brevo.com',
        port: process.env.EMAIL_SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS
        }
    });

    const dir = "C:\\\\Users\\\\GODZILLA.IA\\\\.gemini\\\\antigravity\\\\brain\\\\4149c38e-7d62-4c5c-b3db-3c34930accac\\\\scratch\\\\final_images";
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
    
    const attachments = files.map(f => ({
        filename: f,
        path: path.join(dir, f)
    }));

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Godzilla Consulting AI'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
        to: 'godzilladiseno@gmail.com',
        subject: 'Nuevas Imágenes para Redes Sociales (IA)',
        html: '<p>Aquí tienes las 4 imágenes renderizadas sobre noticias reales de IA listas para redes sociales.</p>',
        attachments
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado con éxito: ' + info.messageId);
    } catch (e) {
        console.error('❌ Error al enviar el correo:', e);
    }
}

send();
