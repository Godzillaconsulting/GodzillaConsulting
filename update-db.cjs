const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla'
});

const nodes = [
  { id: 'core1', type: 'action', title: 'Cerebro Central AI', subtitle: 'Motor Principal', icon: 'Brain', x: 600, y: 350, color: '#eab308', pm2_process: 'ai-core' },
  { id: 'core2', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Pinecone Vector DB', icon: 'Network', x: 600, y: 180, color: '#0d9488', pm2_process: 'vector-db' },
  { id: 'core3', type: 'action', title: 'Gemini API', subtitle: 'LLM Core', icon: 'Sparkles', x: 600, y: 520, color: '#4285f4', pm2_process: '' },
  { id: 'edge1', type: 'action', title: 'Cloudflare Workers', subtitle: 'Gateway Edge', icon: 'Cloud', x: 380, y: 350, color: '#f38020', pm2_process: '' },
  { id: 'bot1', type: 'trigger', title: 'Zilla Bot', subtitle: 'Asistente / Atención', icon: 'Bot', x: 150, y: 80, color: '#10b981', pm2_process: 'zilla-bot' },
  { id: 'bot2', type: 'trigger', title: 'Goyi Bot', subtitle: 'Asistente / Cierre', icon: 'Bot', x: 150, y: 190, color: '#ec4899', pm2_process: 'goyi-bot' },
  { id: 'bot3', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', x: 150, y: 300, color: '#25d366', pm2_process: 'whatsapp-bot' },
  { id: 'bot4', type: 'trigger', title: 'TikTok Bot', subtitle: 'Interacción TikTok', icon: 'Video', x: 150, y: 410, color: '#ff0050', pm2_process: 'tiktok-bot' },
  { id: 'bot5', type: 'action', title: 'Bot Newsletter', subtitle: 'Redacción / Difusión', icon: 'Mail', x: 150, y: 520, color: '#f97316', pm2_process: 'newsletter-bot' },
  { id: 'bot6', type: 'action', title: 'Trends Bot', subtitle: 'Analizador Redes', icon: 'TrendingUp', x: 150, y: 630, color: '#8b5cf6', pm2_process: 'trends-bot' },
  { id: 'in1', type: 'trigger', title: 'GoDaddy', subtitle: 'DNS / Dominios', icon: 'Globe', x: 380, y: 80, color: '#1bbb11', pm2_process: '' },
  { id: 'in2', type: 'trigger', title: 'Vercel', subtitle: 'Hosting / Deployment', icon: 'Server', x: 380, y: 630, color: '#ffffff', pm2_process: '' },
  { id: 'out1', type: 'action', title: 'Calendario Global', subtitle: 'Registrar Cita', icon: 'Calendar', x: 820, y: 180, color: '#8b5cf6', pm2_process: '' },
  { id: 'out2', type: 'action', title: 'Godzilla CM', subtitle: 'CRM & Tareas', icon: 'LayoutDashboard', x: 820, y: 350, color: '#2563eb', pm2_process: '' },
  { id: 'out3', type: 'action', title: 'Brevo', subtitle: 'Email Marketing', icon: 'Mail', x: 820, y: 520, color: '#0092ff', pm2_process: '' },
  { id: 'fin1', type: 'action', title: 'Stripe', subtitle: 'Pasarela Pagos', icon: 'CreditCard', x: 1040, y: 350, color: '#6366f1', pm2_process: '' },
  { id: 'fin2', type: 'action', title: 'Neon DB', subtitle: 'PostgreSQL Serverless', icon: 'Database', x: 1040, y: 180, color: '#00e599', pm2_process: '' }
];

const edges = [
  { id: 'e_core_1', source: 'core1', target: 'core2', color: '#eab308' },
  { id: 'e_core_2', source: 'core2', target: 'core1', color: '#0d9488' },
  { id: 'e_core_3', source: 'core1', target: 'core3', color: '#eab308' },
  { id: 'e_core_4', source: 'core3', target: 'core1', color: '#4285f4' },
  { id: 'e_edge_1', source: 'edge1', target: 'core1', color: '#f38020' },
  { id: 'e_edge_2', source: 'core1', target: 'edge1', color: '#eab308' },
  { id: 'eb1', source: 'bot1', target: 'edge1', color: '#10b981' },
  { id: 'eb2', source: 'bot2', target: 'edge1', color: '#ec4899' },
  { id: 'eb3', source: 'bot3', target: 'edge1', color: '#25d366' },
  { id: 'eb4', source: 'bot4', target: 'edge1', color: '#ff0050' },
  { id: 'eb5', source: 'core1', target: 'bot5', color: '#f97316' },
  { id: 'eb6', source: 'bot6', target: 'core1', color: '#8b5cf6' },
  { id: 'ei1', source: 'in1', target: 'edge1', color: '#1bbb11' },
  { id: 'ei2', source: 'in2', target: 'edge1', color: '#ffffff' },
  { id: 'eo1', source: 'core1', target: 'out1', color: '#8b5cf6' },
  { id: 'eo2', source: 'core1', target: 'out2', color: '#2563eb' },
  { id: 'eo3', source: 'core1', target: 'out3', color: '#0092ff' },
  { id: 'ef1', source: 'out2', target: 'fin1', color: '#6366f1' },
  { id: 'ef2', source: 'out2', target: 'fin2', color: '#00e599' },
  { id: 'ef3', source: 'out1', target: 'fin2', color: '#00e599' }
];

(async () => {
  try {
    const res = await pool.query(
      `UPDATE automation_flows 
       SET nodes = $1, edges = $2 
       WHERE name = 'Sistema Central' 
       RETURNING *`,
      [JSON.stringify(nodes), JSON.stringify(edges)]
    );
    console.log('Updated rows:', res.rowCount);
    if (res.rowCount === 0) {
      console.log('Inserting instead...');
      await pool.query(
        `INSERT INTO automation_flows (id, name, nodes, edges, is_core, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['central', 'Sistema Central', JSON.stringify(nodes), JSON.stringify(edges), true, 'system']
      );
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
