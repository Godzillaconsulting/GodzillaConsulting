module.exports = {
  apps: [
    {
      name: "ig-neurona",
      script: "./index.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "60s", // Si falla en menos de 60s, PM2 lo considerará en estado de error
      restart_delay: 5000, // Esperar 5s antes de reiniciar el script
      env: {
        NODE_ENV: "development",
        AI_API_URL: "http://localhost:3000/api/ai/chat" 
      },
      env_production: {
        NODE_ENV: "production"
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "./logs/ig-neurona-error.log",
      out_file: "./logs/ig-neurona-out.log",
      merge_logs: true
    }
  ]
};
