import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_3vJ9zkfNMgOt@ep-summer-thunder-ak5f71ru-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function setup() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('🔗 Conectado a Neon PostgreSQL con la URL de Producción...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS pixel_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id VARCHAR(255),
                event_name VARCHAR(255) NOT NULL,
                event_data JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla pixel_events creada o ya existía.');
        
        try {
            await client.query('GRANT SELECT, INSERT, UPDATE ON pixel_events TO godzilla_backend;');
        } catch(e) {}
        
    } catch (err) {
        console.error('❌ Error creando pixel_events:', err);
    } finally {
        await client.end();
        process.exit();
    }
}

setup();
