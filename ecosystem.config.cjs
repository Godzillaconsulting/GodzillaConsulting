module.exports = {
  apps: [
    {
      name: "godzilla-server",
      script: "./server/index.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "whatsapp-bot",
      script: "./server/whatsappBot.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      max_restarts: 5,
      restart_delay: 15000,
      min_uptime: "20s",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "instagram-bot",
      script: "./server/instagram_bot.cjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      max_restarts: 3,
      restart_delay: 15000,
      min_uptime: "20s",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "tiktok-bot",
      script: "./server/tiktok_bot.cjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      max_restarts: 5,
      restart_delay: 30000,
      min_uptime: "15s",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "email-worker",
      script: "./server/emailWorker.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        QUEUE_DELAY_MS: "2000"
      }
    }
  ]
};
