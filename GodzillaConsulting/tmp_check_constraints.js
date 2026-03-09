import pg from 'pg';
const { Pool } = pg;
const connectionString = 'postgresql://neondb_owner:npg_9oyPl3rTRqCb@ep-super-firefly-aev3f4b4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });

async function check() {
    try {
        const r = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'citas';
        `);
        console.log('Constraints:', r.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
