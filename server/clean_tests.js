import pool from './config/db.js';

async function run() {
    try {
        const res = await pool.query("DELETE FROM citas WHERE email LIKE '%test%' OR nombre_completo LIKE '%test%' OR nombre_completo LIKE '%Test%';");
        console.log(`Borrados ${res.rowCount} registros de prueba.`);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
