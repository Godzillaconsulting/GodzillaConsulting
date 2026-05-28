import pool from '../server/config/db.js';

const payload = {
    voice: "edge:es-MX-JorgeNeural",
    source: "manual_cockers",
    sceneCount: 5,
    scenes: {
        "NARRACION ESCENA 1": "La Selección Mexicana tiene una historia épica en los Mundiales. Desde su primera participación, el Tri ha demostrado corazón, garra y talento frente a las mejores selecciones del mundo. Cada cuatro años, millones de mexicanos se unen en torno a un mismo sueño: ver a México levantar la Copa del Mundo.",
        "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "Mexican national football team celebrating a goal in a packed stadium, green white red jerseys, dramatic lighting, ultra realistic cinematic photography, World Cup atmosphere",

        "NARRACION ESCENA 2": "En el Mundial de 1986, México fue sede de uno de los torneos más emocionantes de la historia. La selección azteca llegó a cuartos de final en casa propia, derrotando a Bulgaria y empujando a Alemania a los límites. El Azteca rugió como nunca antes lo había hecho, y el mundo entero se rindió ante la pasión mexicana.",
        "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "Estadio Azteca Mexico City 1986 World Cup, packed crowd with Mexican flags, green pitch under floodlights at night, cinematic epic photography, dramatic aerial view",

        "NARRACION ESCENA 3": "Hugo Sánchez, uno de los mejores delanteros que ha dado México al mundo, brilló con luz propia en ese torneo y demostró que el fútbol mexicano tenía el nivel para competir contra cualquier rival. Su talento y personalidad convirtieron al Tri en un referente internacional.",
        "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "Hugo Sanchez Mexico number 9 jersey celebrating a goal in the 1986 World Cup, dynamic action shot, cinematic sports photography, stadium crowd going wild, ultra realistic",

        "NARRACION ESCENA 4": "Hoy, la nueva generación del Tri sueña con repetir y superar aquellas gestas históricas. Jugadores como Guillermo Ochoa, Hirving Lozano y Edson Álvarez llevan en sus espaldas la ilusión de todo un país, con la determinación de llegar más lejos que nunca en la historia del fútbol mexicano.",
        "VISUAL ESCENA 4 (Prompt Imagen Detallado)": "Modern Mexican national team players Ochoa Lozano Alvarez training on pitch with Mexican flags in background, sunrise golden hour lighting, cinematic sports photography",

        "NARRACION ESCENA 5 (CTA)": "La historia del Tri es una historia de lucha, de orgullo y de identidad. Cada partido es una oportunidad de demostrar que México tiene el talento y la determinación para conquistar el mundo. ¡Arriba el Tri! Si eres parte de esta pasión y quieres contenido así para tu marca, visita Godzilla Consulting y lleva tu estrategia digital al siguiente nivel.",
        "VISUAL ESCENA 5 (Prompt Imagen Detallado)": "Mexican football fans celebrating in the streets wearing green jerseys waving huge Mexican flags, confetti falling, night time celebration, cinematic wide shot ultra realistic",
    }
};

const title = "🏆 La Historia Épica de la Selección Mexicana en los Mundiales";
const prompt = "El Tri en el Mundial — historia, pasión y sueños de un país entero";

const result = await pool.query(`
    INSERT INTO studio_tasks 
        (title, prompt, status, content_type, assigned_to, tags, priority, media_payload, created_by)
    VALUES 
        ($1, $2, 'pending_render', 'video', 'auto', $3::jsonb, 'alta', $4, 'manual')
    RETURNING id, title, status
`, [title, prompt, JSON.stringify(['Mundial', 'Selección Mexicana', 'Fútbol']), JSON.stringify(payload)]);

console.log('✅ Tarea creada:', result.rows[0]);
await pool.end();
