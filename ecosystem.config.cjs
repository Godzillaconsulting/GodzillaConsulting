module.exports = {
  apps: [
    { name: "godzilla-server", script: "server/index.js", env: { NODE_ENV: "production" }, max_memory_restart: '1500M', node_args: '--max-old-space-size=1536' },
    { name: "whatsapp-bot", script: "server/whatsappBot.js", env: { NODE_ENV: "production" }, max_memory_restart: '1G', node_args: '--max-old-space-size=1024' },
    // ai-core REMOVED: mediaWorker.js ya se importa dentro de godzilla-server (server/index.js)
    // Tener dos instancias del worker causa conflictos de tareas y EADDRINUSE
    { name: "email-worker", script: "server/emailWorker.js", env: { NODE_ENV: "production" }, max_memory_restart: '500M', node_args: '--max-old-space-size=512' },
    { name: "trends-bot", script: "server/trendsBot.js", env: { NODE_ENV: "production" }, max_memory_restart: '800M', node_args: '--max-old-space-size=1024' },
    // { name: "tiktok-bot", script: "server/tiktok_bypass.js", env: { NODE_ENV: "production" } },
    // { name: "instagram-bot", script: "server/instagram_bot.cjs", env: { NODE_ENV: "production" } },
    { name: "newsletter-bot", script: "server/newsletterBot.js", env: { NODE_ENV: "production" }, max_memory_restart: '500M', node_args: '--max-old-space-size=512' }
  ]
};
