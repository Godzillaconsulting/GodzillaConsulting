import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS chats_redes (
    id SERIAL PRIMARY KEY,
    sender_id VARCHAR(100) NOT NULL,
    plataforma VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chats_redes_sender ON chats_redes(sender_id);
CREATE INDEX IF NOT EXISTS idx_chats_redes_created ON chats_redes(created_at);
`;

pool.query(sql)
    .then(() => {
        console.log('✅ Tabla chats_redes creada/verificada correctamente con índices.');
        pool.end();
    })
    .catch(e => {
        console.error('❌ Error creando tabla:', e.message);
        pool.end();
    });
