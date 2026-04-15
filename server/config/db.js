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

const isNeon = connectionString && connectionString.includes('neon.tech');

const pool = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : false,
    max: 50,                               // Aumentado a 50 para soportar MultiTenant y bots en paralelo
    idleTimeoutMillis: 30_000,             // 30s 
    connectionTimeoutMillis: 15_000,       // 15s para permitir que Neon.tech levante de Cold Start
    allowExitOnIdle: false,
    keepAlive: true,                       // Previene cortes TCP silenciosos del OS
    keepAliveInitialDelayMillis: 10_000,
});

// Previene UnhandledRejection si un cliente idle muere
pool.on('error', (err) => {
    console.error('[DB Pool] Cliente idle falló (reconectando automáticamente):', err.message);
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

