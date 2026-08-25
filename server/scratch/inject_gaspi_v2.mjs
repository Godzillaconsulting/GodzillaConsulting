import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'godzilla', password: 'godzilla2026', port: 5432 });

const scenes = [
    {
        narration: 'Gaspi y Oliver Tree nunca están activos al mismo tiempo. Cuando uno sube, el otro desaparece.',
        visual_prompt: 'Dark cinematic corkboard with photos of two mysterious influencers connected by red strings, eerie green light, 8k.',
        video_prompt: 'Slow push-in towards the corkboard center, revealing the connection.'
    },
    {
        narration: 'Ambos usan ropa absurda, cortes ridículos y gafas enormes. No para llamar la atención. Para ocultar algo.',
        visual_prompt: 'Split screen silhouettes: one in oversized jacket Buenos Aires streets, other in giant glasses LA. Neon glitch effect.',
        video_prompt: 'Glitch transition between both silhouettes, subtle camera shake.'
    },
    {
        narration: 'Sus picos virales nunca se cruzan. El algoritmo los alterna como si alguien controlara la atención masiva.',
        visual_prompt: 'Floating dark calendar with red X marks glowing ominously, matrix code background, mysterious void.',
        video_prompt: 'Slow orbit around the floating calendar, red marks pulse menacingly.'
    },
    {
        narration: 'En foros oscuros de internet los llaman el mismo experimento. Un proyecto para medir cuánto absurdo tolera la mente humana.',
        visual_prompt: 'Shadowy corporate boardroom, faceless suits watching multiple monitors showing viral clips, high contrast cyberpunk lighting.',
        video_prompt: 'Slow pan across the faceless executives, monitors flickering with viral content.'
    },
    {
        narration: 'Cada comentario tuyo alimenta su base de datos. ¿Son la misma mente? ¿O peones de algo mayor? Dime lo que crees.',
        visual_prompt: 'Abstract mirror maze, distorted reflections showing merged faces of two influencers, deep blue and purple neon lights, cinematic depth of field.',
        video_prompt: 'Camera moving forward into the mirror maze, hypnotic loop effect fading to black.'
    }
];

const payload = {
    source: 'ceo_studio',
    niche: 'Misterios y Conspiraciones',
    month: 'Junio',
    year: 2026,
    scenes: { Tema: 'La conexión Gaspi y Oliver Tree', scenes },
    voice: 'edge:es-ES-EliasNeural'  // Voz mist
};

async function run() {
    try {
        const res = await pool.query(
            `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, content_type, ig_publish_date, status, media_payload, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
                'La conexión Gaspi y Oliver Tree',
                'Conspiración sobre Gaspi y Oliver Tree — misterio viral',
                'auto',
                JSON.stringify(['Conspiración', 'misterio', 'viral']),
                'Alta',
                'Video Corto',
                new Date().toISOString().split('T')[0],
                'pending_render',
                JSON.stringify(payload),
                'CEO Studio'
            ]
        );
        console.log('✅ Tarea Gaspi inyectada con ID:', res.rows[0].id);
    } catch(e) {
        console.error('❌ Error:', e.message);
    } finally {
        pool.end();
    }
}
run();
