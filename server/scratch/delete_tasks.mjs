import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ user: 'postgres', host: 'localhost', database: 'godzilla', password: 'godzilla2026', port: 5432 });
const r = await p.query(`DELETE FROM studio_tasks WHERE status NOT IN ('published')`);
console.log('✅ Tareas borradas:', r.rowCount);
await p.end();
