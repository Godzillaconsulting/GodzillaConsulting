import pool from '../config/db.js';
import { agendarEnGoogleCalendar } from '../services/calendarService.js';
import { sendCitaConfirmationEmail } from '../services/emailService.js';
import { sendServerEvent } from '../services/metaCapiService.js';

export const processContactForm = async (req, res) => {
    const client = await pool.connect();
    try {
        console.log("📩 Cita recibida del formulario:", req.body);
        const { nombre, email, telefono, preferencia_sesion, fecha, hora } = req.body;
        const notas = req.body.notas || '';

        if (!nombre || !email || !telefono || !preferencia_sesion || !fecha || !hora) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }

        // PASO 1: Google Calendar PRIMERO (all-or-nothing)
        console.log("📅 Agendando en Google Calendar...");
        const googleRes = await agendarEnGoogleCalendar({
            nombre: nombre.trim(),
            correo: email.trim().toLowerCase(),
            telefono: telefono.trim(),
            servicio: preferencia_sesion,
            fecha,
            hora,
            notas
        });

        if (!googleRes || !googleRes.id) {
            throw new Error('Google Calendar no confirmó el evento — no se guardó en DB.');
        }

        // PASO 2: Solo si Google confirmó → insertar en Local (con google_calendar_event_id)
        console.log("🛠️ Insertando en Local con Calendar ID:", googleRes.id);
        const result = await client.query(
            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status, google_calendar_event_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmada', $8) RETURNING id`,
            [nombre.trim(), email.trim().toLowerCase(), telefono.trim(), preferencia_sesion, fecha, hora, notas, googleRes.id]
        );

        console.log("✅ Cita #" + result.rows[0].id + " guardada. Calendar:", googleRes.id);

        // Enviar evento CAPI de servidor a Meta Pixel (fire & forget)
        sendServerEvent('Schedule', {
            email: email.trim().toLowerCase(),
            phone: telefono.trim(),
            client_ip: req.ip,
            client_user_agent: req.headers['user-agent']
        });

        // Enviar correo de confirmación con link de Google Calendar (fire & forget)
        sendCitaConfirmationEmail({
            nombre,
            email: email.trim().toLowerCase(),
            fecha,
            hora,
            tipoSesion: preferencia_sesion,
            personalCalendarLink: googleRes.personalCalendarLink,
        }).catch(err => console.error('❌ [ContactController] Email confirmación falló:', err.message));

        return res.status(200).json({
            success: true,
            message: `¡Cita confirmada! Te contactaremos pronto.`,
            cita_id: result.rows[0].id,
            personal_calendar_link: googleRes.personalCalendarLink,
        });

    } catch (error) {
        console.error("❌ Error en contactController:", error.message);
        return res.status(500).json({
            success: false,
            message: `Error al agendar: ${error.message}`
        });
    } finally {
        client.release();
    }
};
