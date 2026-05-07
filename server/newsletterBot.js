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
let lastAttemptMinute = -1;

// Bucle autónomo principal: El bot "sabe" qué día y hora es en cada ciclo.
setInterval(async () => {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minuto = ahora.getMinutes();
    
    // 1. Ejecutar Generación entre las 8:00 AM y las 8:59 AM (reintenta cada 10 min si falla)
    if (hora === 8 && minuto % 10 === 0) {
        if (!hasRunToday && lastAttemptMinute !== minuto) {
            lastAttemptMinute = minuto;
            console.log(`[${BOT_NAME}] ⏰ ¡Es la hora! Iniciando generación automática del Newsletter... (Intento a las 8:${minuto.toString().padStart(2, '0')})`);
            try {
                const result = await generateAndSendAutoNewsletter();
                console.log(`[${BOT_NAME}] ✅ Éxito masivo. Newsletter generado:`, result);
                hasRunToday = true; // Marcar como exitoso para no volver a ejecutar hoy
                
                // Forzar auto-despliegue inmediatamente después
                console.log(`[${BOT_NAME}] 🚀 Iniciando auto-despliegue...`);
                exec(`node ${path.join(__dirname, 'scripts', 'auto_newsletter_enforce_cron.js')}`, (error, stdout, stderr) => {
                    if (error) console.error(`[${BOT_NAME}] ❌ Error en el auto-despliegue:`, error);
                    if (stdout) console.log(`[${BOT_NAME}] 🚀 ${stdout.trim()}`);
                    if (stderr) console.error(`[${BOT_NAME}] ⚠️ ${stderr.trim()}`);
                });
            } catch (e) {
                console.error(`[${BOT_NAME}] ❌ Error en la generación del Newsletter:`, e.message);
                console.log(`[${BOT_NAME}] ⏳ Falló. Reintentará en 10 minutos (hasta las 8:50).`);
            }
        }
    } 
    // Resetear las banderas a medianoche para el día siguiente
    else if (hora === 0) {
        hasRunToday = false;
        hasEnforcedToday = false;
    }
}, 60000);
