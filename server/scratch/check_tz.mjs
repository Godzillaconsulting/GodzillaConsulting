import pool from '../config/db.js';

async function checkDates() {
    const res = await pool.query(`
        SELECT id, created_at, sent_at, 
               DATE(sent_at AT TIME ZONE 'America/Mexico_City') as cdmx_date, 
               DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City') as today_cdmx 
        FROM newsletters 
        ORDER BY id DESC LIMIT 5
    `);
    console.log(res.rows);
    process.exit(0);
}
checkDates();
