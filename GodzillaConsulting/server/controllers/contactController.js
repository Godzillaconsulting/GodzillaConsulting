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

        // 🛡️ Capa 1.5: Guardian de Fecha Pasada / Fuera de Horario / Domingo
        const now = new Date();
        const sysDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chihuahua', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const sysTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chihuahua', hour: '2-digit', minute: '2-digit' }).format(now);
        
        const safeDateString = `${fecha}T12:00:00`;
        const dateObjDay = new Date(safeDateString);
        const isSunday = dateObjDay.getDay() === 0;
        const hourInt = parseInt(hora.split(':')[0], 10);

        if (fecha < sysDate || (fecha === sysDate && hora <= sysTime)) {
             console.warn(`⚠️ [Cita Rechazada por Guardián]: Fecha pasada ${fecha} ${hora}`);
             return res.status(400).json({ success: false, message: `No es posible agendar en el pasado (Hoy es ${sysDate} ${sysTime}). Selecciona una fecha válida a futuro.` });
        } else if (isSunday || hourInt < 9 || hourInt >= 19) {
             console.warn(`⚠️ [Cita Rechazada por Guardián]: Fuera de horario o Domingo ${fecha} ${hora}`);
             return res.status(400).json({ success: false, message: 'Intento de agendar fuera de horario o en domingo. El horario de oficina es de 9:00 AM a 7:00 PM.' });
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

        // 🚀 🛡️ Transacción Atómica All-or-Nothing (Google Calendar Primero)
        console.log("⏳ Intentando agendar en Google Calendar PRIMERO...");
        let calendarId;
        try {
            calendarId = await agendarEnGoogleCalendar({
                nombre: nombre.trim(),
                correo: email.trim().toLowerCase(),
                telefono: telefono.trim(),
                servicio: preferencia_sesion,
                fecha: fecha,
                hora: hora,
                notas: "Cita agendada desde Landing Page Oficial"
            });
            console.log("✅ Google Calendar confirmó! ID:", calendarId);
        } catch (calErr) {
            console.error("❌ Google Calendar rechazó la solicitud:", calErr.message);
            return res.status(500).json({ success: false, message: 'El sistema de calendario rechazó el horario. Por favor intenta de nuevo.' });
        }

        console.log("🛠️ Inyectando en DB Neon (Pase Limpio con Calendar ID)...");
        // Insert into citas table (match the real Neon structure)
        const result = await client.query(
            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, status, google_calendar_id) 
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmada', $7) RETURNING id`,
            [nombre.trim(), email.trim().toLowerCase(), telefono.trim(), preferencia_sesion, fecha, hora, calendarId]
        );

        console.log("✅ Cita web guardada en BD con ID:", result.rows[0].id);

        // ⚡ Retornar respuesta sólo si Google Calendar y base de datos fueron exitosos
        return res.status(200).json({
            success: true,
            message: `¡Registro exitoso! Ya estás en nuestra agenda.`
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
