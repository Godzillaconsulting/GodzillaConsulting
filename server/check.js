import pool from './config/db.js';

async function check() {
  try {
    const res = await pool.query("SELECT id, subject, status, sent_at, total_recipients, sent_count, failed_count FROM newsletters ORDER BY id DESC LIMIT 5");
    console.log("Newsletters:", res.rows);
    const queueRes = await pool.query("SELECT status, count(*) FROM queue_log GROUP BY status");
    console.log("Queue status:", queueRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
