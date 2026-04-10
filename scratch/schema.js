import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
    const res = await pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('social_queue', 'studio_tasks')`);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit();
}
checkSchema();
