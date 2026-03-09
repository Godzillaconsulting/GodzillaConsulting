import pg from 'pg';
const { Pool } = pg;
const connectionString = 'postgresql://neondb_owner:npg_9oyPl3rTRqCb@ep-super-firefly-aev3f4b4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });

async function check() {
    try {
        const r = await pool.query("SELECT current_database(), current_schema(), inet_server_addr(), inet_server_port()");
        console.log('Result:', r.rows[0]);

        const r2 = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', r2.rows.map(x => x.table_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
