import pool from './server/config/db.js';
(async () => {
  try {
    await pool.query('DELETE FROM global_locales');
    console.log('CACHE WIPED');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
