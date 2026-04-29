const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function insertTask() {
    const title = 'TEST TIKTOK - Tendencias Virales IA';
    const prompt = 'Un video dinámico estilo TikTok explicando cómo la Inteligencia Artificial está cambiando la creación de contenido viral en 2026. Mencionar herramientas como Groq y Cerebras.';
    const assigned_to = 'alex';
    const tags = JSON.stringify(['Tendencias Virales', 'Inteligencia Artificial', 'TikTok']);
    const priority = 'alta';
    const status = 'pending_cm_approval';
    const content_type = 'video';
    const ig_publish_date = new Date(Date.now() + 15 * 60000).toISOString(); // 15 minutos en el futuro
    const media_payload = JSON.stringify([{
        url: '/placeholder_video.mp4', 
        provider: 'Sora LCM', 
        isVideo: true
    }]);

    try {
        const query = `INSERT INTO studio_tasks 
            (title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date, media_payload, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'system') RETURNING id`;
        
        const res = await pool.query(query, [title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date, media_payload]);
        console.log('Task inserted successfully with ID:', res.rows[0].id);
    } catch (e) {
        console.error('Error inserting task:', e.message);
    } finally {
        await pool.end();
    }
}
insertTask();
