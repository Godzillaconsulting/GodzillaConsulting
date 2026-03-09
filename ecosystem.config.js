module.exports = {
  apps: [
    {
      name: "godzilla-bot-redes",
      script: "./index.js",
      cwd: "./GodzillaConsulting/server",
      watch: true,
      ignore_watch: ["node_modules", "server_output.log"],
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    },
    {
      name: "ngrok-tunnel",
      script: "ngrok",
      args: "http 3000",
      watch: false,
    }
  ]
};
