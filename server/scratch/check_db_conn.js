import pool, { connectDB } from '../config/db.js';

async function main() {
    await connectDB();
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Query result:', res.rows);
    } catch (e) {
        console.error('Query error:', e);
    } finally {
        await pool.end();
    }
}
main();
