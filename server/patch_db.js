import pool from './config/db.js';

async function applyDbPatch() {
    console.log("Iniciando limpieza y parche de DB...");
    try {
        // 1. Truncate tables to remove hardcoded/mocked tasks
        console.log("Borrando tareas y memoria vieja...");
        await pool.query(`TRUNCATE TABLE studio_tasks RESTART IDENTITY CASCADE`);
        await pool.query(`TRUNCATE TABLE goyi_learning RESTART IDENTITY CASCADE`);
        console.log("Tablas vaciadas correctamente.");

        // 2. Add username column to goyi_learning
        console.log("Agregando columna username a goyi_learning...");
        await pool.query(`ALTER TABLE goyi_learning ADD COLUMN IF NOT EXISTS username VARCHAR(255) DEFAULT 'admin'`);
        
        console.log("Parche aplicado con éxito.");
    } catch (error) {
        console.error("Error aplicando parche:", error);
    } finally {
        pool.end();
    }
}

applyDbPatch();
