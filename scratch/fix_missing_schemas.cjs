const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla'
});

async function run() {
    try {
        console.log("Iniciando reconstrucción de esquemas del AdminStudio...");

        // 1. Social Queue
        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_queue (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50) NOT NULL,
                caption TEXT,
                visual_prompt TEXT,
                media_url TEXT,
                media_type VARCHAR(50),
                scheduled_for TIMESTAMP,
                status VARCHAR(50) DEFAULT 'pending',
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla 'social_queue' creada/verificada.");

        // 2. Task Comments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS task_comments (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                author_id INTEGER REFERENCES admins(id),
                tagged_user_ids JSONB,
                target_type VARCHAR(50) NOT NULL,
                target_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla 'task_comments' creada/verificada.");

        // 3. Studio Tasks
        await pool.query(`
            CREATE TABLE IF NOT EXISTS studio_tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                prompt TEXT NOT NULL,
                assigned_to VARCHAR(100),
                tags JSONB,
                priority VARCHAR(50) DEFAULT 'Media',
                content_type VARCHAR(100) DEFAULT 'Video',
                ig_publish_date TIMESTAMP,
                status VARCHAR(50) DEFAULT 'En Cola',
                media_payload JSONB,
                publish_targets JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla 'studio_tasks' creada/verificada.");

        // 4. Goyi Learning
        await pool.query(`
            CREATE TABLE IF NOT EXISTS goyi_learning (
                id SERIAL PRIMARY KEY,
                original_prompt TEXT NOT NULL,
                improved_prompt TEXT NOT NULL,
                context_type VARCHAR(100) DEFAULT 'studio_canvas',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla 'goyi_learning' creada/verificada.");

        // 5. IT Bugs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS it_bugs (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                priority VARCHAR(50) DEFAULT 'media',
                screenshot_url TEXT,
                reporter_username VARCHAR(100) NOT NULL,
                path_url TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                resolved_by VARCHAR(100),
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla 'it_bugs' creada/verificada.");

        // 6. Fix Analytics (Pixel Events session_id)
        try {
            await pool.query(`ALTER TABLE pixel_events ADD COLUMN session_id VARCHAR(255);`);
            // Set default anonymous to existing rows
            await pool.query(`UPDATE pixel_events SET session_id = 'anonymous' WHERE session_id IS NULL;`);
            console.log("✅ Columna 'session_id' inyectada en 'pixel_events'.");
        } catch (e) {
            if (e.code === '42701') {
                console.log("⚠️ La columna 'session_id' ya existía en 'pixel_events'.");
            } else {
                console.error("❌ Error alterando 'pixel_events':", e.message);
            }
        }

        console.log("🚀 Todos los esquemas auxiliares han sido restaurados con éxito.");
    } catch (e) {
        console.error("Error Global:", e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
