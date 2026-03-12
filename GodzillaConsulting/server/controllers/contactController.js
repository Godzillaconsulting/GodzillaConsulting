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

        // 🛡️ Capa 0: Extracción de IP para Auditoría
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        // 🛡️ Capa 1: Prevención de Spam (Rate Limiting)
        // Solo 1 cita por IP en las últimas 24 horas
        const resSpam = await client.query(
            `SELECT id FROM citas WHERE ip_address = $1 AND fecha_registro >= NOW() - INTERVAL '24 HOURS' LIMIT 1`,
            [clientIp]
        );
        if (resSpam.rowCount > 0) {
            console.log(`🚫 Baneo Anti-Spam activado para IP: ${clientIp}`);
            return res.status(429).json({ success: false, message: 'Has excedido el límite de citas (1 por día). Intenta de nuevo mañana.' });
        }

        // 🛡️ Capa 2: Bloqueo de Correos Duplicados (Unique Constraint Lógico)
        // Evita que la misma persona agende 10 veces seguidas o envíe basura
        const resEmail = await client.query(
            `SELECT id FROM citas WHERE email = $1 LIMIT 1`,
            [email.trim().toLowerCase()]
        );
        if (resEmail.rowCount > 0) {
            console.log(`🚫 Intento de correo duplicado detectado: ${email}`);
            return res.status(400).json({ success: false, message: 'Este correo ya tiene una cita registrada en el sistema. Si necesitas reprogramar, contáctanos.' });
        }

        // 🛡️ Capa 3: Prevención de Doble Empalme de Agenda (Double Booking)
        // Verifica si ya existe otra cita activa en la misma fecha y hora exacta
        const resEmpalme = await client.query(
            `SELECT id FROM citas WHERE fecha = $1 AND hora = $2 AND status != 'cancelada' LIMIT 1`,
            [fecha, hora]
        );
        if (resEmpalme.rowCount > 0) {
            console.log(`🚫 Conflicto de horario detectado: ${fecha} a las ${hora}`);
            return res.status(409).json({ success: false, message: '¡Uh oh! Ese horario acaba de ser ocupado. Por favor, selecciona una fecha u hora diferente.' });
        }

        console.log("🛠️ Inyectando en DB Neon (Pase Limpio)...");
        // Insert into citas table (match the real Neon structure WITH ip_address)
        const result = await client.query(
            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, status, ip_address) 
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmada', $7) RETURNING id`,
            [nombre.trim(), email.trim().toLowerCase(), telefono.trim(), preferencia_sesion, fecha, hora, clientIp]
        );

        console.log("✅ Cita guardada en BD con ID:", result.rows[0].id);

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
