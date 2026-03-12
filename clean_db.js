import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  } 
});

async function cleanDatabase() {
  const client = await pool.connect();
  try {
    console.log("🧹 Limpiando historial de chats (sesiones_chat)...");
    const resChat = await client.query("DELETE FROM sesiones_chat");
    console.log(`✅ ${resChat.rowCount} sesiones eliminadas.`);

    console.log("🧹 Limpiando citas de prueba (status confirmada)...");
    const resCitas = await client.query("DELETE FROM citas WHERE email LIKE '%@test.com%' OR nombre_completo LIKE '%test%' OR email = 'godzilla.oscar21@gmail.com'");
    console.log(`✅ ${resCitas.rowCount} citas de prueba eliminadas.`);
    
  } catch (err) {
    console.error("❌ Error limpiando la DB:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

cleanDatabase();
