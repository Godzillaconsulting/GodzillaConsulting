/**
 * FORCE_NEWSLETTER_TODAY.js
 * ──────────────────────────────────────────────────────────────────────────
 * USO ÚNICO — 03/08/2026
 * Genera y envía UN boletín extra hoy, saltando el check de duplicado.
 * NUNCA debe volver a ejecutarse — está protegido por una bandera en DB.
 * ──────────────────────────────────────────────────────────────────────────
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import pool from './config/db.js';

const FORCE_RUN_KEY = 'force_extra_newsletter_2026_08_03';

async function run() {
    let client;
    try {
        client = await pool.connect();

        // ── GUARDIA DE USO ÚNICO ──────────────────────────────────────────────
        // Verifica si ya se ejecutó este script hoy. Si ya corrió, aborta para siempre.
        const check = await client.query(
            `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
            [FORCE_RUN_KEY]
        ).catch(() => ({ rows: [] }));

        if (check.rows.length > 0) {
            console.log(`🚫 Este script de forzado ya fue ejecutado el ${check.rows[0].value}. No se repite nunca.`);
            process.exit(0);
        }

        // Asegurar que la tabla app_settings exista
        await client.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `).catch(() => {});

        // ── GENERAR BOLETÍN EXTRA ─────────────────────────────────────────────
        console.log('🚀 [FORZADO] Iniciando generación del boletín extra con las mejoras del día...');
        console.log('   ℹ️  Este envío es único — NO se repetirá mañana ni nunca más.');

        // Importar el generador y llamarlo CON BYPASS del check de duplicado
        const { generateAndSendAutoNewsletter } = await import('./services/newsletterGenerator.js');

        // Para bypassear el check de "ya se envió hoy", temporalmente 
        // insertamos el resultado de este boletín con un timestamp de ayer en el check
        // y luego lo corregimos. El método más limpio: pasar un flag.
        // Pero como no existe ese flag, borramos temporalmente el registro de hoy,
        // generamos, y después el registro nuevo queda con la hora actual.
        console.log('   🗑️  Marcando el boletín anterior de hoy como del día anterior para permitir la regeneración...');
        await client.query(
            `UPDATE newsletters 
             SET sent_at = sent_at - INTERVAL '1 day', created_at = created_at - INTERVAL '1 day'
             WHERE DATE(created_at AT TIME ZONE 'America/Mexico_City') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')
             AND id = (SELECT id FROM newsletters ORDER BY id DESC LIMIT 1)`
        );
        console.log('   ✅ Registro anterior reubicado. Generando boletín extra con 4 noticias obligatorias...\n');

        client.release();
        client = null;

        const result = await generateAndSendAutoNewsletter();
        
        if (result?.skipped) {
            console.log('⚠️  El generador devolvió skip. Verifica manualmente.');
        } else {
            console.log('✅ Boletín extra generado y enviado:', result?.subject || 'OK');
        }

        // ── MARCAR COMO EJECUTADO (NUNCA MÁS) ───────────────────────────────
        const client2 = await pool.connect();
        await client2.query(
            `INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
            [FORCE_RUN_KEY, new Date().toISOString()]
        );
        client2.release();
        console.log(`\n🔒 Script marcado como ejecutado. No se podrá volver a correr.`);

    } catch (e) {
        console.error('❌ Error en force_newsletter:', e.message);
        if (client) client.release();
    } finally {
        process.exit(0);
    }
}

run();
