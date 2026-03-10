import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS sesiones_chat (
    id_usuario_red TEXT PRIMARY KEY,
    historial_mensajes JSONB DEFAULT '[]'::jsonb,
    resumen_contexto TEXT DEFAULT '',
    ultima_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sesiones_chat_actualizacion ON sesiones_chat(ultima_actualizacion);
`;

pool.query(sql)
    .then(() => {
        console.log('✅ Tabla sesiones_chat creada/verificada correctamente.');
        pool.end();
    })
    .catch(e => {
        console.error('❌ Error creando tabla sesiones_chat:', e.message);
        pool.end();
    });
