import pool from './server/config/db.js';

async function run() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const fbCopy = `🚨 El modelo de agencia tradicional está MUERTO.

Mientras tú sigues haciendo tareas repetitivas a mano, otras agencias están usando Make y n8n para automatizar el 80% de sus procesos operativos. 🤖⚡

No se trata de "reemplazar humanos", se trata de que tu equipo deje de ser un robot copiando y pegando datos. 

¿Quieres saber qué 3 procesos deberías automatizar HOY MISMO en tu negocio B2B? 👇 

Déjame la palabra "SISTEMA" en los comentarios y te mando nuestro mapa exacto de automatización.

#AutomatizaciónIA #SaaSSales #GrowthHacking2026 #GodzillaConsulting`;

    await pool.query(
      `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        '🔥 Post FB (3:05 PM) - Automatización Make/n8n',
        fbCopy,
        'JareG',
        JSON.stringify(['Facebook', 'Automatización', 'Urgente']),
        'High',
        'pending',
        'Post / Texto',
        today
      ]
    );
    console.log('Insertado');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
