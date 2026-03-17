module.exports = {
  apps: [
    {
      name: "godzilla-web-fb",
      script: "./index.js",
      instances: 1,
      autorestart: true,
      restart_delay: 10000,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        IS_PM2: "true",
        PORT: 3000
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
      restart_delay: 10000,
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
    }
  ]
};
