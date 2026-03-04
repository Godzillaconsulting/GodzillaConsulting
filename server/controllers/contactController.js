import pool from '../config/db.js';

export const processContactForm = async (req, res) => {
    const client = await pool.connect();
    try {
        console.log("📩 Recibiendo solicitud de Cita:", req.body);
        const { nombre, email, telefono, preferencia_sesion, fecha, hora } = req.body;

        if (!nombre || !email || !telefono || !preferencia_sesion || !fecha || !hora) {
            console.log("⚠️ Validación fallida: Faltan campos obligatorios.");
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }

        console.log("🛠️ Insertando en DB...");
        // Insert into citas table (match the real Neon structure)
        const result = await client.query(
            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [nombre.trim(), email.trim().toLowerCase(), telefono.trim(), preferencia_sesion, fecha, hora]
        );

        console.log("✅ Cita guardada con ID:", result.rows[0].id);

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
