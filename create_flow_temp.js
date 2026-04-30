import pool from './server/config/db.js';

async function createFlow() {
  try {
    const nodes = [
      { id: '1', type: 'trigger', position: { x: 250, y: 100 }, data: { label: 'Programacion Diaria', action: 'cron' } },
      { id: '2', type: 'action', position: { x: 250, y: 250 }, data: { label: 'Paquete de Contenido Social', action: 'generate_content' } }
    ];
    const edges = [
      { id: 'e1-2', source: '1', target: '2' }
    ];
    
    const res = await pool.query(
      `INSERT INTO automation_flow (name, nodes, edges, health, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Fábrica de Contenido Viral', JSON.stringify(nodes), JSON.stringify(edges), 'online', 'admin']
    );
    console.log('Created flow ID:', res.rows[0].id);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

createFlow();
