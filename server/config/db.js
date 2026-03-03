import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Verificación de conexión
export const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL Conectado a Neon');
        client.release();
    } catch (error) {
        console.error(`❌ Error en PostgreSQL: ${error.message}`);
        process.exit(1);
    }
};

export default pool;

