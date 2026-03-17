import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let connectionString =
    process.env.NODE_ENV === 'development' && process.env.DATABASE_URL_DEV
        ? process.env.DATABASE_URL_DEV
        : process.env.DATABASE_URL;

// Requerido por Meta para conexiones seguras sin certificados autofirmados
if (connectionString && !connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=verify-full';
}

const isNeon = connectionString && connectionString.includes('neon.tech');

const pool = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: true } : false,
    // Optimizado para Vercel Serverless + Neon PgBouncer y evitar Timeouts largos
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});

// Verificación de conexión
export const connectDB = async () => {
    try {
        console.log('⏳ Intentando conectar a PostgreSQL (Vercel Node ENV:', process.env.NODE_ENV, ')...');
        const client = await pool.connect();
        console.log('✅ PostgreSQL Conectado a Neon');
        client.release();

        // -------------------------------------------------------------
        // DEVOPS RECOVERY: HEARTBEAT KEEP-ALIVE PARA NEON
        // -------------------------------------------------------------
        // Evita que la DB en Neon Postgres Serverless cierre la conexión
        // si el bot no inyecta citas en minutos. (Solo en PM2 o Local, Nunca en Vercel Serverless).
        const isLocalOrPM2 = process.env.NODE_ENV === 'development' || process.env.IS_PM2 === 'true';

        if (isLocalOrPM2) {
            setInterval(async () => {
                try {
                    const beat = await pool.connect();
                    await beat.query('SELECT 1');
                    beat.release();
                    console.log('💓 [DB Heartbeat] Teniendo viva la conexión de Neon...');
                } catch (errHeart) {
                    console.error('💔 [DB Heartbeat Error] Neon se desconectó momentáneamente:', errHeart.message);
                }
            }, 4.5 * 60 * 1000); // Latido cada 4.5 minutos
        }
        
    } catch (error) {
        console.error(`❌ Error en PostgreSQL: ${error.message} | URL usada: ${connectionString ? 'SI' : 'NO'}`);
        // NEVER use process.exit(1) in a serverless function!
        // It brings down the entire sandbox and returns a hard Vercel 500 error.
    }
};

export default pool;

