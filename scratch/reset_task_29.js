import pool from '../server/config/db.js';

async function run() {
  try {
    const res = await pool.query(
      `UPDATE studio_tasks 
       SET status = 'pending_render_docker' 
       WHERE id = 29 
       RETURNING id, status, feedback_notes`
    );
    console.log('✅ Task #29 status updated:', res.rows[0]);
  } catch(e) {
    console.error('Error updating task:', e);
  }
  process.exit(0);
}
run();
