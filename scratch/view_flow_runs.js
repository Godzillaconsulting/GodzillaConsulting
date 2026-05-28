import pool, { connectDB } from '../server/config/db.js';

async function run() {
    await connectDB();
    const res = await pool.query('SELECT id, flow_id, status, source, started_at, finished_at, duration_ms, log FROM flow_runs ORDER BY started_at DESC LIMIT 15');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
run().catch(console.error);
