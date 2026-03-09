import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupTables() {
    const client = await pool.connect();
    try {
        console.log('⏳ Creando tablas en la base de datos Neon...');

        // Tabla citas
        await client.query(`
            CREATE TABLE IF NOT EXISTS citas (
                id SERIAL PRIMARY KEY,
                nombre_completo VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                telefono VARCHAR(50) NOT NULL,
                tipo_sesion VARCHAR(50) NOT NULL,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "citas" creada.');

        // Tabla users
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                ip_address VARCHAR(50),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "users" creada.');

        // Tabla lead_magnets
        await client.query(`
            CREATE TABLE IF NOT EXISTS lead_magnets (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                email_subject VARCHAR(255) NOT NULL,
                email_body TEXT NOT NULL,
                file_url TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "lead_magnets" creada.');

        // Insertar un lead_magnet de prueba si no existe
        await client.query(`
            INSERT INTO lead_magnets (slug, title, email_subject, email_body, file_url)
            VALUES (
                'test-magnet', 
                'Recurso de Prueba', 
                'Aquí tienes tu recurso de prueba 🎁', 
                'Gracias por solicitar nuestro recurso.', 
                'https://godzillaconsulting.ai/recurso.pdf'
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ Datos iniciales de "lead_magnets" insertados.');

        // Tabla downloads
        await client.query(`
            CREATE TABLE IF NOT EXISTS downloads (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                lead_magnet_id INT REFERENCES lead_magnets(id) ON DELETE CASCADE,
                sent BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "downloads" creada.');

        // Tabla leads
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                telefono VARCHAR(50),
                preferencia_sesion VARCHAR(50),
                empresa VARCHAR(255) DEFAULT 'Desconocida',
                status VARCHAR(50) DEFAULT 'Nuevo',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "leads" creada.');

        await client.query(`
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO godzilla_backend;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO godzilla_backend;
        `);
        console.log('✅ Permisos otorgados a godzilla_backend.');
    } catch (err) {
        console.error('❌ Error al crear las tablas:', err);
    } finally {
        client.release();
        process.exit();
    }
}

setupTables();
