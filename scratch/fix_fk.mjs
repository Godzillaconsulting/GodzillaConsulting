import pool from '../server/config/db.js';

async function fix() {
  try {
    await pool.query('DROP TABLE IF EXISTS queue_log CASCADE');
    await pool.query(`
        CREATE TABLE queue_log (
            id               SERIAL PRIMARY KEY,
            newsletter_id    INT REFERENCES newsletters(id) ON DELETE CASCADE,
            subscriber_email VARCHAR(255) NOT NULL,
            status           VARCHAR(20)  DEFAULT 'pending',
            attempts         INT          DEFAULT 0,
            last_attempt     TIMESTAMP,
            error_msg        TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_queue_log_status      ON queue_log(status);
        CREATE INDEX IF NOT EXISTS idx_queue_log_newsletter   ON queue_log(newsletter_id);
    `);
    console.log("Recreated queue_log with correct FK.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
fix();
