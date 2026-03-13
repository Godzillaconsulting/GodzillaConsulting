module.exports = {
  apps: [
    {
      name: "zilla-bot",
      script: "./index.js",
      instances: 1,
      autorestart: true,
      watch: ["."],
      // IMPORTANTÍSIMO: Ignorar estas carpetas para evitar que PM2 reinicie el bot infinitamente cada que reciba un mje
      ignore_watch: [
        "node_modules",
        "whatsapp-session",
        "logs",
        "*.log",
        ".git"
      ],
      max_memory_restart: "500M", // Si se traba Puppeteer y absorbe RAM, reinicia sutilmente
      env: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development"
      },
      // Logs limpios directamente de PM2
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      time: true
    }
  ]
};
