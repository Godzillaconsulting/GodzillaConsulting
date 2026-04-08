import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
const connectionString = process.env.DATABASE_URL;;

async function initLeads() {
    const pool = new Client({ connectionString });
    try {
        await pool.connect();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                telefono VARCHAR(50),
                preferencia_sesion VARCHAR(50),
                empresa VARCHAR(255) DEFAULT 'BDX Performance',
                status VARCHAR(50) DEFAULT 'Nuevo',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        // We might also just ALTER the existing table to add them in case it was created already.
        try {
            await pool.query('ALTER TABLE leads ADD COLUMN telefono VARCHAR(50);');
        } catch (e) { }
        try {
            await pool.query('ALTER TABLE leads ADD COLUMN preferencia_sesion VARCHAR(50);');
        } catch (e) { }


        // Dar permisos al rol del backend
        await pool.query('GRANT SELECT, INSERT ON leads TO godzilla_backend;');

        console.log('✅ Tabla leads creada y permisos otorgados.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

initLeads();
