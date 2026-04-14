import pool from '../server/config/db.js';
import { enqueueNewsletter } from '../server/services/emailQueue.js';

async function testNL() {
    try {
        console.log("Insertando suscriptor falso...");
        await pool.query(`INSERT INTO subscribers (email, name, status) VALUES ('info@godzillaconsulting.ai', 'GodzillaTest', 'active') ON CONFLICT (email) DO UPDATE SET status='active';`);
        
        console.log("Creando newsletter de prueba...");
        const res = await pool.query(`INSERT INTO newsletters (subject, body_html) VALUES ('Boletín de Prueba 🦖', '<p>Hola, esto es una prueba del boletín después de corregir la Base de Datos.</p>') RETURNING id;`);
        const nlId = res.rows[0].id;
        
        console.log(`Encolando newsletter ID ${nlId}...`);
        const total = await enqueueNewsletter(nlId);
        console.log(`Encolados ${total} destinatarios. Esperando 5 segundos para que procese...`);
        
        await new Promise(r => setTimeout(r, 5000));
        
        const qlog = await pool.query(`SELECT * FROM queue_log WHERE newsletter_id = $1`, [nlId]);
        console.log("\n--- Estado de Queue Log ---");
        console.table(qlog.rows.map(r => ({ id: r.id, email: r.subscriber_email, status: r.status, attempts: r.attempts, error_msg: r.error_msg?.substring(0, 50) })));

    } catch(err) {
        console.error("Error en test:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
testNL();
