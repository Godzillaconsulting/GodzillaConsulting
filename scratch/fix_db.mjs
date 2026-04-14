import pool from '../server/config/db.js';

async function fix() {
  try {
    await pool.query('ALTER TABLE newsletters RENAME TO newsletters_legacy');
    console.log("Renamed newsletters to newsletters_legacy");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletters (
          id               SERIAL PRIMARY KEY,
          subject          VARCHAR(255) NOT NULL,
          body_html        TEXT         NOT NULL,
          attachment_url   VARCHAR(500),
          sent_at          TIMESTAMP    DEFAULT NOW(),
          total_recipients INT          DEFAULT 0,
          sent_count       INT          DEFAULT 0,
          failed_count     INT          DEFAULT 0,
          status           VARCHAR(20)  DEFAULT 'draft'
      )
    `);
    console.log("Created proper newsletters table.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
fix();
