require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function createMemoryTable() {
    console.log('⏳ Creando tabla de memoria de usuario (user_memory)...');
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_memory (
                id SERIAL PRIMARY KEY,
                platform_id VARCHAR(255) UNIQUE NOT NULL,
                personalidad TEXT DEFAULT '',
                intereses TEXT DEFAULT '',
                contexto_acumulado JSONB DEFAULT '{}'::jsonb,
                ultima_interaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla user_memory creada con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creando la tabla user_memory:', err);
        process.exit(1);
    }
}

createMemoryTable();
