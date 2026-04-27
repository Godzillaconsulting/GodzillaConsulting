import pool from './server/config/db.js';
async function run() {
    try {
        const ext = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
        console.log('Vector Extension Installed:', ext.rows.length > 0);
        const tbl = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bot_memories')");
        console.log('bot_memories Table Exists:', tbl.rows[0].exists);
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        process.exit(0);
    }
}
run();
