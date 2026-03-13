import pool, { connectDB } from './config/db.js';

async function setupIGTable() {
    await connectDB();

    const query = `
        CREATE TABLE IF NOT EXISTS citas_instagram (
            id SERIAL PRIMARY KEY,
            username_ig VARCHAR(255) NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            telefono VARCHAR(50) NOT NULL,
            fecha_cita DATE NOT NULL,
            resumen_gemini TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(query);
        console.log("✅ Tabla 'citas_instagram' creada o ya existía.");
    } catch (error) {
        console.error("❌ Error creando tabla 'citas_instagram':", error);
    } finally {
        process.exit();
    }
}

setupIGTable();
