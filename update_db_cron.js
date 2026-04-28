import pool, { connectDB } from './server/config/db.js';

async function run() {
    await connectDB();
    const res = await pool.query('SELECT id, name, nodes, edges FROM automation_flow');
    for (const row of res.rows) {
        let changed = false;
        let nodes = typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes;
        let edges = typeof row.edges === 'string' ? JSON.parse(row.edges) : row.edges;
        if (!nodes || !edges) continue;
        
        // Find newsletter bot nodes
        const newsletterNodes = nodes.filter(n => n.title === 'Bot Newsletter');
        if (newsletterNodes.length === 0) continue;
        
        for (const nn of newsletterNodes) {
            // Find edges targeting this node
            const connectedEdges = edges.filter(e => e.target === nn.id);
            for (const ce of connectedEdges) {
                // Find source node
                const sourceNode = nodes.find(n => n.id === ce.source);
                if (sourceNode && sourceNode.title === 'Reloj / Cron') {
                    if (sourceNode.config && sourceNode.config.cron) {
                        console.log(`Cambiando cron de ${sourceNode.config.cron} a every_day_8 en el flujo ${row.name}`);
                        sourceNode.config.cron = 'every_day_8';
                        changed = true;
                    }
                }
            }
        }
        
        if (changed) {
            await pool.query('UPDATE automation_flow SET nodes = $1 WHERE id = $2', [JSON.stringify(nodes), row.id]);
            console.log(`✅ Flujo ${row.name} actualizado.`);
        }
    }
    console.log("Terminado.");
    process.exit(0);
}
run().catch(console.error);
