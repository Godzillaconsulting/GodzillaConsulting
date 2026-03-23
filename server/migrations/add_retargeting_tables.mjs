/**
 * MIGRACIÓN: Tablas de Retargeting
 * Ejecutar UNA VEZ:  node server/migrations/add_retargeting_tables.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import pool from '../config/db.js';

const client = await pool.connect();
try {
    await client.query('BEGIN');

    // ── Tabla de reglas ───────────────────────────────────────────────────────
    await client.query(`
        CREATE TABLE IF NOT EXISTS retargeting_rules (
            id            SERIAL PRIMARY KEY,
            name          TEXT NOT NULL,
            trigger_event TEXT NOT NULL,
            delay_hours   INTEGER NOT NULL DEFAULT 24,
            subject       TEXT NOT NULL,
            body_html     TEXT NOT NULL,
            active        BOOLEAN DEFAULT true,
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('✅ Tabla retargeting_rules creada');

    // ── Tabla de registro (evita duplicados) ──────────────────────────────────
    await client.query(`
        CREATE TABLE IF NOT EXISTS retargeting_sent (
            id        SERIAL PRIMARY KEY,
            rule_id   INTEGER REFERENCES retargeting_rules(id) ON DELETE CASCADE,
            email     TEXT NOT NULL,
            sent_at   TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(rule_id, email)
        )
    `);
    console.log('✅ Tabla retargeting_sent creada');

    // ── Insertar reglas iniciales (solo si la tabla está vacía) ───────────────
    const existing = await client.query('SELECT COUNT(*) FROM retargeting_rules');
    if (parseInt(existing.rows[0].count) === 0) {
        await client.query(`
            INSERT INTO retargeting_rules (name, trigger_event, delay_hours, subject, body_html) VALUES
            (
                'Seguimiento 24h post-descarga',
                'after_lead_magnet_download',
                24,
                '¿Te fue útil el recurso? 🦖',
                '<h2>¡Hola! 🦖</h2>
                <p>Ayer descargaste un recurso de <strong>Godzilla Consulting</strong>. Esperamos que te haya sido de utilidad.</p>
                <p>Si tienes dudas o quieres dar el siguiente paso, podemos agendar una <strong>sesión estratégica gratuita</strong> de 30 minutos para analizar cómo aplicar estas ideas a tu negocio.</p>
                <p><a href="https://godzillaconsulting.ai/#contacto" style="background:#CC0000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Agendar sesión gratuita</a></p>'
            ),
            (
                'Oferta 7 días post-descarga',
                'after_lead_magnet_download',
                168,
                'Tenemos más recursos para ti 📚',
                '<h2>¡Hola! 🦖</h2>
                <p>Han pasado 7 días desde que descargaste nuestro recurso. Queremos que sigas aprendiendo.</p>
                <p>En <strong>Godzilla Consulting</strong> ayudamos a empresas en Juárez y el norte de México a crecer con IA y automatización.</p>
                <p>¿Listo para una consultoría personalizada? Esta semana tenemos horarios disponibles.</p>
                <p><a href="https://godzillaconsulting.ai/#contacto" style="background:#CC0000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver disponibilidad</a></p>'
            )
        `);
        console.log('✅ Reglas iniciales insertadas (24h y 7 días)');
    } else {
        console.log('ℹ️  Reglas ya existen, no se insertaron duplicados');
    }

    await client.query('COMMIT');
    console.log('\n🎉 Migración completada exitosamente.');
} catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', err.message);
} finally {
    client.release();
    await pool.end();
}
