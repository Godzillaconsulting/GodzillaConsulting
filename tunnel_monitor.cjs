const { exec, spawn } = require('child_process');

function checkTunnel() {
    exec('tasklist /FI "IMAGENAME eq cloudflared.exe"', { windowsHide: true }, (err, stdout) => {
        if (!stdout.toLowerCase().includes('cloudflared.exe')) {
            console.log('[Tunnel Monitor] cloudflared is down. Restarting...');
            startTunnel();
        } else {
            console.log('[Tunnel Monitor] cloudflared is running.');
        }
    });
}

function startTunnel() {
    const cloudflaredPath = require('path').join(__dirname, 'cloudflared.exe');
    
    // Usando el token oficial de Zero Trust proporcionado por el usuario
    const tunnelToken = 'eyJhIjoiODk5YmJiOGZhYjBhZGMwYThlNzlkM2Q4NjhhZmU4NmEiLCJ0IjoiMjBlNGMyYWUtZmYzZC00MjA0LWJhZWItOGYwMTgyYTYxZWFjIiwicyI6IlpqVmlZelkwWVdNdE56ZzBZeTAwTlRJMExUZ3dNRFl0TWpGaE56ZzNNV1k0T1RVeSJ9';
    const tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--no-autoupdate', 'run', '--token', tunnelToken], { stdio: 'inherit', shell: true, windowsHide: true });
    
    tunnelProcess.on('error', (err) => {
        console.error('[Tunnel Monitor] Falló al iniciar cloudflared local:', err.message);
    });
}

setInterval(checkTunnel, 60000);
checkTunnel();
