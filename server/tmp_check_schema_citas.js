import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'citas'
            ORDER BY ordinal_position;
        `);
        console.log('Columns in "citas" table:');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
checkSchema();
