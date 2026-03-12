import fs from 'fs';
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

async function checkSessions() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT id_usuario_red, plataforma, ultima_actualizacion, jsonb_array_length(historial_mensajes) as num_mensajes FROM sesiones_chat ORDER BY ultima_actualizacion DESC LIMIT 5"
    );
    
    fs.writeFileSync('check-results.json', JSON.stringify(res.rows, null, 2), 'utf-8');
    console.log("Archivo JSON generado exitosamente.");
  } catch (err) {
    console.error("Error consultando la DB:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

checkSessions();
