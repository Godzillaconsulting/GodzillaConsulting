import pool from './server/config/db.js';
pool.query("SELECT id, status, media_payload FROM studio_tasks WHERE id = 31").then(res => {
    const row = res.rows[0];
    const payload = typeof row.media_payload === 'string' ? JSON.parse(row.media_payload) : row.media_payload;
    console.log("Status:", row.status);
    console.log("URLs:", payload.map(x => x.url));
    process.exit(0);
});
