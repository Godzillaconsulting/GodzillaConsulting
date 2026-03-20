import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// ── DKIM propio — firma criptográfica sin terceros ───────────────────────────
// La llave privada vive en .env (DKIM_PRIVATE_KEY).
// La llave pública está en Cloudflare DNS: godzilla._domainkey.godzillaconsulting.ai
const getDkimConfig = () => {
    const privateKey = process.env.DKIM_PRIVATE_KEY;
    if (!privateKey) return undefined;

    return {
        domainName:  process.env.DKIM_DOMAIN    || 'godzillaconsulting.ai',
        keySelector: process.env.DKIM_SELECTOR  || 'godzilla',
        privateKey:  privateKey.replace(/\\n/g, '\n'), // restaurar saltos reales
    };
};

// ── Transporter compartido — SMTP configurable + DKIM ────────────────────────
const createTransporter = () => {
    const dkim = getDkimConfig();

    const config = process.env.EMAIL_SMTP_HOST
        ? {
            host:   process.env.EMAIL_SMTP_HOST,
            port:   parseInt(process.env.EMAIL_SMTP_PORT || '587'),
            secure: process.env.EMAIL_SMTP_PORT === '465',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
          }
        : {
            // Fallback Gmail
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
          };

    // DKIM se aplica al transporter si la llave está configurada
    if (dkim) config.dkim = dkim;

    return nodemailer.createTransport(config);
};

// ── Cabeceras anti-spam estándar (ingeniería de Brevo aplicada) ──────────────
// List-Unsubscribe: Gmail/Outlook muestran botón de desuscripción nativo
// Precedence: bulk → clasifica como boletín, no spam
// X-Mailer: firma del servidor
const bulkHeaders = (unsubUrl) => ({
    'List-Unsubscribe':      `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Precedence':            'bulk',
    'X-Mailer':              'GodzillaConsulting-Mailer/1.0',
});


/**
 * Envío de Lead Magnet (recurso descargable)
 */
export const sendLeadMagnetEmail = async ({ to, subject, body, fileUrl }) => {
    let retries = 1;

    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; color: #111111; line-height: 1.6;">
            <div>${body}</div>
            <br/><br/>
            <div style="text-align: center;">
                <a href="${fileUrl}" 
                   style="background-color: #CC0000; color: #FFFFFF; font-weight: bold; 
                          padding: 14px 28px; text-decoration: none; border-radius: 30px; 
                          display: inline-block;">
                    Descargar tu recurso aquí
                </a>
            </div>
            <br/><br/>
            <hr style="border: 0; border-top: 1px solid #EAEAEA;" />
            <p style="font-size: 12px; color: #888; text-align: center;">
                Has recibido este correo porque solicitaste contenido gratuito de GodzillaConsulting.<br/>
                Si no fuiste tú, puedes ignorarlo o responder a este correo para darte de baja. 🦖
            </p>
        </div>
    `;

    while (retries >= 0) {
        try {
            const transporter = createTransporter();
            const result = await transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Godzilla Consulting 🦖'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
                to,
                subject,
                html: htmlTemplate
            });
            if (!result.messageId) throw new Error('No messageId returned from transporter');
            return true;
        } catch (error) {
            console.error(`❌ [Email Service] Fallo lead magnet → ${to}. Intentos: ${retries}`, error.message);
            if (retries === 0) return false;
            retries--;
        }
    }
};

/**
 * Envío de Newsletter (boletín periódico)
 * Usado por emailQueue.js para envío masivo escalonado
 */
export const sendNewsletterEmail = async ({ to, subject, bodyHtml, attachmentUrl }) => {
    const unsubUrl = `https://godzillaconsulting.ai/api/newsletter/unsubscribe?email=${encodeURIComponent(to)}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#111111;padding:28px 40px;text-align:center;">
                <span style="color:#CC0000;font-size:24px;font-weight:900;letter-spacing:-1px;">GODZILLA</span>
                <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-1px;"> CONSULTING</span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;color:#111111;font-size:15px;line-height:1.7;">
                ${bodyHtml}
                ${attachmentUrl ? `
                <div style="text-align:center;margin:32px 0;">
                  <a href="${attachmentUrl}" style="background:#CC0000;color:#fff;font-weight:bold;padding:14px 32px;text-decoration:none;border-radius:30px;display:inline-block;">
                    📎 Descargar Adjunto
                  </a>
                </div>` : ''}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;text-align:center;">
                <p style="font-size:12px;color:#888;margin:0;">
                  © ${new Date().getFullYear()} Godzilla Consulting — Ciudad Juárez, Chih.<br/>
                  <a href="${unsubUrl}" style="color:#CC0000;text-decoration:none;">Cancelar suscripción</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    try {
        const transporter = createTransporter();
        const result = await transporter.sendMail({
            from:    `"${process.env.EMAIL_FROM_NAME || 'Godzilla Consulting 🦖'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            headers: bulkHeaders(unsubUrl),
        });
        return !!result.messageId;
    } catch (err) {
        console.error(`❌ [Newsletter Email] → ${to}:`, err.message);
        return false;
    }
};

