module.exports = {
  apps: [
    { name: "godzilla-server", script: "./server/index.js", exec_mode: "fork", max_memory_restart: "512M", watch: false, env: { NODE_ENV: "production", PORT: 3000 } },
    { name: "whatsapp-bot", script: "./server/whatsappBot.js", exec_mode: "fork", max_memory_restart: "256M", max_restarts: 5, restart_delay: 15000, watch: false, env: { NODE_ENV: "production" } },
    { name: "email-worker", script: "./server/emailWorker.js", exec_mode: "fork", max_memory_restart: "128M", watch: false, restart_delay: 5000, max_restarts: 10, env: { NODE_ENV: "production", QUEUE_DELAY_MS: "2000" } },
    
    // --- CEREBRO CENTRAL (MEMORIA VECTORIAL) ---
    { name: "ai-core", script: "./server/core_engine/aiCore.js", exec_mode: "fork", max_memory_restart: "256M" },
    
    // --- BOTS EN DESARROLLO (PLACEHOLDERS) ---
    { name: "zilla-bot", script: "./server/bot_placeholder.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "goyi-bot", script: "./server/bot_placeholder.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "meta-bot", script: "./server/bot_placeholder.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "newsletter-bot", script: "./server/newsletterBot.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "trends-bot", script: "./server/trendsBot.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "publisher-bot", script: "./server/bot_placeholder.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "linkedin-bot", script: "./server/bot_placeholder.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "twitter-bot", script: "./server/bot_placeholder.js", exec_mode: "fork", max_memory_restart: "128M" },
    { name: "tiktok-bot", script: "./server/tiktok_bypass.js", exec_mode: "fork", max_memory_restart: "512M" },
    { name: "instagram-bot", script: "./server/instagram_bot.cjs", exec_mode: "fork", max_memory_restart: "512M" }
  ]
};
