import pool from '../config/db.js';

const runMigration = async () => {
    try {
        console.log('🚀 Creando tablas de Studio en DB Local...');
        
        // Tabla para albergar los scripts y los resultados generados por IA
        await pool.query(`
            CREATE TABLE IF NOT EXISTS studio_tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                prompt TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                assigned_to VARCHAR(100) DEFAULT 'alex_cockers',
                media_payload JSONB DEFAULT '[]'::jsonb,
                tags JSONB DEFAULT '[]'::jsonb,
                priority VARCHAR(50) DEFAULT 'Media',
                content_type VARCHAR(100) DEFAULT 'Video',
                ig_publish_date TIMESTAMP,
                publish_targets JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla studio_tasks creada/verificada.');

        // Agregar columna feedback_notes si no existe (safe alter)
        await pool.query(`ALTER TABLE studio_tasks ADD COLUMN IF NOT EXISTS feedback_notes TEXT;`);
        console.log('✅ Columna feedback_notes verificada.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS goyi_learning (
                id SERIAL PRIMARY KEY,
                original_prompt TEXT NOT NULL,
                improved_prompt TEXT NOT NULL,
                context_type VARCHAR(100) DEFAULT 'studio_canvas',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla goyi_learning creada/verificada.');

        console.log('🎉 Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando tablas:', error);
        process.exit(1);
    }
};

runMigration();
