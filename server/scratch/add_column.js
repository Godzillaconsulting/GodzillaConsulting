import pool from './config/db.js';

async function updateDB() {
    try {
        await pool.query('ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
        console.log('Column created_at added successfully');
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        process.exit(0);
    }
}
updateDB();
