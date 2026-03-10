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

async function migrateDatabase() {
  const client = await pool.connect();
  try {
    console.log("Iniciando migración de base de datos...");

    // 1. Eliminar la tabla ineficiente antigua (Comando de Destrucción)
    console.log("1. Ejecutando DROP TABLE chats_redes...");
    await client.query("DROP TABLE IF EXISTS chats_redes;");
    console.log("✅ Tabla antigua destruida con éxito.");

    // 2. Crear nueva tabla JSONB Inteligente
    console.log("2. Creando nueva estructura sesiones_chat...");
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sesiones_chat (
        id_usuario_red VARCHAR(255) PRIMARY KEY,
        historial_mensajes JSONB DEFAULT '[]',
        resumen_contexto TEXT DEFAULT '',
        plataforma VARCHAR(50),
        ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log("✅ Nueva estructura JSONB lista y optimizada.");

    // 3. Prueba de Escritura JSONB
    console.log("3. Ejecutando inserción de prueba...");
    const testPayload = JSON.stringify([
      { role: "user", parts: [{ text: "Hola soy un test JSON" }] },
      { role: "model", parts: [{ text: "Test aprobado" }] }
    ]);
    
    await client.query(
      `INSERT INTO sesiones_chat (id_usuario_red, historial_mensajes, plataforma) 
       VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario_red) DO UPDATE SET 
       historial_mensajes = EXCLUDED.historial_mensajes,
       ultima_actualizacion = CURRENT_TIMESTAMP`,
      ["tester_123", testPayload, "instagram"]
    );
    console.log("✅ Inserción JSONB exitosa.");
    
    const result = await client.query("SELECT * FROM sesiones_chat WHERE id_usuario_red = 'tester_123'");
    console.log("Datos de validación obtenidos:", JSON.stringify(result.rows[0], null, 2));

  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN MIGRACIÓN:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateDatabase();
