import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log("Limpiando DB para producción...");
        await pool.query('DELETE FROM studio_tasks;');
        console.log("✔️  studio_tasks limpiado.");
        await pool.query("DELETE FROM citas WHERE email LIKE '%test%' OR nombre_completo LIKE '%test%' OR nombre_completo LIKE '%Test%';");
        console.log("✔️  citas mockeadas limpiadas.");
        console.log("Limpieza exitosa.");
        process.exit(0);
    } catch(e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

run();
