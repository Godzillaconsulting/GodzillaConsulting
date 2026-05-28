import pool, { connectDB } from '../server/config/db.js';

async function run() {
    await connectDB();
    const res = await pool.query('SELECT id, name, nodes, edges FROM automation_flow WHERE id IN (3, 4)');
    for (const row of res.rows) {
        console.log(`\n==================================================`);
        console.log(`Flow ID: ${row.id} | Name: ${row.name}`);
        console.log(`==================================================`);
        
        let nodes = typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes;
        let edges = typeof row.edges === 'string' ? JSON.parse(row.edges) : row.edges;
        
        console.log("NODES:");
        for (const n of nodes) {
            console.log(`  - ID: ${n.id} | Title: "${n.title}" | PresetName: "${n.presetName}" | Type: "${n.type}" | Config:`, JSON.stringify(n.config));
        }
        
        console.log("\nEDGES:");
        for (const e of edges) {
            console.log(`  - Source: ${e.source} -> Target: ${e.target}`);
        }
    }
    process.exit(0);
}
run().catch(console.error);
