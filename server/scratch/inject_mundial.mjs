import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'godzilla', password: 'godzilla2026', port: 5432 });

// Escenas con narración MÍNIMA — el worker investigará y reescribirá todo
const scenes = [
  {
    narration: 'Este mundial tiene datos que muy pocos conocen.',
    visual: 'FIFA World Cup 2026 stadium opening ceremony',
    video: 'Aerial cinematic shot of a packed World Cup stadium'
  },
  {
    narration: 'Los números del Mundial 2026 rompen todos los récords históricos.',
    visual: 'World Cup 2026 record statistics infographic',
    video: 'Dynamic scoreboard showing record-breaking stats'
  },
  {
    narration: 'Hay equipos y jugadores con historias increíbles que no te contaron.',
    visual: 'World Cup 2026 surprise team celebrating on pitch',
    video: 'Slow motion celebration of unexpected World Cup victory'
  },
  {
    narration: 'La sede de este mundial tiene algo único en toda la historia.',
    visual: 'USA Canada Mexico 2026 World Cup host cities map',
    video: 'Timelapse of multiple host cities USA Canada Mexico'
  },
  {
    narration: '¿Ya sabías estos datos? Comenta cuál te sorprendió más.',
    visual: 'World Cup 2026 trophy final match fans celebration',
    video: 'Fans celebrating World Cup 2026 final in stadium'
  }
];

const payload = {
  source: 'manual_inject',
  niche: 'Deportes / Fútbol / Mundial 2026',
  month: 'Junio',
  year: '2026',
  voice: 'edge:es-MX-JorgeNeural',
  scenes: scenes,
  sceneCount: 5,
  investigated: false   // ← forzar que el worker investigue
};

const res = await pool.query(
  `INSERT INTO studio_tasks (title, prompt, status, priority, assigned_to, tags, media_payload, created_at)
   VALUES ($1, $2, 'pending_render', 'Alta', 'auto', $3, $4, NOW())
   RETURNING id`,
  [
    'Datos curiosos del Mundial 2026 que nadie te dijo',
    'Datos curiosos, récords e historias del Mundial FIFA 2026 USA-Canadá-México',
    JSON.stringify(['deportes', 'mundial', 'futbol', 'viral']),
    JSON.stringify([payload])
  ]
);

console.log('✅ Tarea creada:', res.rows[0].id);
await pool.end();
