import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function check() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables:", tables.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
