import pool from './server/config/db.js';

async function check() {
  try {
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'media_storage'
    `);
    console.log('Columns:', JSON.stringify(tableInfo.rows, null, 2));

    const dbSize = await pool.query(`SELECT pg_database_size(current_database()) as size, pg_size_pretty(pg_database_size(current_database())) as pretty`);
    console.log('DB size:', dbSize.rows[0]);

    const count = await pool.query(`SELECT COUNT(*) as total, pg_size_pretty(COALESCE(SUM(length(file_data)),0)) as total_size FROM media_storage`);
    console.log('Media storage:', count.rows[0]);

    // Verificar límite de Postgres
    const maxConn = await pool.query(`SHOW max_connections`);
    console.log('Max connections:', maxConn.rows[0]);

  } catch(e) {
    console.error('Error:', e.message, e.code);
  }
  process.exit(0);
}
check();
