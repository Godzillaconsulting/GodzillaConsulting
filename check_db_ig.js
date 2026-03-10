import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  } 
});

async function check() {
  try {
    const res = await pool.query(
      "SELECT plataforma, role, content, created_at FROM chats_redes WHERE plataforma = 'instagram' ORDER BY created_at DESC LIMIT 5"
    );
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
