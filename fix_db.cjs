const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });
pool.query('ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS subject VARCHAR(255)')
  .then(() => { console.log('DB Actualizada'); pool.end(); })
  .catch(console.error);
