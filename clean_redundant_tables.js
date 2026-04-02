import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔄 Agregando columna "origen" a la tabla "citas"...');
        await client.query('ALTER TABLE citas ADD COLUMN IF NOT EXISTS origen VARCHAR(50) DEFAULT \'web\'');

        console.log('🗑️ Eliminando tablas redundantes...');
        await client.query('DROP TABLE IF EXISTS citas_facebook_ig CASCADE');
        await client.query('DROP TABLE IF EXISTS citas_instagram CASCADE');
        await client.query('DROP TABLE IF EXISTS citas_whatsapp CASCADE');
        await client.query('DROP TABLE IF EXISTS task_comments CASCADE');
        await client.query('DROP TABLE IF EXISTS notifications CASCADE');

        await client.query('COMMIT');
        console.log('✅ Tablas eliminadas y base de datos purgada correctamente.');
        process.exit(0);
    } catch(e) {
        await client.query('ROLLBACK');
        console.error('❌ Error limpiando tablas:', e);
        process.exit(1);
    } finally {
        client.release();
    }
}
cleanTables();
