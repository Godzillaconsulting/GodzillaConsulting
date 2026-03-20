/**
 * MIGRACIÓN: Tablas del sistema de newsletter
 * Crea: subscribers, newsletters, queue_log
 * Ejecutar: node -e "import('./migrations/create_newsletter_tables.js')"
 */
import pool from '../config/db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creando tablas del sistema de newsletter...\n');

        // ── Suscriptores ────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id              SERIAL PRIMARY KEY,
                email           VARCHAR(255) UNIQUE NOT NULL,
                name            VARCHAR(100),
                status          VARCHAR(20)  DEFAULT 'active',
                source          VARCHAR(50)  DEFAULT 'website',
                subscribed_at   TIMESTAMP    DEFAULT NOW(),
                unsubscribed_at TIMESTAMP
            );
        `);
        console.log('✅ Tabla subscribers OK');

        // ── Boletines (historial) ────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS newsletters (
                id               SERIAL PRIMARY KEY,
                subject          VARCHAR(255) NOT NULL,
                body_html        TEXT         NOT NULL,
                attachment_url   VARCHAR(500),
                sent_at          TIMESTAMP    DEFAULT NOW(),
                total_recipients INT          DEFAULT 0,
                sent_count       INT          DEFAULT 0,
                failed_count     INT          DEFAULT 0,
                status           VARCHAR(20)  DEFAULT 'draft'
            );
        `);
        console.log('✅ Tabla newsletters OK');

        // ── Queue log (para resume en PM2) ───────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS queue_log (
                id               SERIAL PRIMARY KEY,
                newsletter_id    INT REFERENCES newsletters(id) ON DELETE CASCADE,
                subscriber_email VARCHAR(255) NOT NULL,
                status           VARCHAR(20)  DEFAULT 'pending',
                attempts         INT          DEFAULT 0,
                last_attempt     TIMESTAMP,
                error_msg        TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_queue_log_status      ON queue_log(status);
            CREATE INDEX IF NOT EXISTS idx_queue_log_newsletter   ON queue_log(newsletter_id);
            CREATE INDEX IF NOT EXISTS idx_subscribers_email      ON subscribers(email);
            CREATE INDEX IF NOT EXISTS idx_subscribers_status     ON subscribers(status);
        `);
        console.log('✅ Tabla queue_log + índices OK');

        console.log('\n🎉 Migración completada. Sistema de newsletter listo.');
    } catch (err) {
        console.error('❌ Error en migración:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
