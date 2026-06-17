module.exports = {
  apps: [
    { name: "godzilla-server", script: "server/index.js", env: { NODE_ENV: "production" } },
    { name: "whatsapp-bot", script: "server/whatsappBot.js", env: { NODE_ENV: "production" } },
    // ai-core REMOVED: mediaWorker.js ya se importa dentro de godzilla-server (server/index.js)
    // Tener dos instancias del worker causa conflictos de tareas y EADDRINUSE
    { name: "email-worker", script: "server/emailWorker.js", env: { NODE_ENV: "production" } },
    { name: "trends-bot", script: "server/trendsBot.js", env: { NODE_ENV: "production" } },
    // { name: "tiktok-bot", script: "server/tiktok_bypass.js", env: { NODE_ENV: "production" } },
    // { name: "instagram-bot", script: "server/instagram_bot.cjs", env: { NODE_ENV: "production" } },
    { name: "newsletter-bot", script: "server/newsletterBot.js", env: { NODE_ENV: "production" } }
  ]
};
