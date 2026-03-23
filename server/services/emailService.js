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

// ── Transporter — 3 modos posibles ──────────────────────────────────────────
// 1. EMAIL_DIRECT=true  → Entrega directa al servidor MX del destinatario (sin relay)
// 2. EMAIL_SMTP_HOST    → Relay SMTP externo (Brevo, etc.)
// 3. Fallback           → Gmail
const createTransporter = () => {
    const dkim = getDkimConfig();

    let config;

    if (process.env.EMAIL_DIRECT === 'true') {
        // ── Modo Self-hosted: entrega directa por puerto 25 sin relay ──────
        // Nodemailer resuelve el MX del destinatario y conecta directo
        config = {
            direct: true,                                    // sin relay
            port:   25,
            name:   process.env.DKIM_DOMAIN || 'godzillaconsulting.ai', // HELO hostname
            // Sin auth — nos identificamos solo con DKIM + SPF
        };
    } else if (process.env.EMAIL_SMTP_HOST) {
        // ── Modo Relay SMTP (Brevo, etc.) ──────────────────────────────────
        config = {
            host:   process.env.EMAIL_SMTP_HOST,
            port:   parseInt(process.env.EMAIL_SMTP_PORT || '587'),
            secure: process.env.EMAIL_SMTP_PORT === '465',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        };
    } else {
        // ── Fallback: Gmail ────────────────────────────────────────────────
        config = {
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        };
    }

    // DKIM propio SOLO en modo directo.
    // Con relay (Brevo) NO agregamos DKIM propio — el relay maneja su propia firma
    // y la doble firma invalida la entrega.
    if (dkim && process.env.EMAIL_DIRECT === 'true') config.dkim = dkim;

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

    // Extraer texto plano del HTML para mejorar el ratio texto/HTML (anti-spam)
    const textPlain = htmlTemplate.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    while (retries >= 0) {
        try {
            const transporter = createTransporter();
            const result = await transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Godzilla Consulting 🦖'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
                to,
                subject,
                text: textPlain,  // versión texto plano — requerida para no ir a spam
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

    // Texto plano extraído del HTML — mejora ratio texto/HTML y evita spam
    const textPlain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    try {
        const transporter = createTransporter();
        const result = await transporter.sendMail({
            from:    `"${process.env.EMAIL_FROM_NAME || 'Godzilla Consulting 🦖'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
            to,
            subject,
            text: textPlain,  // versión texto plano — crítico para entregabilidad
            html,
            headers: bulkHeaders(unsubUrl),
        });
        return !!result.messageId;
    } catch (err) {
        console.error(`❌ [Newsletter Email] → ${to}:`, err.message);
        return false;
    }
};


/**
 * Correo de confirmación de cita con link de Google Calendar
 * Se llama automáticamente al crear una cita desde cualquier canal
 */
export const sendCitaConfirmationEmail = async ({ nombre, email, fecha, hora, tipoSesion, personalCalendarLink }) => {
    if (!email) return false;

    // Formatear fecha legible en español
    const fechaObj = new Date(fecha + 'T12:00:00');
    const fechaLabel = fechaObj.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

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
            <!-- Contenido -->
            <tr>
              <td style="padding:40px;color:#111111;font-size:15px;line-height:1.7;">
                <h2 style="margin:0 0 8px 0;color:#111;">✅ ¡Cita confirmada, ${nombre}!</h2>
                <p style="color:#555;margin:0 0 24px 0;">Tu sesión ha sido agendada con éxito. Aquí están los detalles:</p>

                <table style="background:#f9f9f9;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Tipo de sesión</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 16px 0;font-size:17px;font-weight:bold;color:#CC0000;">${tipoSesion}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Fecha</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 16px 0;font-size:16px;font-weight:bold;color:#111;">📅 ${fechaLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Hora</td>
                  </tr>
                  <tr>
                    <td style="font-size:16px;font-weight:bold;color:#111;">🕐 ${hora}</td>
                  </tr>
                </table>

                ${personalCalendarLink ? `
                <div style="text-align:center;margin:24px 0;">
                  <a href="${personalCalendarLink}"
                     style="background:#CC0000;color:#ffffff;font-weight:bold;padding:14px 32px;text-decoration:none;border-radius:30px;display:inline-block;font-size:15px;">
                    📅 Agregar a mi Google Calendar
                  </a>
                  <p style="color:#888;font-size:12px;margin:12px 0 0 0;">Guarda la cita en tu teléfono para no olvidarla</p>
                </div>` : ''}

                <p style="margin-top:24px;">Nos comunicaremos contigo para confirmar los detalles de la reunión. Si necesitas reagendar, responde a este correo.</p>
                <p>¡Nos vemos pronto! 🦖</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                <p style="font-size:12px;color:#888;margin:0;">
                  © ${new Date().getFullYear()} Godzilla Consulting — Ciudad Juárez, Chih.<br/>
                  <a href="https://godzillaconsulting.ai" style="color:#CC0000;text-decoration:none;">godzillaconsulting.ai</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    const textPlain = `¡Cita confirmada, ${nombre}!\n\nTipo: ${tipoSesion}\nFecha: ${fechaLabel}\nHora: ${hora}\n\n${personalCalendarLink ? 'Agrega la cita a tu calendario: ' + personalCalendarLink : ''}\n\nGodzilla Consulting — godzillaconsulting.ai`;

    try {
        const transporter = createTransporter();
        const result = await transporter.sendMail({
            from:    `"Godzilla Consulting 🦖" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
            to:      email,
            subject: `✅ Cita confirmada — ${tipoSesion} | Godzilla Consulting`,
            text:    textPlain,
            html,
        });
        console.log(`📅 [Cita Confirmation] Enviado a ${email} — messageId: ${result.messageId}`);
        return !!result.messageId;
    } catch (err) {
        console.error(`❌ [Cita Confirmation] → ${email}:`, err.message);
        return false;
    }
};
