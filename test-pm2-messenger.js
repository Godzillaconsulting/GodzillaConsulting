import fetch from "node-fetch";

async function testMessengerWebhook() {
  console.log("Iniciando simulación de Webhook de Messenger...");
  
  const messengerPayload = {
    object: "page",
    entry: [
      {
        id: "123456789", // Si incluye 'ig' simulamos Instagram, sino Messenger
        time: 1457764198246,
        messaging: [
          {
            sender: {
              id: "USER_ID_MESSENGER"
            },
            recipient: {
              id: "PAGE_ID"
            },
            timestamp: 1457764197627,
            message: {
              mid: "mid.1457764197618:41d102a3e1ae206a38",
              text: "Hola, ¿cómo puedo agendar una consulta?"
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch("http://localhost:3000/api/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messengerPayload)
    });

    if (response.ok) {
        console.log("✅ Webhook HTTP Status:", response.status);
        console.log("El payload estructurado como Messenger fue aceptado.");
        console.log("Revisa los logs de PM2 (pm2 logs godzilla-bot-redes) para verificar si Zilla parseó el JSON, guardó en BD y generó la respuesta.");
    } else {
        console.error("❌ Código de error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Falló la prueba local:", error);
  }
}

testMessengerWebhook();
