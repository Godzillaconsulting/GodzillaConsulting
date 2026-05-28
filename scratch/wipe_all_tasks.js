import pool from '../server/config/db.js';
async function main() {
    try {
        console.log('🗑️ Wiping all tasks from studio_tasks table...');
        const res = await pool.query('DELETE FROM studio_tasks');
        console.log(`✅ Successfully deleted ${res.rowCount} tasks from database.`);
    } catch (err) {
        console.error('❌ Error wiping tasks:', err);
    }
    process.exit(0);
}
main();
