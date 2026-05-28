import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
import pool from '../server/config/db.js';

async function run() {
  try {
    console.log("Restoring Task 29 as pending_cm_approval...");
    
    // 1. Delete task 29 if it exists
    await pool.query("DELETE FROM studio_tasks WHERE id = 29");
    
    const title = "🏆 Cruz Azul Campeón Clausura 2026";
    const prompt = "Final Liga MX Clausura 2026 Cruz Azul vs Pumas";
    const assigned_to = "auto";
    const priority = "Alta";
    const content_type = "Video / Reel";
    const status = "pending_cm_approval";
    const publish_targets = ["instagram"];
    
    const media_payload = [
      {
        "url": "/outputs/task_29_final_1779999098122.mp4",
        "voice": "elevenlabs:y2ijeTfmnXjzheHO6zeN",
        "scenes": {
          "NARRACION ESCENA 1": "¡La Máquina hace historia! El Cruz Azul es el nuevo campeón del Clausura 2026 de la Liga MX. El equipo celeste consiguió su décima estrella en una final dramática frente a los Pumas de la UNAM, consolidando una temporada de ensueño.",
          "NARRACION ESCENA 2": "El partido de ida en el Estadio Ciudad de los Deportes terminó con un cerrado empate a cero goles, dejando todo por decidirse en la vuelta. La tensión se sentía en el aire mientras ambas aficiones sabían que solo noventa minutos los separaban de la gloria.",
          "NARRACION ESCENA 3": "En el partido decisivo en Ciudad Universitaria, la emoción explotó. Con garra y pasión, el Cruz Azul logró imponerse con un marcador de dos goles a uno. Cada jugada disputada al límite dejó el alma de los jugadores en la cancha.",
          "NARRACION ESCENA 4": "Con un marcador global definitivo de dos a uno, Cruz Azul alza la Décima. Pumas luchó hasta el último segundo, pero la Máquina de Joel Huiqui de Cruz Azul demostró solidez y concentración táctica para coronar a un gran campeón en el último suspiro.",
          "NARRACION ESCENA 5 (CTA)": "Este décimo título del Cruz Azul quedará grabado para siempre en la afición. ¿Qué te pareció esta gran final? Déjanos tu opinión en los comentarios, dale like al video y suscríbete para estar siempre al día con lo mejor del fútbol mexicano.",
          "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "A dynamic photo of professional soccer players wearing royal blue jerseys with a red and white crest on the chest, celebrating a championship victory on the green grass pitch of a soccer stadium at night, stadium stands filled with fans under floodlights, blue and white confetti falling in the air, professional sports photography, realistic, high-fidelity photo, no watermark, no text",
          "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "Wide angle view of Estadio Ciudad de los Deportes soccer stadium packed with fans under bright night floodlights, showing steep concrete stands painted in deep blue and red, green grass pitch, dramatic atmospheric smoke, professional sports stadium photography, realistic, no text, no watermark",
          "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "Action shot of an athletic professional soccer player with light-brown short hair, wearing a royal blue jersey with a red and white circular crest on the chest, white shorts, kicking a soccer ball dynamically on the grass pitch of Estadio Olímpico Universitario at night, dramatic dynamic stadium floodlights, professional sports action photo, realistic, high-fidelity sports photo, no watermark, no text",
          "VISUAL ESCENA 4 (Prompt Imagen Detallado)": "A professional soccer coach of Mexican descent, athletic build, short black hair, tan skin, wearing a white button-up shirt and dark navy blue trousers, celebrating passionately on the pitch of Estadio Olímpico Universitario at night, shouting with joy with arms raised, dramatic stadium lighting, professional sports photography, realistic, high-fidelity photo, no watermark",
          "VISUAL ESCENA 5 (Prompt Imagen Detallado)": "Cruz Azul soccer fans celebrating in the streets of Mexico City at night, waving blue and white flags, blue and white confetti, fireworks in the night sky, highly realistic sports fan celebration, cinematic photography, no watermark, no text",
          "REF_IMAGE ESCENA 1": "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_1.jpg",
          "REF_IMAGE ESCENA 2": "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_2.jpg",
          "REF_IMAGE ESCENA 3": "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_3.jpg",
          "REF_IMAGE ESCENA 4": "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_4.jpg",
          "REF_IMAGE ESCENA 5": "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_5.jpg"
        },
        "sceneCount": 5
      }
    ];

    await pool.query(
      `INSERT INTO studio_tasks (id, title, prompt, assigned_to, priority, status, content_type, publish_targets, media_payload) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        29,
        title,
        prompt,
        assigned_to,
        priority,
        status,
        content_type,
        JSON.stringify(publish_targets),
        JSON.stringify(media_payload)
      ]
    );
    
    // Reset sequence
    await pool.query(`SELECT setval(pg_get_serial_sequence('studio_tasks', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM studio_tasks`);

    console.log("✅ Task 29 successfully restored with status pending_cm_approval!");
  } catch(e) {
    console.error("Error during insertion:", e);
  } finally {
    process.exit(0);
  }
}
run();
