import pool from './config/db.js';

async function testConflictFull() {
    try {
        const fecha = "2026-03-13";
        const hora = "15:00";
        
        const q = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2 AND status!='cancelada'", [fecha, hora]);
        console.log("Full Conflict Check Count:", q.rows[0].count);
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testConflictFull();
