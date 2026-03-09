import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString =
    process.env.NODE_ENV === 'development' && process.env.DATABASE_URL_DEV
        ? process.env.DATABASE_URL_DEV
        : process.env.DATABASE_URL;

const isNeon = connectionString && connectionString.includes('neon.tech');

const pool = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : false,
    // Optimizado para Vercel Serverless + Neon PgBouncer
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
});

// Verificación de conexión
export const connectDB = async () => {
    try {
        console.log('⏳ Intentando conectar a PostgreSQL (Vercel Node ENV:', process.env.NODE_ENV, ')...');
        const client = await pool.connect();
        console.log('✅ PostgreSQL Conectado a Neon');
        client.release();
    } catch (error) {
        console.error(`❌ Error en PostgreSQL: ${error.message} | URL usada: ${connectionString ? 'SI' : 'NO'}`);
        // NEVER use process.exit(1) in a serverless function!
        // It brings down the entire sandbox and returns a hard Vercel 500 error.
    }
};

export default pool;

