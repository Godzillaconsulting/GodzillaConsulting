import pool from './config/db.js';

async function syncDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sesiones_chat (
                id_usuario_red VARCHAR(100) PRIMARY KEY,
                historial_mensajes JSONB DEFAULT '[]'::jsonb,
                resumen_contexto TEXT,
                ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                plataforma VARCHAR(50) DEFAULT 'whatsapp'
            );
        `);
        console.log("✅ Tabla sesiones_chat creada correctamente.");
    } catch(e) {
         console.error("❌ Error creando tabla:", e);
    } finally {
         pool.end();
    }
}
syncDb();
