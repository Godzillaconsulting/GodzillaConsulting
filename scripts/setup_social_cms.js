import pool from '../server/config/db.js';

async function buildSocialCMS() {
    console.log('🏗️ [INIT] Construyendo Módulo "CM Asana-Style" en Neon DB...');
    try {
        // 1. Tabla del Calendario de Redes (Donde Gemini deposita ideas para que Judith las revise)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_queue (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50) DEFAULT 'meta',
                caption TEXT NOT NULL,
                visual_prompt TEXT,
                media_url TEXT,
                media_type VARCHAR(20),
                scheduled_for TIMESTAMP,
                status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'approved', 'published', 'rejected'
                created_by VARCHAR(100) DEFAULT 'gemini-bot',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log(' - ✅ Tabla social_queue (Calendario de Publicaciones) creada.');

        // 2. Tabla de Comentarios y Etiquetados (Para que Judith deje notas)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS task_comments (
                id SERIAL PRIMARY KEY,
                target_type VARCHAR(50), -- Ej: 'social_post', 'landing_page_slot'
                target_id INTEGER,
                author_id INTEGER REFERENCES admins(id),
                content TEXT NOT NULL,
                tagged_user_ids INT[], -- Array con IDs de los responsables (@JareG, etc)
                resolved BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log(' - ✅ Tabla task_comments (Comentarios tipo Asana) creada.');

        // 3. Tabla de Notificaciones (Para que aparezca la "Campanita" en el perfil de JareG)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES admins(id),
                title VARCHAR(255) NOT NULL,
                message TEXT,
                link_url TEXT,
                read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log(' - ✅ Tabla notifications (Campanita de Alertas) creada.');

        console.log('\n🚀 ¡ÉXITO! Infraestructura de Base de Datos para el Calendario y Tareas Lista.');
        process.exit(0);
    } catch (e) {
        console.error('❌ ERROR CRÍTICO SQL:', e);
        process.exit(1);
    }
}

buildSocialCMS();
