import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function fixSize() {
    try {
        await pool.query('ALTER TABLE media_storage ADD COLUMN size BIGINT DEFAULT 0;');
        console.log("Column 'size' added");
    } catch(e) {
        if(e.message.includes("already exists")) console.log("Size exists already");
        else console.error(e);
    }
    await pool.end();
}
fixSize();
