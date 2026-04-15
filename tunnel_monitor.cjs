const { spawn } = require('child_process');
const path = require('path');

const TUNNEL_TOKEN = 'eyJhIjoiODk5YmJiOGZhYjBhZGMwYThlNzlkM2Q4NjhhZmU4NmEiLCJ0IjoiMjBlNGMyYWUtZmYzZC00MjA0LWJhZWItOGYwMTgyYTYxZWFjIiwicyI6IlpqVmlZelkwWVdNdE56ZzBZeTAwTlRJMExUZ3dNRFl0TWpGaE56ZzNNV1k0T1RVeSJ9';
const CLOUDFLARED_PATH = path.join(__dirname, 'cloudflared.exe');

function startTunnel() {
    console.log('[Tunnel Monitor] Iniciando cloudflared...');
    const proc = spawn(
        CLOUDFLARED_PATH,
        ['tunnel', '--no-autoupdate', '--protocol', 'quic', 'run', '--token', TUNNEL_TOKEN],
        { stdio: 'inherit', shell: false }
    );

    proc.on('close', (code) => {
        console.error(`[Tunnel Monitor] ❌ cloudflared cerrado (código ${code}). Reiniciando en 5s...`);
        setTimeout(startTunnel, 5000);
    });
    
    proc.on('error', (err) => {
        console.error(`[Tunnel Monitor] ❌ Error lanzando cloudflared: ${err.message}`);
    });
}

startTunnel();
