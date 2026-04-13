/**
 * Migration: Crear tabla calendar_events para el Calendario Colaborativo en Tiempo Real
 * Ejecutar: node server/migrations/create_calendar_events.js
 */
import { connectDB } from '../config/db.js';
import pool from '../config/db.js';

async function migrate() {
    await connectDB();

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id              SERIAL PRIMARY KEY,
                title           TEXT NOT NULL,
                platform        VARCHAR(20) DEFAULT 'ALL',
                status          VARCHAR(20) DEFAULT 'warning',
                caption         TEXT,
                media_url       TEXT,
                provider        TEXT,
                start_date      TIMESTAMPTZ NOT NULL,
                end_date        TIMESTAMPTZ,
                empresa         VARCHAR(50) DEFAULT 'godzilla',
                assigned_to     VARCHAR(50),
                created_by      VARCHAR(50),
                comments        JSONB DEFAULT '[]',
                is_rescheduled  BOOLEAN DEFAULT FALSE,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        
        // Index para queries frecuentes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_platform ON calendar_events(platform);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_empresa ON calendar_events(empresa);
        `);

        console.log('✅ Tabla calendar_events creada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en migración:', err.message);
        process.exit(1);
    }
}

migrate();
