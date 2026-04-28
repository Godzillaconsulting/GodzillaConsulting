import pool from './server/config/db.js';
async function run() {
    try {
        const query = "UPDATE studio_tasks SET media_payload = $1, status = 'pending' WHERE title LIKE '%Tendencia B2B: Agentes Fantasma%'";
        const payload = JSON.stringify([{ url: 'https://videos.pexels.com/video-files/853889/853889-hd_1920_1080_25fps.mp4', isVideo: true }]);
        await pool.query(query, [payload]);
        console.log('✅ DB actualizada con el video renderizado simulado.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
