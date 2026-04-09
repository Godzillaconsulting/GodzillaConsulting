const { exec, spawn } = require('child_process');
const http = require('http');
const path = require('path');

const TUNNEL_TOKEN = 'eyJhIjoiODk5YmJiOGZhYjBhZGMwYThlNzlkM2Q4NjhhZmU4NmEiLCJ0IjoiMjBlNGMyYWUtZmYzZC00MjA0LWJhZWItOGYwMTgyYTYxZWFjIiwicyI6IlpqVmlZelkwWVdNdE56ZzBZeTAwTlRJMExUZ3dNRFl0TWpGaE56ZzNNV1k0T1RVeSJ9';
const CLOUDFLARED_PATH = path.join(__dirname, 'cloudflared.exe');
const METRICS_PORT = 20241;          // Puerto local de métricas de cloudflared
const CHECK_INTERVAL_MS  = 30_000;   // Checa cada 30 segundos
const RESTART_COOLDOWN_MS = 90_000;  // Espera 90s entre reinicios para evitar loops

let lastRestartAt = 0;
let consecutiveFailures = 0;

// ── Health-check real: consulta el endpoint de métricas de cloudflared ─────
// Si cloudflared tiene conexiones activas, la métrica "tunnel_ha_connections" aparece.
// Si el proceso está muerto o desconectado, la petición fallará o no tendrá la métrica.
function checkTunnelHealth() {
    return new Promise((resolve) => {
        const req = http.get(
            { host: '127.0.0.1', port: METRICS_PORT, path: '/metrics', timeout: 5000 },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    const connected = body.includes('tunnel_ha_connections');
                    resolve(connected);
                });
            }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

// ── Mata el proceso cloudflared existente ─────────────────────────────────
function killCloudflared() {
    return new Promise((resolve) => {
        exec('taskkill /F /IM cloudflared.exe', { windowsHide: true }, () => {
            setTimeout(resolve, 1500); // Espera 1.5s para liberar el puerto
        });
    });
}

// ── Lanza cloudflared con el token de Zero Trust ──────────────────────────
function startTunnel() {
    const proc = spawn(
        CLOUDFLARED_PATH,
        ['tunnel', '--no-autoupdate', '--protocol', 'http2', 'run', '--token', TUNNEL_TOKEN],
        { stdio: 'pipe', shell: false, windowsHide: true, detached: true }
    );

    proc.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line.includes('Registered tunnel connection')) {
            console.log(`[Tunnel Monitor] ✅ ${line.includes('connIndex') ? line.split('INF')[1]?.trim() : 'Conexión registrada'}`);
        }
    });

    proc.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line.includes('ERR') || line.includes('WRN')) {
            console.error(`[Tunnel Monitor] ⚠️  ${line}`);
        }
    });

    proc.on('error', (err) => {
        console.error('[Tunnel Monitor] ❌ Error al lanzar cloudflared:', err.message);
    });

    proc.unref(); // El monitor no espera al hijo para terminar
    console.log(`[Tunnel Monitor] 🚀 cloudflared lanzado (PID ${proc.pid})`);
}

// ── Ciclo principal ────────────────────────────────────────────────────────
async function monitorLoop() {
    const healthy = await checkTunnelHealth();

    if (healthy) {
        consecutiveFailures = 0;
        // Usamos \r para sobreescribir en la misma línea y no llenar los logs
        process.stdout.write(`[Tunnel Monitor] ✅ Túnel OK — ${new Date().toISOString()}\r`);
        return;
    }

    consecutiveFailures++;
    console.log(`\n[Tunnel Monitor] ⚠️  Túnel no responde (fallo consecutivo #${consecutiveFailures}) — ${new Date().toISOString()}`);

    // Esperamos 2 fallos consecutivos antes de actuar (evita falsos positivos)
    if (consecutiveFailures < 2) {
        console.log('[Tunnel Monitor] Esperando confirmación en siguiente ciclo…');
        return;
    }

    // Respetamos el cooldown entre reinicios
    const msSinceLastRestart = Date.now() - lastRestartAt;
    if (msSinceLastRestart < RESTART_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESTART_COOLDOWN_MS - msSinceLastRestart) / 1000);
        console.log(`[Tunnel Monitor] 🕒 Cooldown activo — próximo intento en ~${waitSec}s`);
        return;
    }

    // ── Reinicio ───────────────────────────────────────────────────────────
    console.log('[Tunnel Monitor] 🔄 Reiniciando cloudflared…');
    lastRestartAt = Date.now();
    consecutiveFailures = 0;

    await killCloudflared();
    await new Promise(r => setTimeout(r, 2000)); // 2s adicionales de gracia
    startTunnel();
}

// ── Inicio ─────────────────────────────────────────────────────────────────
console.log('[Tunnel Monitor] Iniciando — health-check real cada 30s (métricas locales de cloudflared)');
monitorLoop();
setInterval(monitorLoop, CHECK_INTERVAL_MS);
