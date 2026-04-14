import process from 'process';
import pool from '../server/config/db.js';

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS security_alerts (
                id SERIAL PRIMARY KEY,
                attempt_type VARCHAR(100) NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                username VARCHAR(100),
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabla security_alerts creada o ya existente.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
