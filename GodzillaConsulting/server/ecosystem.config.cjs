module.exports = {
  apps: [
    {
      name: "godzilla-web-fb",
      script: "./index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        IS_PM2: "true"
      },
      env_development: {
        NODE_ENV: "development"
      },
      out_file: "./logs/web-out.log",
      error_file: "./logs/web-error.log",
      merge_logs: true,
      time: true
    },
    {
      name: "godzilla-whatsapp",
      script: "./start-whatsapp.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        IS_PM2: "true"
      },
      out_file: "./logs/wa-out.log",
      error_file: "./logs/wa-error.log",
      merge_logs: true,
      time: true
    },
    {
      name: "godzilla-instagram",
      script: "./start-instagram.js",
      instances: 1,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        IS_PM2: "true"
      },
      out_file: "./logs/ig-out.log",
      error_file: "./logs/ig-error.log",
      merge_logs: true,
      time: true
    }
  ]
};
