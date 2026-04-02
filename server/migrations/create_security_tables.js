// Script para crear las tablas de seguridad necesarias en PostgreSQL
// Ejecutar: node server/migrations/create_security_tables.js

import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

async function createSecurityTables() {
    console.log('🔐 Creando tablas de seguridad...');

    try {
        // Tabla de intento de login (audit log)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                username VARCHAR(60) NOT NULL,
                ip_address VARCHAR(64) NOT NULL,
                attempted_at TIMESTAMPTZ DEFAULT NOW(),
                success BOOLEAN DEFAULT FALSE,
                user_agent TEXT
            );
        `);
        console.log('✅ Tabla login_attempts creada/verificada.');

        // Índice para buscar por IP rápido
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts (ip_address, attempted_at);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_login_username ON login_attempts (username, attempted_at);
        `);
        console.log('✅ Índices creados.');

        // Columna is_locked en admins (si no existe)
        await pool.query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'user';
        `);
        console.log('✅ Columnas de seguridad añadidas a admins.');

        // Limpiar intentos viejos automáticamente (cleanup)
        await pool.query(`
            DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
        `);
        console.log('✅ Registros viejos limpiados.');

        console.log('🔐 Todas las tablas de seguridad están listas.');
    } catch (err) {
        console.error('❌ Error creando tablas:', err.message);
    } finally {
        process.exit(0);
    }
}

createSecurityTables();
