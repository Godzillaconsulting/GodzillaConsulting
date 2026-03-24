require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT open_id, access_token, refresh_token FROM tiktok_tokens ORDER BY updated_at DESC LIMIT 1')
  .then(r => {
    if (!r.rows.length) { console.log('NO_TOKENS'); process.exit(1); }
    const t = r.rows[0];
    console.log('TIKTOK_OPEN_ID=' + t.open_id);
    console.log('TIKTOK_ACCESS_TOKEN=' + t.access_token);
    console.log('TIKTOK_REFRESH_TOKEN=' + t.refresh_token);
    pool.end();
  })
  .catch(e => { console.error('ERROR: ' + e.message); pool.end(); process.exit(1); });
