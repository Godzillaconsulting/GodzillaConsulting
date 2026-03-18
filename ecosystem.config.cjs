module.exports = {
  apps: [
    {
      name: "godzilla-bot-redes",
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
    }
  ]
};
