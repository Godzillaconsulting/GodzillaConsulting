import { generateAndSendAutoNewsletter } from './services/newsletterGenerator.js';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BOT_NAME = process.env.name || 'newsletter-bot';

console.log(`[${BOT_NAME}] 🚀 Inicializado exitosamente.`);
console.log(`[${BOT_NAME}] 🕒 Sincronizando reloj interno para el despliegue a las 08:00 AM...`);

let hasRunToday = false;
let hasEnforcedToday = false;

// Bucle autónomo principal: El bot "sabe" qué día y hora es en cada ciclo.
setInterval(async () => {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minuto = ahora.getMinutes();
    
    // 1. Ejecutar Generación a las 8:00 AM exactamente (Se queda en Draft para revisión humana)
    if (hora === 8 && minuto === 0) {
        if (!hasRunToday) {
            hasRunToday = true;
            console.log(`[${BOT_NAME}] ⏰ ¡Es la hora! Iniciando generación automática del Newsletter...`);
            try {
                const result = await generateAndSendAutoNewsletter();
                console.log(`[${BOT_NAME}] ✅ Éxito masivo. Newsletter generado (Borrador creado):`, result);
            } catch (e) {
                console.error(`[${BOT_NAME}] ❌ Error en la generación del Newsletter:`, e.message);
            }
        }
    } 
    // 2. Ejecutar Auto-Despliegue a las 9:00 AM exactamente (Si el humano no lo envió, la IA lo fuerza)
    else if (hora === 9 && minuto === 0) {
        if (!hasEnforcedToday) {
            hasEnforcedToday = true;
            console.log(`[${BOT_NAME}] ⏰ ¡Ventana de revisión terminada! Forzando auto-despliegue de borradores olvidados...`);
            exec(`node ${path.join(__dirname, 'scripts', 'auto_newsletter_enforce_cron.js')}`, (error, stdout, stderr) => {
                if (error) console.error(`[${BOT_NAME}] ❌ Error en el auto-despliegue:`, error);
                if (stdout) console.log(`[${BOT_NAME}] 🚀 ${stdout.trim()}`);
                if (stderr) console.error(`[${BOT_NAME}] ⚠️ ${stderr.trim()}`);
            });
        }
    } 
    // Resetear las banderas para el día siguiente
    else if (hora !== 8 && hora !== 9) {
        hasRunToday = false;
        hasEnforcedToday = false;
    }
}, 60000);
