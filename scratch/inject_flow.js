import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});
import pool from '../server/config/db.js';

const nodes = [
  { id: 'trigger_tiktok', type: 'trigger', title: 'Input Idea / Topic', subtitle: 'Godzilla CM', icon: 'Sparkles', x: 100, y: 300, color: '#f59e0b', pm2_process: '' },
  { id: 'action_plan', type: 'action', title: 'Planificador IA', subtitle: 'Gemini Genera Script', icon: 'Wand2', x: 400, y: 300, color: '#a855f7', pm2_process: 'ai-core' },
  { id: 'action_render', type: 'action', title: 'MediaWorker', subtitle: 'Ensambla Imágenes y Voz', icon: 'Video', x: 700, y: 300, color: '#3b82f6', pm2_process: 'media-worker' },
  { id: 'action_cm', type: 'action', title: 'Aprobación CEO', subtitle: 'Panel Estudio', icon: 'Shield', x: 1000, y: 300, color: '#10b981', pm2_process: '' }
];
const edges = [
  { id: 'e1', source: 'trigger_tiktok', target: 'action_plan', color: '#f59e0b' },
  { id: 'e2', source: 'action_plan', target: 'action_render', color: '#a855f7' },
  { id: 'e3', source: 'action_render', target: 'action_cm', color: '#3b82f6' }
];

pool.query("INSERT INTO automation_flow (name, created_by, health, nodes, edges) VALUES ($1, $2, $3, $4, $5) RETURNING id", ['🎬 Fábrica de Contenido Viral', 'jareg', 'online', JSON.stringify(nodes), JSON.stringify(edges)])
  .then(r => { console.log('✅ Flujo creado con ID:', r.rows[0].id); process.exit(0); })
  .catch(e => { console.error('Error:', e); process.exit(1); });
