import pool, { connectDB } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function addPlataformaColumn() {
    try {
        await connectDB();
        console.log('🚧 Añadiendo columna `plataforma` a `sesiones_chat`...');

        await pool.query(`
            ALTER TABLE sesiones_chat 
            ADD COLUMN IF NOT EXISTS plataforma VARCHAR(50) DEFAULT 'desconocida';
        `);

        console.log('✅ Columna `plataforma` añadida correctamente o ya existía.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal al alterar la tabla `sesiones_chat`:', error);
        process.exit(1);
    }
}

addPlataformaColumn();
