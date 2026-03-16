import pool from '../config/db.js';
import { agendarEnGoogleCalendar } from '../services/calendarService.js';

export const processContactForm = async (req, res) => {
    const client = await pool.connect();
    try {
        console.log("📩 Recibiendo solicitud de Cita Landing Page:", req.body);
        const { nombre, email, telefono, preferencia_sesion, fecha, hora } = req.body;

        if (!nombre || !email || !telefono || !preferencia_sesion || !fecha || !hora) {
            console.log("⚠️ Validación fallida: Faltan campos obligatorios.");
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }

        // 🛡️ Capa 2: Bloqueo de Correos Duplicados (Unique Constraint Lógico)
        // Evita que la misma persona agende 10 veces seguidas o envíe basura
        const resEmail = await client.query(
            `SELECT id FROM citas WHERE email = $1 LIMIT 1`,
            [email.trim().toLowerCase()]
        );
        if (resEmail.rowCount > 0) {
            console.log(`🚫 Intento de correo duplicado detectado: ${email}`);
            return res.status(400).json({ success: false, message: 'Este correo ya tiene una cita registrada. Si necesitas reprogramar, contáctanos directo a WhatsApp.' });
        }

        // 🛡️ Capa 3: Prevención de Doble Empalme de Agenda (Multi-Tabla)
        const queryConflict = `
            SELECT SUM(c) as total FROM (
                SELECT COUNT(*) as c FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'
                UNION ALL
                SELECT COUNT(*) as c FROM citas_whatsapp WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
                UNION ALL
                SELECT COUNT(*) as c FROM citas_facebook_ig WHERE fecha_cita=$1 AND hora=$2 AND status!='cancelada'
            ) as sum_tables
        `;
        const resEmpalme = await client.query(queryConflict, [fecha, hora]);
        if (parseInt(resEmpalme.rows[0].total) > 0) {
            console.log(`🚫 Conflicto de horario detectado en Guardián Multi-Tabla: ${fecha} a las ${hora}`);
            return res.status(409).json({ success: false, message: '¡Uh oh! Ese horario acaba de ser ocupado. Por favor, selecciona una fecha u hora diferente.' });
        }

        console.log("🛠️ Inyectando en DB Neon (Pase Limpio)...");
        // Insert into citas table (match the real Neon structure ONLY)
        const result = await client.query(
            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmada') RETURNING id`,
            [nombre.trim(), email.trim().toLowerCase(), telefono.trim(), preferencia_sesion, fecha, hora]
        );

        console.log("✅ Cita web guardada en BD con ID:", result.rows[0].id);

        // 🚀 Disparar evento a Google Calendar de Forma Sincrónica (Await Obligatorio)
        console.log("⏳ Esperando confirmación de Google Calendar...");
        await agendarEnGoogleCalendar({
            nombre: nombre.trim(),
            correo: email.trim().toLowerCase(),
            telefono: telefono.trim(),
            servicio: preferencia_sesion,
            fecha: fecha,
            hora: hora,
            notas: "Cita agendada desde Landing Page Oficial"
        });

        // ⚡ Retornar respuesta sólo si Google Calendar NO arrojó error
        return res.status(200).json({
            success: true,
            message: `¡Registro exitoso (ID: ${result.rows[0].id})! Godzilla Consulting te enviará información pronto.`
        });

    } catch (error) {
        console.error("❌ Controlador Error (Contact):", error.message);
        return res.status(500).json({
            success: false,
            message: `Error en servidor: ${error.message}`
        });
    } finally {
        client.release();
    }
};
