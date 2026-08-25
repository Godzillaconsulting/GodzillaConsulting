import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'godzilla',
    password: 'godzilla2026',
    port: 5432,
});

async function run() {
    try {
        const scenes = [
            {
                narration: "A simple vista, Gaspi y Oliver Tree parecen solo dos creadores de contenido bizarros que disfrutan incomodando a la gente. Pero, ¿y si te digo que hay una conspiración masiva detrás de ellos? Y las pruebas son imposibles de ignorar. Prepárate porque esto te va a volar la cabeza por completo.",
                visual_prompt: "Cinematic dark room, a corkboard filled with photos of the influencer Gaspi and the singer Oliver Tree connected by red strings. Eerie green lighting, hyper-detailed, 8k resolution.",
                video_prompt: "Slow push-in camera movement towards the center of the corkboard, revealing a blurred photo that mixes both faces."
            },
            {
                narration: "Analiza su patrón psicológico. Ambos usan ropa intencionalmente absurda, cortes de pelo ridículos y gafas gigantes para ocultar sus verdaderas expresiones. Tienen un sentido del humor caótico que rompe la cuarta pared y deja a todos a su alrededor extremadamente tensos. Pero eso no es lo más extraño.",
                visual_prompt: "Split screen style concept art. On the left, a silhouette resembling Gaspi in a suit on the streets of Buenos Aires. On the right, a silhouette resembling Oliver Tree in his oversized jacket. Neon accents, glitch effect.",
                video_prompt: "Subtle camera shake, glitching transition between the two silhouettes."
            },
            {
                narration: "Si te fijas en los picos de viralidad de sus carreras, NUNCA están activos al mismo tiempo. Cuando Oliver Tree hace una pausa o 'se retira' de la música, los videos de Gaspi alcanzan millones de reproducciones. Es como si el algoritmo estuviera diseñado para alternar la atención masiva entre ambos hemisferios.",
                visual_prompt: "A highly detailed calendar with red X marks on dates, floating in a void of digital code. Matrix style atmosphere, dark and mysterious.",
                video_prompt: "The camera orbits slowly around the floating calendar while the red X marks glow menacingly."
            },
            {
                narration: "En los foros más oscuros de internet, los expertos en comportamiento digital afirman que no son competencia. Son parte de un proyecto clasificado de ingeniería social financiado por grandes corporaciones del entretenimiento para descubrir exactamente cuánto absurdo puede tolerar la mente humana antes de colapsar.",
                visual_prompt: "A shadowy corporate boardroom with men in suits looking at multiple glowing monitors showing viral internet clips. High contrast, cinematic lighting, cyberpunk feel.",
                video_prompt: "Slow pan across the faceless executives looking at the screens."
            },
            {
                narration: "Algunos dicen que son clones o peones del mismo experimento. Cada reacción de confusión que dejas en sus videos, alimenta su base de datos para crear la próxima estrella de internet incomprensible. Y tú, ¿qué piensas de esto? ¿Crees que son la misma mente maestra? Te leo en los comentarios.",
                visual_prompt: "A mesmerizing abstract mirror maze, reflections showing distorted faces. Deep blue and purple neon lights.",
                video_prompt: "Camera slowly moving forward into the mirror maze, creating a hypnotic loop."
            }
        ];

        const title = "La conexión Gaspi y Oliver Tree";
        const prompt = scenes.map((s, i) => `Escena ${i+1}: ${s.narration}`).join('\n');
        const mediaPayload = {
            source: 'manual_planner',
            niche: 'Misterios y Conspiraciones',
            month: 'Junio',
            year: 2026,
            scenes: { Tema: title, scenes },
            voice: 'elevenlabs:21m00Tcm4TlvDq8ikWAM', // Voz misteriosa/documental predeterminada
        };

        const query = `
            INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, content_type, ig_publish_date, status, media_payload, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        const values = [
            title, 
            prompt, 
            'auto', 
            JSON.stringify(['Misterio', 'ai-planner']),
            'Alta',
            'Video Corto',
            new Date().toISOString().split('T')[0],
            'pending_render', // Para que lo procese el MediaWorker directamente
            JSON.stringify(mediaPayload),
            'AI Assistant (Direct Inject)'
        ];

        const res = await pool.query(query, values);
        console.log("¡Tarea inyectada exitosamente con ID:", res.rows[0].id);
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
