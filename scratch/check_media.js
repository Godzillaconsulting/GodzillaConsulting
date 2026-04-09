import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function checkMedia() {
    try {
        const res = await pool.query('SELECT COUNT(*) FROM media_storage');
        console.log("Media Count:", res.rows[0].count);
        
        const fs = await import('fs');
        const diskFiles = fs.readdirSync('E:/assets');
        console.log("Disk files in E:/assets:", diskFiles.length);
    } catch(e) {
        console.error(e);
    }
    await pool.end();
}
checkMedia();
