import pool from '../config/db.js';

export const processContactForm = async (req, res) => {
    const client = await pool.connect();
    try {
        const { nombre, email, telefono, preferencia_sesion, fecha, hora } = req.body;

        if (!nombre || !email || !telefono || !preferencia_sesion || !fecha || !hora) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }

        // Insert into citas table (match the real Neon structure)
        await client.query(
            `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [nombre.trim(), email.trim().toLowerCase(), telefono.trim(), preferencia_sesion, fecha, hora]
        );

        // Opcional: Podrías hacer un UPDATE si el correo ya existe, pero la instrucción pide DO NOTHING.

        return res.status(200).json({
            success: true,
            message: '¡Registro exitoso! Godzilla Consulting te enviará información pronto.'
        });

    } catch (error) {
        console.error("❌ Controlador Error (Contact):", error.message);
        return res.status(500).json({
            success: false,
            message: 'Ha ocurrido un problema al registrar la cita. Intenta más tarde.'
        });
    } finally {
        client.release();
    }
};
