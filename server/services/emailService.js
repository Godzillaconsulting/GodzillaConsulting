import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getLeadMagnetTemplate } from '../utils/leadMagnetTemplates.js';
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


// ── Cabeceras anti-spam estándar ─────────────────────────────────────────────
// List-Unsubscribe: Gmail/Outlook muestran botón de desuscripción nativo
// X-Mailer: firma del servidor
const bulkHeaders = (unsubUrl) => ({
    'List-Unsubscribe':      `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer':              'GodzillaConsulting-Mailer/1.0',
});


/**
 * Envío de Lead Magnet (recurso descargable)
 */
export const sendLeadMagnetEmail = async ({ to, subject, body, fileUrl }) => {
    let retries = 1;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@godzillaconsulting.ai';
    const fromName = (process.env.EMAIL_FROM_NAME || 'Godzilla Consulting').replace(/[^\x00-\x7F]/g, '').trim() || 'Godzilla Consulting';

    // Inyectar datos en la envoltura HTML corporativa
    const templateData = getLeadMagnetTemplate(subject, body || 'Aquí tienes tu recurso descargable.', fileUrl);

    while (retries >= 0) {
        try {
            const transporter = createTransporter();
            const result = await transporter.sendMail({
                from: `"${fromName}" <${fromAddress}>`,
                replyTo: fromAddress,
                to,
                subject: templateData.subject,
                text: templateData.text,
                html: templateData.html
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
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@godzillaconsulting.ai';
    const fromName = (process.env.EMAIL_FROM_NAME || 'Godzilla Consulting').replace(/[^\x00-\x7F]/g, '').trim() || 'Godzilla Consulting';

    // Asegurarse de quitar literales \n que la IA a veces inyecta erróneamente en el HTML
    const cleanBodyHtml = String(bodyHtml).replace(/\\n/g, '<br/>').replace(/```html/g, '').replace(/```/g, '');

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:40px 20px;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#111111;border:1px solid #222222;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.8);">
        
        <!-- Brand Header minimalist Apple-style but Dark & Red -->
        <tr>
          <td style="padding:30px 0;text-align:center;background:#09090b;border-bottom:3px solid #CC0000;">
             <img src="https://godzillaconsulting.ai/favicon.png" alt="Godzilla Consulting" width="55" height="55" style="display:block;margin:0 auto;" />
             <h1 style="margin:15px 0 0 0;font-size:18px;color:#fff;letter-spacing:2px;text-transform:uppercase;">Godzilla Consulting</h1>
             <p style="margin:5px 0 0 0;color:#CC0000;font-size:12px;letter-spacing:1px;font-weight:bold;">INTELIGENCIA EJECUTIVA B2B</p>
          </td>
        </tr>

        <!-- Body Area -->
        <tr>
          <td style="padding:40px 30px;font-size:16px;line-height:1.7;color:#e5e5e5;">
            ${cleanBodyHtml}
            
            ${attachmentUrl ? `
            <div style="margin-top:50px;padding:35px;background-color:#18181b;border-radius:12px;text-align:center;border:1px solid #333;box-shadow:0 8px 20px rgba(0,0,0,0.5);">
              <h3 style="margin:0 0 10px 0;font-size:18px;color:#fff;font-weight:900;text-transform:uppercase;">[ ACCESO CLASIFICADO ]</h3>
              <p style="margin:0 0 24px 0;font-size:14px;color:#aaa;line-height:1.6;">El PDF Premium con todo el análisis profundo, gráficas completas y recomendaciones de nuestro AI Director está listo para descarga exclusiva (Acceso gratuito temporal por reestructura de Socios).</p>
              <a href="${attachmentUrl}" style="background-color:#CC0000;color:#ffffff;font-size:14px;font-weight:bold;padding:16px 32px;text-decoration:none;border-radius:6px;display:inline-block;letter-spacing:1px;box-shadow:0 0 15px rgba(204,0,0,0.4);">
                INSPECCIONAR REPORTE COMPLETO PDF
              </a>
            </div>
            ` : ''}
          </td>
        </tr>

        <!-- Footer B2B -->
        <tr>
          <td style="padding:40px 30px;background-color:#09090b;border-top:1px solid #222222;text-align:center;">
             <div style="margin-bottom:20px;">
                <a href="https://www.instagram.com/godzilla_consulting/" style="margin:0 10px;color:#888;text-decoration:none;font-size:14px;font-weight:bold;">Instagram</a>
                <span style="color:#444;">|</span>
                <a href="https://www.facebook.com/godzillajuarez" style="margin:0 10px;color:#888;text-decoration:none;font-size:14px;font-weight:bold;">Facebook</a>
                <span style="color:#444;">|</span>
                <a href="https://www.youtube.com/channel/UCNg0_UUqZCt4SFdE3TxutLw" style="margin:0 10px;color:#888;text-decoration:none;font-size:14px;font-weight:bold;">YouTube</a>
                <span style="color:#444;">|</span>
                <a href="https://www.tiktok.com/@godzilla_co_jrz" style="margin:0 10px;color:#888;text-decoration:none;font-size:14px;font-weight:bold;">TikTok</a>
             </div>
            <p style="font-size:11px;color:#666666;margin:0;line-height:1.6;">
              <strong>© ${new Date().getFullYear()} Godzilla Consulting LLC.</strong> Todos los derechos reservados.<br/>
              Inteligencia Artificial y Desarrollo Corporativo.<br/><br/>
              Recibes este correo analítico confidencial porque estás suscrito a nuestra matriz directiva.<br/>
              <br/>
              <a href="${unsubUrl}" style="color:#CC0000;text-decoration:none;font-weight:bold;">Mudar suscripción / Darse de baja</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    // Texto plano extraído del HTML — mejora ratio texto/HTML y evita spam
    const textPlain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    try {
        const transporter = createTransporter();
        const result = await transporter.sendMail({
            from:    `"${fromName}" <${fromAddress}>`,
            replyTo: fromAddress,
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
            <!-- Header Apple-style -->
            <tr>
              <td style="background:#ffffff;padding:35px 40px 10px 40px;text-align:center;">
                <img src="https://godzillaconsulting.ai/favicon.png" alt="Godzilla Consulting" width="55" height="55" style="display:block;margin:0 auto;" />
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
