import pg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res3 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'media_storage'");
        console.log("Columnas en media_storage:");
        res3.rows.forEach(r => console.log(r.column_name));
        // Test frontend fetch
        const token = jwt.sign(
            { id: 1, username: 'JareG', role: 'superadmin' },
            process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#',
            { expiresIn: '365d' }
        );

        console.log("Token generado");
        const fetch = (await import('node-fetch')).default;
        const apiRes = await fetch('http://127.0.0.1:3000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Status:", apiRes.status);
        const data = await apiRes.json();
        console.log("Respuesta FETCH:", data);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
