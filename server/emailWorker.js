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

console.log('📬 [EmailWorker] Iniciando worker de correos...');
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || '⚠️ NO CONFIGURADO'}`);
console.log(`   QUEUE_DELAY: ${process.env.QUEUE_DELAY_MS || '2000'}ms entre correos`);
console.log('');

// Recuperar cola pendiente tras reinicio
await resumeQueueFromDB();

// Mantener el proceso vivo (PM2 lo monitorea)
setInterval(() => {
    // Heartbeat cada 30s para que PM2 sepa que el worker está vivo
    console.log(`💓 [EmailWorker] Alive — ${new Date().toLocaleTimeString('es-MX')}`);
}, 30_000);

// Manejo de señales de PM2
process.on('SIGINT',  () => { console.log('🛑 [EmailWorker] Detenido por SIGINT');  process.exit(0); });
process.on('SIGTERM', () => { console.log('🛑 [EmailWorker] Detenido por SIGTERM'); process.exit(0); });
