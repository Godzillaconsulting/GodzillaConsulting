import pool from '../server/config/db.js';

async function runPatch() {
    try {
        await pool.query(`ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS event_data JSONB;`);
        console.log('✅ Added column event_data');
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
runPatch();
