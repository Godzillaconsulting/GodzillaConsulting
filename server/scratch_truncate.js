import pool from './config/db.js';

async function check() {
    try {
        await pool.query(`TRUNCATE TABLE studio_tasks RESTART IDENTITY CASCADE`);
        console.log("DB TRUNCADA.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
