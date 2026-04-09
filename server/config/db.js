import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const connectionString =
    process.env.NODE_ENV === 'development' && process.env.DATABASE_URL_DEV
        ? process.env.DATABASE_URL_DEV
        : process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    // Optimizado para Local PostgreSQL
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
});

// Verificación de conexión
export const connectDB = async () => {
    try {
        console.log('⏳ Intentando conectar a PostgreSQL (Node ENV:', process.env.NODE_ENV, ')...');
        const client = await pool.connect();
        console.log('✅ PostgreSQL Local Conectado');
        client.release();
    } catch (error) {
        console.error(`❌ Error en PostgreSQL: ${error.message} | URL usada: ${connectionString ? 'SI' : 'NO'}`);
        // NEVER use process.exit(1) in a serverless function!
        // It brings down the entire sandbox and returns a hard Vercel 500 error.
    }
};

export default pool;

