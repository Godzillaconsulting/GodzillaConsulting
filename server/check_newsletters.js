import pool from './config/db.js';

async function check() {
    try {
        const res = await pool.query(`
            SELECT id, 
                   sent_at,
                   DATE(sent_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') as fecha_mexico,
                   DATE(NOW() AT TIME ZONE 'America/Mexico_City') as hoy_mexico,
                   (DATE(sent_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') = DATE(NOW() AT TIME ZONE 'America/Mexico_City')) as coincide_hoy
            FROM newsletters 
            ORDER BY id DESC LIMIT 5
        `);
        console.log("Historial corregido:", JSON.stringify(res.rows, null, 2));

        const checkHoy = await pool.query(`
            SELECT id, subject FROM newsletters 
            WHERE DATE(sent_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') = DATE(NOW() AT TIME ZONE 'America/Mexico_City')
        `);
        console.log("¿Existe boletín para hoy 2 de septiembre?:", checkHoy.rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
