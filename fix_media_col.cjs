const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

Promise.all([
  p.query(`ALTER TABLE media_storage ADD COLUMN IF NOT EXISTS size BIGINT DEFAULT 0`),
  p.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='media_storage' ORDER BY ordinal_position`)
]).then(([alter, cols]) => {
  console.log('✅ Columnas de media_storage:', cols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));
  p.end();
}).catch(e => { console.error('ERR:', e.message); p.end(); });
