import fetch from "node-fetch";

async function testGodzillaBot() {
  console.log("Iniciando prueba de conexión con Godzilla Bot...");
  try {
    const mockEvent = {
        object: "instagram",
        entry: [{
          messaging: [{
            sender: { id: "MOCK_USER_G_CAL_3" },
            message: { text: "Quiero agendar una cita para Consultoría Élite el 2026-03-20 a las 10:00. Mi nombre es Mock User, correo mock@test.com, teléfono 5551234567 y mis notas son: urge." }
          }]
        }]
      };

    console.log("\nEnviando mensaje de prueba al Webhook...");
    const chatResponse = await fetch("http://localhost:3000/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mockEvent)
    });

    if (chatResponse.ok) {
        console.log("✅ Respuesta del webhook:", chatResponse.status);
    } else {
        const errText = await chatResponse.text();
        console.error("❌ Error API:", chatResponse.status, errText);
    }
  } catch (error) {
    console.error("❌ Error conexión:", error.message);
  }
}
testGodzillaBot();
