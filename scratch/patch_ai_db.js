import pool from '../server/config/db.js';

const patchDB = async () => {
    try {
        console.log('Parcheando DB online con tablas faltantes...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS studio_tasks (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              title VARCHAR(255),
              prompt TEXT,
              assigned_to VARCHAR(100),
              tags JSONB,
              priority VARCHAR(50) DEFAULT 'Media',
              content_type VARCHAR(50),
              status VARCHAR(50) DEFAULT 'pending',
              media_payload JSONB,
              publish_targets JSONB,
              ig_publish_date TIMESTAMPTZ,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS goyi_learning (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              original_prompt TEXT,
              improved_prompt TEXT,
              context_type VARCHAR(50),
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tablas studio_tasks y goyi_learning creadas u obtenidas correctamente.');
        process.exit();
    } catch (e) {
        console.error('❌ Error patching:', e);
        process.exit(1);
    }
};

patchDB();
