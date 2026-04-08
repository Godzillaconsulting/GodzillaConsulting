import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

// Try to use the env string or the fallback one from other scripts
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
const connectionString = process.env.DATABASE_URL;

async function setupAnalyticsDB() {
    const pool = new Client({ connectionString });
    try {
        await pool.connect();
        console.log('🔗 Conectado a Neon PostgreSQL...');

        // 1. ALTER LEADS TABLE
        console.log('🔄 Actualizando tabla leads con UTMs...');
        const columnsToAdd = [
            'utm_source VARCHAR(255)',
            'utm_medium VARCHAR(255)',
            'utm_campaign VARCHAR(255)',
            'click_id VARCHAR(255)'
        ];

        for (const col of columnsToAdd) {
            try {
                await pool.query(`ALTER TABLE leads ADD COLUMN ${col};`);
                console.log(`✅ Columna ${col.split(' ')[0]} añadida.`);
            } catch (err) {
                // Ignore if it already exists
                if (err.code !== '42701') console.warn(`⚠️ Warning en columna ${col}:`, err.message);
            }
        }

        // 2. CREATE PAGE_VIEWS TABLE
        console.log('🔄 Creando tabla page_views...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS page_views (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id VARCHAR(255) NOT NULL,
                url VARCHAR(2048) NOT NULL,
                utm_source VARCHAR(255),
                utm_medium VARCHAR(255),
                utm_campaign VARCHAR(255),
                duration_seconds INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla page_views creada.');

        // 3. CREATE VIDEO_RETENTION TABLE
        console.log('🔄 Creando tabla video_retention...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS video_retention (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id VARCHAR(255) NOT NULL,
                video_id VARCHAR(255) NOT NULL,
                max_percentage_watched INT DEFAULT 0, -- 0, 25, 50, 75, 100
                drop_off_second INT DEFAULT 0,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla video_retention creada.');

        // 4. GRANT PERMISSIONS (Assuming 'godzilla_backend' role exists, like in create_leads_table)
        try {
            await pool.query('GRANT SELECT, INSERT, UPDATE ON page_views TO godzilla_backend;');
            await pool.query('GRANT SELECT, INSERT, UPDATE ON video_retention TO godzilla_backend;');
            console.log('✅ Permisos otorgados al rol backend.');
        } catch (e) {
            console.warn('⚠️ No se pudieron otorgar permisos al rol godzilla_backend. Ignorar si no usas roles separados.', e.message);
        }

        console.log('🚀 Finalizado: Arquitectura de Tracking DB Lista.');
    } catch (err) {
        console.error('❌ Error fatal:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

setupAnalyticsDB();
