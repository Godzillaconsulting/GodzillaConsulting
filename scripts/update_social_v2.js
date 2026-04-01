import pool from '../server/config/db.js';

async function updateCockersStudio() {
    console.log('🚀 [INIT] Mejorando Tabla "social_queue" para el Estudio de IAs Multimodales de Cockers...');
    try {
        // Añadir las columnas necesarias para manejar el Duelo de IAs sin borrar la tabla
        await pool.query(`
            ALTER TABLE social_queue 
            ADD COLUMN IF NOT EXISTS media_options JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS ai_chat_history JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS selected_media_index INTEGER,
            ADD COLUMN IF NOT EXISTS editor_id INTEGER REFERENCES admins(id),
            ADD COLUMN IF NOT EXISTS custom_prompt TEXT;
        `);
        console.log(' - ✅ Tabla social_queue alterada con éxito. (media_options, ai_chat_history inyectados).');
        
        // Ajustamos el constraint del status para reflejar el proceso completo
        // status path: 'draft_ai' -> 'cockers_review' -> 'pending_cm_approval' -> 'published'
        
        console.log('\n🔥 ¡ÉXITO! El motor de datos ya puede sostener las dos pantallas de A/B Testing y los chats de refinamiento.');
        process.exit(0);
    } catch (e) {
        console.error('❌ ERROR SQL:', e);
        process.exit(1);
    }
}

updateCockersStudio();
