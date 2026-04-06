import pool from './server/config/db.js';

async function run() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS it_bugs (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                priority VARCHAR(50) DEFAULT 'media',
                screenshot_url TEXT,
                reporter_username VARCHAR(100),
                path_url TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                resolved_at TIMESTAMPTZ,
                resolved_by VARCHAR(100)
            );
        `);
        console.log("Tabla it_bugs creada o verificada exitosamente.");
    } catch(e) {
        console.error("Error creating table: ", e);
    } finally {
        process.exit(0);
    }
}
run();
