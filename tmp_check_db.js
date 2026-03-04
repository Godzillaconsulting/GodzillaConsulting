import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_9oyPl3rTRqCb@ep-super-firefly-aev3f4b4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require' });

async function check() {
    try {
        const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'citas'");
        console.log('Columns:', r.rows.map(x => x.column_name).join(', '));

        const r2 = await pool.query("SELECT * FROM citas");
        console.log('Rows count:', r2.rowCount);
        if (r2.rowCount > 0) console.log('Top row:', r2.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
