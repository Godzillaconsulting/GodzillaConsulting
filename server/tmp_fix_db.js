import dotenv from 'dotenv';
dotenv.config();

import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function fixDB() {
    try {
        console.log('1. Añadiendo columna is_locked a admins si no existe...');
        await pool.query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
        `);
        console.log('✓ Columna is_locked lista.');

        console.log('2. Creando tabla login_attempts si no existe...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255),
                ip_address VARCHAR(45),
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT FALSE
            );
        `);
        console.log('✓ Tabla login_attempts lista.');

        console.log('3. Reseteando contraseña de cockers a "admin"...');
        const hash = await bcrypt.hash('admin', 10);
        await pool.query('UPDATE admins SET password_hash = $1 WHERE username = $2', [hash, 'cockers']);
        console.log('✓ Contraseña reseteada con éxito.');

    } catch (error) {
        console.error('Error durante ejecución:', error);
    } finally {
        pool.end();
    }
}

fixDB();
