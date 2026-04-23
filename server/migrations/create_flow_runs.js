import pool from '../config/db.js';

async function createFlowRunsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS flow_runs (
                id          SERIAL PRIMARY KEY,
                flow_id     INTEGER DEFAULT 1,
                status      VARCHAR(20) NOT NULL DEFAULT 'running',
                source      VARCHAR(100),
                started_at  TIMESTAMP DEFAULT NOW(),
                finished_at TIMESTAMP,
                duration_ms INTEGER,
                log         JSONB DEFAULT '[]'::jsonb
            );
        `);
        console.log('✅ Tabla flow_runs creada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creando tabla flow_runs:', err.message);
        process.exit(1);
    }
}

createFlowRunsTable();
