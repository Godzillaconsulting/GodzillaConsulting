import pool from './server/config/db.js';

async function check() {
    try {
        console.log("Database Host:", pool.options.host, "Port:", pool.options.port, "Database:", pool.options.database);
        const res = await pool.query(
            `SELECT id, status, title, media_payload, created_at, updated_at FROM studio_tasks ORDER BY id DESC LIMIT 5`
        );
        console.log("Studio Tasks count:", res.rowCount);
        for (const row of res.rows) {
            console.log(`ID: ${row.id} | Status: ${row.status} | Title: ${row.title}`);
            console.log(`Payload:`, JSON.stringify(row.media_payload));
            console.log(`Created: ${row.created_at} | Updated: ${row.updated_at}`);
            console.log("-----------------------------------------");
        }
    } catch (dbErr) {
        console.error("FAIL:", dbErr.message);
    } finally {
        process.exit(0);
    }
}
check();
