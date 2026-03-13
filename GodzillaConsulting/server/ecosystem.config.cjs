module.exports = {
  apps: [
    {
      name: "zilla-bot",
      script: "./index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G", // Chromium puede absorber hasta 800MB al arrancar. Elevamos el techo protector a 1GB.
      env: {
        NODE_ENV: "production",
        IS_PM2: "true"
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
