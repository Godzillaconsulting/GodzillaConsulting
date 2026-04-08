module.exports = {
  apps: [
    {
      name: "godzilla-server",
      script: "./index.js",
      cwd: "./server",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "whatsapp-bot",
      script: "./whatsappBot.js",
      cwd: "./server",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      max_restarts: 5,
      restart_delay: 15000,
      min_uptime: "20s",
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "godzilla-bot-ig",
      script: "./instagram_bot.cjs",
      cwd: "./server",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      max_restarts: 3,
      restart_delay: 15000,
      min_uptime: "20s",
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production"
      }
    },

    {
      name: "tiktok-bot",
      script: "./tiktok_bypass.js",
      cwd: "./server",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      max_restarts: 5,
      restart_delay: 30000,
      min_uptime: "15s",
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production"
      }
    },

    {
      name: "ha-tunnel-monitor",
      script: "./tunnel_monitor.cjs",
      watch: false
    },
    {
      name: "ha-health-check",
      script: "./health_check.cjs",
      watch: false
    },
    {
      name: "ha-log-cleaner",
      script: "./log_cleaner.cjs",
      watch: false
    },
    {
      name: "godzilla-db-backup",
      script: "./scripts/backup_db.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: false,
      cron_restart: "0 18 * * 5",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "godzilla-newsletter-cron",
      script: "./scripts/auto_newsletter_cron.js",
      cwd: "./server",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: false,
      cron_restart: "0 9 * * 1", // Todos los Lunes a las 9:00 AM
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "email-worker",
      script: "./emailWorker.js",
      cwd: "./server",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      restart_delay: 5000,        // espera 5s antes de reintentar
      max_restarts: 10,           // máximo 10 reinicios en ventana
      min_uptime: "10s",          // debe vivir al menos 10s para contar como estable
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        QUEUE_DELAY_MS: "2000"    // 2 segundos entre correos
      }
    },
    {
      name: "godzilla-sora-engine",
      script: "godzilla_inference_bridge.py",
      cwd: "./server/core_engine",
      interpreter: "python",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "12G", // Previene OOM Catastroficos
      watch: false
    }
  ]
};
