// server/utils/leadMagnetTemplates.js

/**
 * Recibe texto plano (con saltos de línea) y lo envuelve en la plantilla
 * profesional de Godzilla Consulting.
 */
export function getLeadMagnetTemplate(subject, bodyText, fileUrl) {
    const year = new Date().getFullYear();
    
    // Convertir el texto plano con saltos de línea en HTML <p>
    const formattedBody = bodyText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<p>${line}</p>`)
        .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #eaeaea;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <!-- Header -->
            <tr>
              <td style="padding:30px 40px 20px 40px;border-bottom:1px solid #f0f0f0;">
                <span style="color:#111111;font-size:22px;font-weight:900;letter-spacing:-0.5px;">GODZILLA CONSULTING</span>
              </td>
            </tr>
            <!-- Contenido Dinámico -->
            <tr>
              <td style="padding:30px 40px;color:#333333;font-size:16px;line-height:1.6;">
                ${formattedBody}
                
                <div style="text-align:center;margin:35px 0;">
                  <a href="${fileUrl}" 
                     style="background:#CC0000;color:#ffffff;font-weight:600;padding:14px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:15px;">
                     📄 Descargar Recurso
                  </a>
                </div>
                
                <p style="margin-top:24px;border-top:1px solid #eee;padding-top:16px;">
                  Atentamente,<br/><strong>El equipo de Godzilla Consulting</strong>
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#fcfcfc;padding:24px 40px;border-top:1px solid #f0f0f0;text-align:center;">
                <p style="font-size:12px;color:#888888;margin:0;">
                  © ${year} Godzilla Consulting<br/>
                  Este es un correo automático de entrega de recursos.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `;

    // Extraer texto plano (para el atributo 'text' de nodemailer, evitando SPAM)
    const textPlain = `${bodyText}\n\nEnlace de descarga: ${fileUrl}\n\nAtentamente,\nEl equipo de Godzilla Consulting`;

    return { subject, text: textPlain, html };
}
