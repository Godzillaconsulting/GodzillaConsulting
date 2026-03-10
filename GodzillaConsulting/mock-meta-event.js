import fetch from "node-fetch";

async function testGodzillaBot() {
  console.log("Iniciando prueba de conexión con Godzilla Bot...");
  try {
    const mockEvent = {
        object: "instagram",
        entry: [{
          messaging: [{
            sender: { id: "MOCK_USER_IG" },
            message: { text: "Price list please" }
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
