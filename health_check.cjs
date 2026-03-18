const { exec } = require('child_process');
const http = require('http');

function checkHealth() {
    http.get('http://localhost:3000/api/health', (res) => {
        if (res.statusCode === 200) {
            console.log(`[Health Check] Bot is healthy (Status: ${res.statusCode}).`);
        } else {
            console.log(`[Health Check] Bot returned status ${res.statusCode}. Restarting PM2...`);
            restartBot();
        }
    }).on('error', (err) => {
        console.error('[Health Check] Bot request failed:', err.message);
        restartBot();
    });
}

function restartBot() {
    exec('pm2.cmd restart godzilla-bot-redes', (err, stdout, stderr) => {
        if (err) {
            console.error('[Health Check] Failed to restart bot:', err);
            return;
        }
        console.log('[Health Check] Bot restarted successfully via Health Check script.');
    });
}

setInterval(checkHealth, 5 * 60 * 1000); // 5 minutes
checkHealth();
