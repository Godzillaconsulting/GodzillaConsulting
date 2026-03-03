import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Función central para envíos de correo de Lead Magnets
 * @param {object} params
 * @param {string} params.to - Correo electrónico del cliente
 * @param {string} params.subject - Asunto del correo
 * @param {string} params.body - Texto o HTML a enviar
 * @param {string} params.fileUrl - Link de descarga desde Supabase Storage
 */
export const sendLeadMagnetEmail = async ({ to, subject, body, fileUrl }) => {
    let retries = 1;

    // Plantilla Wrapper HTML para todos los correos de la empresa
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
            const result = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: [to],
                subject: subject,
                html: htmlTemplate,
                // Opcionalmente podemos recibir "attachments" y pasarlos pero por
                // ahora la orden fue usar un archivo URL y que bajen un botón
            });
            // Si funciona retorna true, si result trae error lanza catch
            if (result.error) throw new Error(result.error.message);
            return true;
        } catch (error) {
            console.error(`❌ [Email Service] Fallo al enviar al correo: ${to}. Intentos restantes: ${retries}`, error);
            if (retries === 0) {
                // Si ya no quedan reintentos, retornamos false
                return false;
            }
            retries--;
        }
    }
};
