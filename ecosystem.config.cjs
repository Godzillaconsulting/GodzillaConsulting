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
      name: "cloudflare-tunnel",
      script: "C:\\Users\\JareG\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\\cloudflared.exe",
      args: "tunnel --url http://localhost:3000",
      watch: false,
    }
  ]
};
