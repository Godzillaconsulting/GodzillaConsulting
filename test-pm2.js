/**
 * Script for testing the PM2-managed Godzilla Bot locally.
 * It simulates an incoming webhook or request on the local port 3000.
 */
import fetch from "node-fetch";

async function testGodzillaBot() {
  console.log("Iniciando prueba de conexión con Godzilla Bot (PM2 Local)...");
  
  try {
    // 1. Probar el endpoint de salud
    const healthCheck = await fetch("http://localhost:3000/");
    const healthText = await healthCheck.text();
    console.log("✅ Health Check:", healthText);

    // 2. Probar el endpoint de Chat con Gemini simulando el frontend
    console.log("\nEnviando mensaje de prueba al Chatbot...");
    const chatResponse = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hola, ¿cuáles son sus servicios de consultoría?" }]
      })
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log("✅ Respuesta de Gemini recibida:");
      console.log(`🤖 Bot: ${chatData.reply}`);
    } else {
      console.error("❌ Error en el endpoint de chat:", chatResponse.status, chatResponse.statusText);
    }
    
    // Aquí podemos extender más adelante para escribir o leer de Neon como parte de la prueba
    console.log("\nPrueba finalizada exitosamente. El entorno PM2 responde.");

  } catch (error) {
    console.error("❌ Falló la prueba. ¿Está corriendo el bot en PM2 en el puerto 3000?");
    console.error("Error original:", error.message);
  }
}

testGodzillaBot();
