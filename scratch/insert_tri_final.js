import pool from '../server/config/db.js';

// Borrar task 10 anterior si existe
await pool.query('DELETE FROM studio_tasks WHERE id IN (10, 11)');

const payload = {
    voice: 'edge:es-MX-JorgeNeural',
    sceneCount: 5,
    scenes: {
        'NARRACION ESCENA 1': 'La Selección Mexicana es una de las más queridas del mundo. Con corazón, garra y talento, el Tri ha escrito páginas épicas en la historia del fútbol mundial. Millones de aficionados se unen bajo una misma bandera, la verde, blanca y roja de México.',
        'VISUAL ESCENA 1 (Prompt Imagen Detallado)': 'Mexican national soccer team celebrating victory, green jerseys, stadium full of fans, confetti, dramatic lighting, cinematic photography',
        
        'NARRACION ESCENA 2': 'En 1986, México fue sede del Mundial más emocionante de la historia. El Estadio Azteca vibró como nunca antes. La Selección llegó a cuartos de final frente a miles de aficionados que soñaban con ver a su equipo levantar la copa del mundo.',
        'VISUAL ESCENA 2 (Prompt Imagen Detallado)': 'Estadio Azteca 1986 World Cup Mexico aerial view packed stadium green pitch Mexican flags everywhere golden hour lighting epic cinematic',
        
        'NARRACION ESCENA 3': 'Hugo Sánchez, leyenda del fútbol mexicano y mundial, deslumbró con su velocidad y habilidad. Su acrobacia puso el nombre de México en lo más alto del fútbol europeo. La FIFA lo nombró uno de los cinco mejores delanteros del siglo veinte.',
        'VISUAL ESCENA 3 (Prompt Imagen Detallado)': 'Hugo Sanchez Mexico football legend bicycle kick celebration retro 1980s stadium crowd going wild cinematic sports photography dramatic lighting',
        
        'NARRACION ESCENA 4': 'La generación actual del Tri sueña con superar esas gestas históricas. Jugadores como Guillermo Ochoa, el Chucky Lozano y Edson Álvarez llevan el peso del sueño de toda una nación. Con disciplina, sacrificio y talento, México busca brillar en el próximo Mundial.',
        'VISUAL ESCENA 4 (Prompt Imagen Detallado)': 'Mexico national team modern players training Ochoa Lozano Alvarez sunrise golden light cinematic sports photography Mexican eagle jersey',
        
        'NARRACION ESCENA 5 (CTA)': 'La historia del Tri es una historia de orgullo, pasión e identidad. Cada partido es una oportunidad de demostrar que México tiene el nivel para conquistar el mundo. Arriba el Tri. Si quieres contenido viral así para tu marca, visita Godzilla Consulting punto IA y lleva tu marketing digital al siguiente nivel.',
        'VISUAL ESCENA 5 (Prompt Imagen Detallado)': 'Mexican football fans street celebration huge crowd green jerseys waving Mexican flags confetti fireworks night celebration cinematic wide shot'
    }
};

const r = await pool.query(
    `INSERT INTO studio_tasks (title, prompt, status, content_type, assigned_to, tags, priority, media_payload, created_by) 
     VALUES ($1, $2, 'pending_render', 'video', 'auto', $3::jsonb, 'alta', $4, 'manual') 
     RETURNING id, title, status`,
    [
        '🏆 La Historia Épica del Tri en el Mundial',
        'Selección Mexicana Mundial historia épica',
        JSON.stringify(['Mundial', 'Tri', 'Fútbol']),
        JSON.stringify(payload)
    ]
);
console.log('✅ Task creada:', r.rows[0]);
await pool.end();
