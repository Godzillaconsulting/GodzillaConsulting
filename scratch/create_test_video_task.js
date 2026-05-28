import pool from '../server/config/db.js';

async function run() {
  try {
    const mediaPayload = {
      source: 'manual_studio',
      niche: 'Deportes',
      voice: 'Automático',
      sceneCount: 3,
      scenes: {
        "NARRACION ESCENA 1": "Prepárate para el clásico del fútbol español en este 2026.",
        "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "Un estadio de fútbol lleno de fanáticos con banderas blancas y azulgranas.",
        "NARRACION ESCENA 2": "El Real Madrid y el Barcelona se enfrentan en un duelo épico.",
        "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "Un primer plano de un balón de fútbol oficial en el césped del estadio.",
        "NARRACION ESCENA 3 (CTA)": "¿Quién crees que se llevará la victoria esta vez? Deja tu comentario.",
        "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "Una copa brillante de la Champions League sobre un pedestal iluminado."
      }
    };

    const res = await pool.query(
      `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, media_payload) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        '🔥 El Clásico 2026 Real Madrid vs Barcelona',
        'Video sobre el Clásico Real Madrid vs Barcelona en la Champions 2026',
        'auto',
        JSON.stringify(['Deportes', 'Clásico']),
        'Alta',
        'pending_render',
        'Video / Reel',
        JSON.stringify(mediaPayload)
      ]
    );
    console.log(`✅ Test video task created with ID #${res.rows[0].id}`);
  } catch(e) {
    console.error('Error inserting task:', e);
  }
  process.exit(0);
}
run();
