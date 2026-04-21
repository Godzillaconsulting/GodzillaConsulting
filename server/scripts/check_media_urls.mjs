import pool from '../config/db.js';

const r = await pool.query(`
    SELECT id, status, media_payload::text as mp
    FROM studio_tasks
    WHERE media_payload IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
`);

console.log('=== MEDIA URLs EN DB ===');
for (const row of r.rows) {
    try {
        const mp = JSON.parse(row.mp);
        const arr = Array.isArray(mp) ? mp : [mp];
        for (const item of arr) {
            console.log(`ID ${row.id} [${row.status}] -> url: "${item?.url}"`);
        }
    } catch (e) {
        console.log(`ID ${row.id} -> ERROR parseando: ${row.mp?.substring(0, 100)}`);
    }
}

await pool.end();
process.exit(0);
