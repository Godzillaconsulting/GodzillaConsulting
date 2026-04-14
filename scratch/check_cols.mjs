import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function check() {
  try {
    const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'newsletters'");
    console.table(columns.rows);
  } finally { pool.end(); }
}
check();
