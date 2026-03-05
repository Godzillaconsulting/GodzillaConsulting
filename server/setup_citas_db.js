import pool, { connectDB } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function initCitasTable() {
    try {
        await connectDB();

        console.log('🚧 Iniciando creación de tabla de citas...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS citas (
                id SERIAL PRIMARY KEY,
                nombre_completo VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                telefono VARCHAR(50),
                tipo_sesion VARCHAR(255) NOT NULL,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                status VARCHAR(50) DEFAULT 'confirmada',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Tabla `citas` creada correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal al crear la tabla `citas`:', error);
        process.exit(1);
    }
}

initCitasTable();
