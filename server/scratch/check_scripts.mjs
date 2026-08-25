import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ user: 'postgres', host: 'localhost', database: 'godzilla', password: 'godzilla2026', port: 5432 });
const r = await p.query('SELECT id,title,status,media_payload FROM studio_tasks ORDER BY id DESC LIMIT 3');
r.rows.forEach(row => {
  let pl = row.media_payload;
  while (typeof pl === 'string') { try { pl = JSON.parse(pl); } catch(e) { break; } }
  if (Array.isArray(pl)) pl = pl[0];
  const scenes = pl && pl.scenes;
  console.log('=== Task', row.id, '|', row.status, '===');
  console.log('Title:', row.title);
  console.log('Investigated:', pl && pl.investigated);
  console.log('Has investContext:', !!(pl && pl.investigationContext));
  if (Array.isArray(scenes)) {
    scenes.forEach((s, i) => console.log(`  Escena ${i+1}:`, s.narration));
  } else if (scenes) {
    const keys = Object.keys(scenes).filter(k => k.includes('NARRACION'));
    keys.forEach(k => console.log(' ', k, ':', scenes[k]));
  }
  console.log('');
});
await p.end();
