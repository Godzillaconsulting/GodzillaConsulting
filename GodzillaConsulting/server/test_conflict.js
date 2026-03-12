import pool from './config/db.js';

async function testConflict() {
    try {
        const fecha = "2026-03-13";
        const hora1 = "15:00";
        const hora2 = "15:00:00";
        
        let q1 = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2", [fecha, hora1]);
        let q2 = await pool.query("SELECT COUNT(*) FROM citas WHERE fecha=$1 AND hora=$2", [fecha, hora2]);
        
        console.log(`Count for ${hora1}:`, q1.rows[0].count);
        console.log(`Count for ${hora2}:`, q2.rows[0].count);
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testConflict();
