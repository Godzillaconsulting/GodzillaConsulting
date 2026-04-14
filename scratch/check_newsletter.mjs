import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function check() {
  try {
    const nl = await pool.query('SELECT * FROM newsletters ORDER BY id DESC LIMIT 3');
    console.log("--- Últimos 3 Newsletters ---");
    console.table(nl.rows.map(r => ({ id: r.id, subject: r.subject, status: r.status, sent_count: r.sent_count, failed_count: r.failed_count, total_recipients: r.total_recipients })));

    if(nl.rows.length > 0) {
      const qlog = await pool.query('SELECT * FROM queue_log WHERE newsletter_id = $1 ORDER BY id DESC LIMIT 10', [nl.rows[0].id]);
      console.log(`\n--- Queue Log (último newsletter ID ${nl.rows[0].id}) -- límite 10 ---`);
      console.table(qlog.rows.map(r => ({ id: r.id, email: r.subscriber_email, status: r.status, attempts: r.attempts, error_msg: r.error_msg?.substring(0, 50) })));
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
