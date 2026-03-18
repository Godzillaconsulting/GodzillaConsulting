module.exports = {
  apps: [
    {
      name: "godzilla-bot-redes",
      script: "./index.js",
      cwd: "./server",
      instances: "max",
      exec_mode: "cluster",
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
      name: "cloudflare-tunnel",
      script: "C:\\Users\\JareG\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\\cloudflared.exe",
      args: "tunnel --url http://localhost:3000",
      watch: false,
    }
  ]
};
