import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function alterCitas() {
    const client = await pool.connect();
    try {
        console.log('⏳ Alterando tabla citas en produccion...');
        await client.query(`
            ALTER TABLE citas
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmada';
        `);
        console.log('✅ Status añadido.');

        // Aplicamos también a DEV
        const poolDev = new Pool({
            connectionString: process.env.DATABASE_URL_DEV,
            ssl: { rejectUnauthorized: false }
        });
        const clientDev = await poolDev.connect();
        await clientDev.query(`
            ALTER TABLE citas
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmada';
        `);
        console.log('✅ Status añadido a DEV.');
        clientDev.release();

    } catch (err) {
        console.error('❌ Error al alterar la tabla:', err);
    } finally {
        client.release();
        process.exit();
    }
}
alterCitas();
