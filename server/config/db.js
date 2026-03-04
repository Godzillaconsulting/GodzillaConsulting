import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isNeon = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isNeon ? {
        rejectUnauthorized: false,
    } : false
});

// Verificación de conexión
export const connectDB = async () => {
    try {
        console.log('⏳ Intentando conectar a PostgreSQL...');
        const client = await pool.connect();
        console.log('✅ PostgreSQL Conectado a Neon');
        client.release();
    } catch (error) {
        console.error(`❌ Error en PostgreSQL: ${error.message}`);
        process.exit(1);
    }
};

export default pool;

