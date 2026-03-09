import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_9oyPl3rTRqCb@ep-super-firefly-aev3f4b4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require' });

async function check() {
    try {
        const r = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'citas'");
        r.rows.forEach(row => console.log(`${row.column_name}: ${row.is_nullable}`));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
