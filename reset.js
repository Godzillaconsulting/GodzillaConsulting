import pool from './server/config/db.js';
async function reset() {
  await pool.query("UPDATE newsletters SET status = 'draft' WHERE id = 54");
  process.exit(0);
}
reset();
