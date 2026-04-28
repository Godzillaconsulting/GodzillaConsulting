import pool, { connectDB } from './server/config/db.js';

async function run() {
    await connectDB();
    const res = await pool.query('SELECT id, name, nodes FROM automation_flow');
    for (const row of res.rows) {
        let nodes = typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes;
        if (!nodes) continue;
        
        for (const n of nodes) {
            if (n.title === 'Reloj / Cron' || n.title === 'Bot Newsletter') {
                console.log(`Flujo: ${row.name} | Nodo: ${n.title} | ID: ${n.id} | Config:`, n.config);
            }
        }
    }
    console.log("Terminado.");
    process.exit(0);
}
run().catch(console.error);
