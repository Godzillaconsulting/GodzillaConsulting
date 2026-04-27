import 'dotenv/config';
import pool from './server/config/db.js';

async function run() {
  try {
    const niche = "Automatización B2B (Make/n8n)";

    const day = {
      "Tema": "El fin de las agencias manuales",
      "NARRACION ESCENA 1": "🚨 El modelo de agencia tradicional está MUERTO.",
      "TEXTO EN PANTALLA ESCENA 1": "TU AGENCIA ESTÁ MURIENDO 💀",
      "AUDIO Y SFX ESCENA 1": "[SFX: Glitch intenso] Música tensa electrónica.",
      "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "Cinematic close-up of a modern office desk with stacks of papers catching fire, neon blue and magenta lighting, 8k resolution, dramatic shadows.",
      "VIDEO ESCENA 1 (Prompt Movimiento Detallado)": "Slow dolly-in towards the burning papers, the neon lights flicker in the background.",
      "NARRACION ESCENA 2": "Mientras tú haces tareas manuales, otros usan n8n.",
      "TEXTO EN PANTALLA ESCENA 2": "TAREAS MANUALES VS n8n",
      "AUDIO Y SFX ESCENA 2": "[SFX: Whoosh rápido] Beat de transición.",
      "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "A split screen showing a tired person typing on left, and a futuristic glowing robotic brain processing data streams on the right, high contrast.",
      "VIDEO ESCENA 2 (Prompt Movimiento Detallado)": "The robotic brain pulses with light as data flows rapidly around it.",
      "NARRACION ESCENA 3": "Automatiza el 80% de tus procesos operativos.",
      "TEXTO EN PANTALLA ESCENA 3": "AUTOMATIZA EL 80% ⚡",
      "AUDIO Y SFX ESCENA 3": "[SFX: Campana digital] Sube la energía.",
      "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "Abstract glowing golden gears turning seamlessly inside a translucent glass server box, ray-tracing reflections, clean aesthetic.",
      "VIDEO ESCENA 3 (Prompt Movimiento Detallado)": "Gears rotate smoothly, emitting a warm golden glow that illuminates the glass case.",
      "NARRACION ESCENA 4": "Tu equipo no debería ser un robot copiando datos.",
      "TEXTO EN PANTALLA ESCENA 4": "TU EQUIPO NO ES UN ROBOT 🚫",
      "AUDIO Y SFX ESCENA 4": "[SFX: Error digital leve]",
      "VISUAL ESCENA 4 (Prompt Imagen Detallado)": "A group of professionals in silhouette standing looking up at a massive glowing holographic dashboard showing automation flows, dark room.",
      "VIDEO ESCENA 4 (Prompt Movimiento Detallado)": "The camera slowly pans across the professionals as the holographic dashboard lines connect and light up.",
      "NARRACION ESCENA 5 (CTA)": "Comenta SISTEMA y te mando el mapa exacto.",
      "TEXTO EN PANTALLA ESCENA 5": "COMENTA 'SISTEMA' 👇",
      "AUDIO Y SFX ESCENA 5": "[SFX: Ping de notificación éxito]",
      "VISUAL ESCENA 5 (Prompt Imagen Detallado)": "A sleek smartphone displaying a glowing direct message icon hovering over a dark marble table, cinematic lighting, shallow depth of field.",
      "VIDEO ESCENA 5 (Prompt Movimiento Detallado)": "The message icon bounces slightly and glows brighter, creating anticipation."
    };

    // 3. Insert into studio_tasks
    const narrations = [1,2,3,4,5].map(n => {
        const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
        return day[key] ? `Escena ${n}: ${day[key]}` : null;
    }).filter(Boolean).join('\\n');

    const mediaPayload = { source: 'ai_planner', niche, month: 'Abril', year: 2026, scenes: day };
    const isoDate = new Date().toISOString().split('T')[0];

    await pool.query(
        `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date, media_payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            day['Tema'] || 'Automatización B2B (Planner IA)',
            narrations,
            'auto',
            JSON.stringify([niche, 'ai-planner']),
            'Media',
            'pending',
            'Video Corto',
            isoDate,
            JSON.stringify(mediaPayload)
        ]
    );

    console.log('✅ 1 Día Estático Generado e Inyectado a Pendientes.');
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
run();
