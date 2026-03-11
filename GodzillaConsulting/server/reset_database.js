import pool from "./config/db.js";

async function resetearBaseDeDatos() {
    try {
        console.log("⚠️ Iniciando reseteo total de la base de datos para Producción...");
        
        // Vaciamos la tabla de citas y reiniciamos el contador de IDs a 1
        console.log("1. Vaciando tabla 'citas'...");
        await pool.query("TRUNCATE TABLE citas RESTART IDENTITY CASCADE");
        
        // Vaciamos la tabla de sesiones de chat (memoria del bot) para que los clientes empiecen de cero
        console.log("2. Vaciando tabla 'sesiones_chat' (memoria del bot)...");
        await pool.query("TRUNCATE TABLE sesiones_chat CASCADE");

        console.log("✅ ¡Reseteo exitoso! La base de datos está limpia y lista para producción en vivo.");
    } catch (e) {
        console.error("❌ Error al resetear la base de datos:", e);
    } finally {
        // Cerramos la conexión para que el script termine automáticamente
        process.exit();
    }
}

resetearBaseDeDatos();
