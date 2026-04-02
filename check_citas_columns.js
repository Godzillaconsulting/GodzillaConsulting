import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'citas';
        `);
        console.log("Columnas de 'citas':", res.rows.map(r => r.column_name).join(', '));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
checkColumns();
