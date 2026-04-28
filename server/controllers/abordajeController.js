import pool from '../config/db.js';
import crypto from 'crypto';
import { agendarEnGoogleCalendar } from '../services/calendarService.js';
import { sendCitaConfirmationEmail } from '../services/emailService.js';

// ── Utilidad de cifrado AES-256-GCM ──────────────────────────────────────────
// La ENCRYPTION_KEY debe estar en .env como 64 chars hex (= 32 bytes).
// Generar una vez con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
function encryptCredentials(plainObj) {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 64) {
        console.warn('[Abordaje] ENCRYPTION_KEY no configurada — credenciales NO cifradas en esta sesión.');
        return null;
    }
    const keyBuffer = Buffer.from(key, 'hex');
    const plaintext = JSON.stringify(plainObj);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

// ── Controlador principal ─────────────────────────────────────────────────────
export const processAbordaje = async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;

    try {
        const {
            empresa, web,
            servicios, metas, diferenciadores, dbOption,
            redes,
            metaVariant, googleVariant, tiktokVariant,
            metaAccessStatus, googleAccessStatus, tiktokAccessStatus,
            // Cita (Paso 4) — campos opcionales que el frontend enviará si el usuario seleccionó fecha
            citaFecha, citaHora, citaNombre, citaCorreo, citaTelefono,
            termsAccepted, infoAccepted
        } = req.body;

        // Validaciones básicas
        if (!empresa?.trim()) {
            return res.status(400).json({ success: false, error: 'El nombre de la empresa es obligatorio.' });
        }
        if (!termsAccepted || !infoAccepted) {
            return res.status(400).json({ success: false, error: 'Debes aceptar los términos y condiciones.' });
        }

        // ── Extraer y cifrar credenciales sensibles ───────────────────────────
        // Solo ciframos si hay credenciales reales (usuario/contraseña de Google o TikTok)
        const credencialesObj = {};
        if (req.body.googleCredUser) credencialesObj.googleUser = req.body.googleCredUser;
        if (req.body.googleCredPass) credencialesObj.googlePass = req.body.googleCredPass;
        if (req.body.tiktokCredUser) credencialesObj.tiktokUser = req.body.tiktokCredUser;
        if (req.body.tiktokCredPass) credencialesObj.tiktokPass = req.body.tiktokCredPass;

        const credencialesCifradas = Object.keys(credencialesObj).length > 0
            ? encryptCredentials(credencialesObj)
            : null;

        // ── Agendar en Google Calendar (si el usuario eligió fecha en Paso 4) ──
        let calendarId = null;
        let personalCalendarLink = null;

        if (citaFecha && citaHora) {
            try {
                const gRes = await agendarEnGoogleCalendar({
                    nombre: citaNombre || empresa,
                    correo: citaCorreo || 'sin-correo@formulario.gc',
                    telefono: citaTelefono || '',
                    servicio: 'Sesión de Abordaje — ' + empresa,
                    fecha: citaFecha,
                    hora: citaHora,
                    notas: `Servicios: ${servicios || '—'} | Metas: ${metas || '—'}`
                });
                calendarId = gRes.id;
                personalCalendarLink = gRes.personalCalendarLink;
                console.log(`[Abordaje] ✅ Cita agendada en GCal: ${calendarId}`);
            } catch (calErr) {
                // No bloqueamos el flujo si Calendar falla
                console.error('[Abordaje] ⚠️ Google Calendar falló (no bloqueante):', calErr.message);
            }
        }

        // ── Guardar en tabla abordajes ────────────────────────────────────────
        const insertResult = await pool.query(`
            INSERT INTO abordajes (
                empresa, web, servicios, metas, diferenciadores, db_option,
                redes_meta_variant, redes_google_variant, redes_tiktok_variant,
                meta_access_status, google_access_status, tiktok_access_status,
                credenciales_cifradas,
                cita_fecha, cita_hora, google_calendar_id, personal_calendar_link,
                ip_address
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
            RETURNING id
        `, [
            empresa.trim(),
            web?.trim() || null,
            servicios?.trim() || null,
            metas?.trim() || null,
            diferenciadores?.trim() || null,
            dbOption || null,
            metaVariant || null,
            googleVariant || null,
            tiktokVariant || null,
            metaAccessStatus || null,
            googleAccessStatus || null,
            tiktokAccessStatus || null,
            credencialesCifradas,
            citaFecha || null,
            citaHora || null,
            calendarId,
            personalCalendarLink,
            ip
        ]);

        const abordajeId = insertResult.rows[0].id;
        console.log(`[Abordaje] ✅ Guardado en DB con ID: ${abordajeId}`);

        // ── Guardar cita en tabla citas (si aplica) ───────────────────────────
        if (citaFecha && citaHora) {
            try {
                await pool.query(`
                    INSERT INTO citas (
                        nombre_completo, telefono, email, tipo_sesion,
                        fecha, hora, status, google_calendar_id, origen, notas_adicionales
                    ) VALUES ($1,$2,$3,$4,$5,$6,'confirmada',$7,'formulario',$8)
                `, [
                    citaNombre || empresa,
                    citaTelefono || '',
                    citaCorreo || 'sin-correo@formulario.gc',
                    'Sesión de Abordaje — ' + empresa,
                    citaFecha,
                    citaHora,
                    calendarId,
                    `Abordaje ID: ${abordajeId}`
                ]);
                console.log(`[Abordaje] ✅ Cita insertada en tabla citas.`);
            } catch (dbCitaErr) {
                console.error('[Abordaje] ⚠️ Fallo insertando cita (no bloqueante):', dbCitaErr.message);
            }
        }

        // ── Correo de confirmación ────────────────────────────────────────────
        if (citaCorreo && citaFecha) {
            try {
                await sendCitaConfirmationEmail({
                    nombre: citaNombre || empresa,
                    email: citaCorreo,
                    fecha: citaFecha,
                    hora: citaHora,
                    tipoSesion: `Sesión de Abordaje — ${empresa}`,
                    personalCalendarLink
                });
                console.log(`[Abordaje] ✅ Correo de confirmación enviado a ${citaCorreo}`);
            } catch (emailErr) {
                console.error('[Abordaje] ⚠️ Fallo correo confirmación (no bloqueante):', emailErr.message);
            }
        }

        // ── WhatsApp de confirmación (via bot_outbound_queue) ─────────────────
        if (citaTelefono && citaFecha) {
            try {
                const waMsg = `✅ ¡Bienvenidos a la familia Godzilla, *${empresa}*! 🦖\n\n` +
                    `Tu sesión de abordaje quedó confirmada:\n` +
                    `📅 Fecha: *${citaFecha}*\n` +
                    `🕐 Hora: *${citaHora}*\n` +
                    (personalCalendarLink
                        ? `\n👉 Guarda la cita en tu calendario:\n${personalCalendarLink}\n`
                        : '') +
                    `\nNuestro equipo se comunicará contigo pronto. ¡Prepárate para el impacto! 🚀\n` +
                    `— Godzilla Consulting`;

                await pool.query(
                    `INSERT INTO bot_outbound_queue (bot_name, payload, status) VALUES ('whatsapp', $1, 'pending')`,
                    [JSON.stringify({ to: citaTelefono, message: waMsg })]
                );
                console.log(`[Abordaje] ✅ WA de confirmación encolado para ${citaTelefono}`);
            } catch (waErr) {
                console.error('[Abordaje] ⚠️ Fallo encolando WA (no bloqueante):', waErr.message);
            }
        }

        // ── Alertas Internas al Equipo (via bot_outbound_queue) ─────────────────
        try {
            const teamNumbers = [
                "5216562006682",
                "5216563236397",
                "5216565784301",
                "5216567437995",
                "5216561031350",
                "5216565624319",
                "5216565965757"
            ];
            
            const safeServicios = typeof servicios === 'string' ? servicios : String(servicios || '');
            const safeMetas = typeof metas === 'string' ? metas : String(metas || '');

            const internalMsg = `🚨 *NUEVO LEAD DE ABORDAJE* 🚨\n\n` +
                `🏢 Empresa: ${empresa}\n` +
                `🌐 Web: ${web || 'N/A'}\n` +
                `📞 Tel: ${citaTelefono || 'N/A'}\n` +
                `📅 Cita: ${citaFecha || 'N/A'} a las ${citaHora || 'N/A'}\n` +
                `🎯 Servicios: ${safeServicios ? safeServicios.substring(0, 100) + '...' : 'N/A'}\n` +
                `💡 Metas: ${safeMetas ? safeMetas.substring(0, 100) + '...' : 'N/A'}\n\n` +
                `🔐 *Seguridad:* Las contraseñas han sido encriptadas y guardadas en la DB (Abordaje ID: ${abordajeId}).`;

            for (const number of teamNumbers) {
                await pool.query(
                    `INSERT INTO bot_outbound_queue (bot_name, payload, status) VALUES ('whatsapp', $1, 'pending')`,
                    [JSON.stringify({ to: number, message: internalMsg })]
                );
            }
            console.log(`[Abordaje] ✅ Alertas internas encoladas para el equipo.`);
        } catch (alertErr) {
            console.error('[Abordaje] ⚠️ Fallo encolando alertas internas (no bloqueante):', alertErr.message);
        }

        return res.status(200).json({
            success: true,
            id: abordajeId,
            message: 'Abordaje registrado exitosamente.'
        });

    } catch (err) {
        console.error('❌ [Abordaje Controller] Error crítico:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor. Intenta de nuevo.'
        });
    }
};
