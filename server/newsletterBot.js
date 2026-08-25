import { generateAndSendAutoNewsletter } from './services/newsletterGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOT_NAME = process.env.name || 'newsletter-bot';

console.log(`[${BOT_NAME}] 🚀 Inicializado exitosamente.`);
console.log(`[${BOT_NAME}] 🕒 Sincronizando reloj interno con zona horaria America/Mexico_City...`);

// Helper para verificar y generar el boletín si no existe en la DB hoy
async function checkAndRunNewsletter(triggerReason = 'Programación Automática') {
    let client;
    try {
        client = await pool.connect();
        
        // Usar advisory lock exclusivo (ID arbitrario: 102938) para evitar concurrencia
        const lockRes = await client.query('SELECT pg_try_advisory_lock(102938) AS acquired');
        if (!lockRes.rows[0].acquired) {
            console.log(`[${BOT_NAME}] ⏭️ [${triggerReason}] Otro proceso ya está ejecutando la verificación/generación. Saltando.`);
            return;
        }

        // Revisar si ya se envió hoy en la base de datos (según zona horaria de México)
        const res = await client.query(
            `SELECT id, subject FROM newsletters WHERE DATE(sent_at AT TIME ZONE 'America/Mexico_City') = DATE(NOW() AT TIME ZONE 'America/Mexico_City') LIMIT 1`
        );
        
        if (res.rows.length > 0) {
            console.log(`[${BOT_NAME}] ⏭️ [${triggerReason}] El newsletter de hoy ya fue generado (#${res.rows[0].id}). Evitando duplicado.`);
            await client.query('SELECT pg_advisory_unlock(102938)');
            return;
        }

        const ahoraMexico = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        console.log(`[${BOT_NAME}] 🚀 [${triggerReason}] No existe newsletter para hoy (${ahoraMexico}). Generando ahora...`);
        
        const result = await generateAndSendAutoNewsletter();
        console.log(`[${BOT_NAME}] ✅ Éxito masivo. Newsletter generado:`, result);

    } catch (e) {
        console.error(`[${BOT_NAME}] ❌ Error en la generación del Newsletter:`, e.message);
    } finally {
        if (client) {
            try {
                await client.query('SELECT pg_advisory_unlock(102938)');
            } catch (lockErr) {}
            client.release();
        }
    }
}

// ── 1. CATCH-UP AL ARRANCAR EL BOT ────────────────────────────
// Si el servidor se reinicia a las 10 AM, 1 PM, 5 PM o cualquier hora y el boletín de hoy no se envió,
// se envía de inmediato a los 5 segundos de arrancar.
setTimeout(() => {
    console.log(`[${BOT_NAME}] 🔍 Verificación Catch-Up al arranque...`);
    checkAndRunNewsletter('Arranque / Catch-Up');
}, 5000);

// ── 2. BUCLE AUTÓNOMO PRINCIPAL ──────────────────────────────
// Revisa cada 5 minutos. Si la hora en México es >= 8 AM y aún no hay boletín de hoy, lo genera.
let lastAttemptMinute = -1;

setInterval(async () => {
    const ahora = new Date();
    // Obtener la hora actual en México (0 a 23)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(ahora);
    const horaMexico = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutoMexico = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    // Ejecutar cada 10 minutos si ya son las 8:00 AM o más tarde en México
    if (horaMexico >= 8 && minutoMexico % 10 === 0) {
        if (lastAttemptMinute !== minutoMexico) {
            lastAttemptMinute = minutoMexico;
            console.log(`[${BOT_NAME}] ⏰ Verificando estado del Newsletter a las ${horaMexico}:${minutoMexico.toString().padStart(2, '0')} (CDMX)...`);
            await checkAndRunNewsletter(`Reloj ${horaMexico}:${minutoMexico.toString().padStart(2, '0')}`);
        }
    }
}, 60000);
