/**
 * EMAIL WORKER — Proceso independiente vigilado por PM2
 * ─────────────────────────────────────────────────────
 * PM2 lo reinicia automáticamente si falla.
 * Al arrancar, recupera nodos pendientes de la DB (resume desde último punto).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { resumeQueueFromDB } from './services/emailQueue.js';
import { checkAndEnqueue } from './services/retargetingService.js';

console.log('📬 [EmailWorker] Iniciando worker de correos...');
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || '⚠️ NO CONFIGURADO'}`);
console.log(`   QUEUE_DELAY: ${process.env.QUEUE_DELAY_MS || '2000'}ms entre correos`);
console.log('');

// Recuperar cola pendiente tras reinicio
await resumeQueueFromDB();

import cron from 'node-cron';
import { generateAndSendAutoNewsletter } from './services/newsletterGenerator.js';

// Mantener el proceso vivo (PM2 lo monitorea)
setInterval(() => {
    // Heartbeat cada 30s para que PM2 sepa que el worker está vivo
    console.log(`💓 [EmailWorker] Alive — ${new Date().toLocaleTimeString('es-MX')}`);
}, 30_000);

// ── PROGRAMACIÓN DEL NEWSLETTER ─────────────────────────────────────────────
// Ejecutar TODOS LOS DÍAS a las 7:00 AM hora de Ciudad Juárez
cron.schedule('0 7 * * *', async () => {
    console.log('⏳ [CRON] Activando Despliegue Automático del Newsletter (7:00 AM)...');
    try {
        const result = await generateAndSendAutoNewsletter();
        console.log('✅ [CRON] Éxito masivo. El boletín en PDF se ha puesto en circulación:', result);
    } catch (e) {
        console.error('❌ [CRON] Falla en la programación del Newsletter:', e.message);
    }
}, {
    scheduled: true,
    timezone: "America/Ciudad_Juarez"
});
console.log('⏰ [CRON] Programador activado: TODOS LOS DÍAS a las 7:00 AM (Cd. Juárez).');

// Retargeting: revisar reglas cada hora
// Primera ejecución a los 5 minutos de arrancar (dar tiempo a la DB)
setTimeout(async () => {
    const count = await checkAndEnqueue();
    if (count > 0) console.log(`🎯 [Retargeting] ${count} correo(s) enviado(s)`);
}, 5 * 60 * 1000);

setInterval(async () => {
    const count = await checkAndEnqueue();
    if (count > 0) console.log(`🎯 [Retargeting] ${count} correo(s) enviado(s)`);
    else console.log('🎯 [Retargeting] Sin correos pendientes');
}, 60 * 60 * 1000); // cada hora

// Manejo de señales de PM2
process.on('SIGINT',  () => { console.log('🛑 [EmailWorker] Detenido por SIGINT');  process.exit(0); });
process.on('SIGTERM', () => { console.log('🛑 [EmailWorker] Detenido por SIGTERM'); process.exit(0); });
