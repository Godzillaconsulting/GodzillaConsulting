import pool, { connectDB } from './server/config/db.js';

async function run() {
    await connectDB();
    const res = await pool.query('SELECT id, name, nodes, edges FROM automation_flow');
    for (const row of res.rows) {
        let changed = false;
        let nodes = typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes;
        if (!nodes) continue;
        
        for (let i=0; i<nodes.length; i++) {
            // Buscamos un nodo cron que esté conectado al Newsletter o si hay algún Reloj/Cron, lo miramos.
            if (nodes[i].title === 'Reloj / Cron') {
                if (nodes[i].config && nodes[i].config.cron) {
                    if (nodes[i].config.cron === 'every_day_9') {
                        // Change it to 8! Or we can just change the one that connects to Newsletter Bot
                        // Wait, what if there are other crons for 9 AM?
                        // Let's check connections!
                    }
                }
            }
        }
    }
}
run();
