const fs = require('fs');

let code = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

const NEW_TEMPLATES = `const FLOW_TEMPLATES = [
  {
    name: '🌌 El Cerebro de Godzilla',
    description: 'Topología Masiva: Cloudflare, APIs y Ejército de Bots',
    nodes: [
      /* --- NÚCLEO --- */
      { id: 'core1', type: 'action', title: 'Cerebro Central AI', subtitle: 'Motor Principal', icon: 'Brain', x: 800, y: 550, color: '#eab308', pm2_process: 'ai-core' },
      { id: 'core2', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Pinecone Vector DB', icon: 'Network', x: 800, y: 350, color: '#0d9488', pm2_process: 'vector-db' },
      { id: 'core3', type: 'action', title: 'Gemini API', subtitle: 'LLM Core', icon: 'Sparkles', x: 800, y: 750, color: '#4285f4', pm2_process: '' },
      
      /* --- ESCUDO / GATEWAY --- */
      { id: 'edge1', type: 'action', title: 'Cloudflare Workers', subtitle: 'Gateway Edge', icon: 'Cloud', x: 450, y: 550, color: '#f38020', pm2_process: '' },
      
      /* --- EJÉRCITO DE BOTS (Conectados al Gateway) --- */
      { id: 'bot1', type: 'trigger', title: 'Zilla Bot', subtitle: 'Asistente / Atención', icon: 'Bot', x: 100, y: 100, color: '#10b981', pm2_process: 'zilla-bot' },
      { id: 'bot2', type: 'trigger', title: 'Goyi Bot', subtitle: 'Asistente / Cierre', icon: 'Bot', x: 100, y: 250, color: '#ec4899', pm2_process: 'goyi-bot' },
      { id: 'bot3', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', x: 100, y: 400, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'bot4', type: 'trigger', title: 'TikTok Bot', subtitle: 'Interacción TikTok', icon: 'Video', x: 100, y: 550, color: '#ff0050', pm2_process: 'tiktok-bot' },
      { id: 'bot5', type: 'trigger', title: 'IG / Messenger Bot', subtitle: 'Interacción Meta', icon: 'MessageCircle', x: 100, y: 700, color: '#d946ef', pm2_process: 'meta-bot' },
      { id: 'bot6', type: 'action', title: 'Bot Newsletter', subtitle: 'Redacción / Difusión', icon: 'Mail', x: 100, y: 850, color: '#f97316', pm2_process: 'newsletter-bot' },
      { id: 'bot7', type: 'action', title: 'Trends Bot', subtitle: 'Analizador Redes', icon: 'TrendingUp', x: 100, y: 1000, color: '#8b5cf6', pm2_process: 'trends-bot' },
      
      /* --- ENTRADAS EXTERNAS --- */
      { id: 'in1', type: 'trigger', title: 'GoDaddy', subtitle: 'DNS / Dominios', icon: 'Globe', x: 450, y: 200, color: '#1bbb11', pm2_process: '' },
      { id: 'in2', type: 'trigger', title: 'Vercel', subtitle: 'Hosting / Deployment', icon: 'Server', x: 450, y: 900, color: '#ffffff', pm2_process: '' },

      /* --- FLUJO DE CITAS (Appointments) --- */
      { id: 'cita1', type: 'trigger', title: 'Webhook Cita', subtitle: 'Formulario Web', icon: 'Globe', x: 1200, y: 100, color: '#06b6d4', pm2_process: '' },
      { id: 'cita2', type: 'action', title: 'Calendario Global', subtitle: 'Registrar Cita', icon: 'Calendar', x: 1200, y: 300, color: '#8b5cf6', pm2_process: '' },

      /* --- MÁQUINA UGC --- */
      { id: 'ugc1', type: 'action', title: 'Planificador IA', subtitle: 'Origen Mensual', icon: 'Wand2', x: 1200, y: 500, color: '#a855f7', pm2_process: '' },
      { id: 'ugc2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 1500, y: 400, color: '#3b82f6', pm2_process: '' },
      { id: 'ugc3', type: 'action', title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', x: 1500, y: 600, color: '#f59e0b', pm2_process: '' },
      { id: 'ugc4', type: 'action', title: 'Editor Pro', subtitle: 'Capcut', icon: 'Video', x: 1800, y: 500, color: '#2563eb', pm2_process: '' },
      { id: 'ugc5', type: 'action', title: 'Publicador Social', subtitle: 'Tiktok/IG', icon: 'Send', x: 2100, y: 500, color: '#10b981', pm2_process: 'publisher-bot' },

      /* --- RESOLUCIÓN / SALIDAS --- */
      { id: 'out1', type: 'action', title: 'Godzilla CM', subtitle: 'CRM & Tareas', icon: 'LayoutDashboard', x: 1200, y: 800, color: '#2563eb', pm2_process: '' },
      { id: 'out2', type: 'action', title: 'Brevo', subtitle: 'Email Marketing', icon: 'Mail', x: 1200, y: 1000, color: '#0092ff', pm2_process: '' },
      
      /* --- CAPA FINANCIERA / DATOS --- */
      { id: 'fin1', type: 'action', title: 'Stripe', subtitle: 'Pasarela Pagos', icon: 'CreditCard', x: 1600, y: 800, color: '#6366f1', pm2_process: '' },
      { id: 'fin2', type: 'action', title: 'Neon DB', subtitle: 'PostgreSQL Serverless', icon: 'Database', x: 1600, y: 300, color: '#00e599', pm2_process: '' },
    ],
    edges: [
      /* Núcleo -> Memoria y LLM */
      { id: 'e_core_1', source: 'core1', target: 'core2', color: '#eab308' },
      { id: 'e_core_2', source: 'core2', target: 'core1', color: '#0d9488' },
      { id: 'e_core_3', source: 'core1', target: 'core3', color: '#eab308' },
      { id: 'e_core_4', source: 'core3', target: 'core1', color: '#4285f4' },

      /* Edge Gateway -> Cerebro Central */
      { id: 'e_edge_1', source: 'edge1', target: 'core1', color: '#f38020' },
      { id: 'e_edge_2', source: 'core1', target: 'edge1', color: '#eab308' },

      /* Bots -> Edge Gateway */
      { id: 'eb1', source: 'bot1', target: 'edge1', color: '#10b981' },
      { id: 'eb2', source: 'bot2', target: 'edge1', color: '#ec4899' },
      { id: 'eb3', source: 'bot3', target: 'edge1', color: '#25d366' },
      { id: 'eb4', source: 'bot4', target: 'edge1', color: '#ff0050' },
      { id: 'eb7', source: 'bot5', target: 'edge1', color: '#d946ef' },
      { id: 'eb5', source: 'core1', target: 'bot6', color: '#f97316' }, /* El cerebro manda la señal al Newsletter */
      { id: 'eb6', source: 'bot7', target: 'core1', color: '#8b5cf6' }, /* Trends le avisa al cerebro */

      /* Integraciones Frontend -> Edge Gateway */
      { id: 'ei1', source: 'in1', target: 'edge1', color: '#1bbb11' },
      { id: 'ei2', source: 'in2', target: 'edge1', color: '#ffffff' },

      /* Cerebro -> Salidas (CM, Calendario, Brevo) */
      { id: 'eo2', source: 'core1', target: 'out1', color: '#2563eb' },
      { id: 'eo3', source: 'core1', target: 'out2', color: '#0092ff' },

      /* Citas Flow */
      { id: 'cita_e1', source: 'cita1', target: 'cita2', color: '#06b6d4' },
      { id: 'cita_e2', source: 'cita2', target: 'fin2', color: '#8b5cf6' }, /* Calendario -> Database */
      { id: 'cita_e3', source: 'cita2', target: 'bot3', color: '#25d366' }, /* Calendario -> WA Alerta */

      /* UGC Flow */
      { id: 'ugc_e1', source: 'core1', target: 'ugc1', color: '#a855f7' }, /* Cerebro dispara Planificador */
      { id: 'ugc_e2', source: 'ugc1', target: 'ugc2', color: '#3b82f6' },
      { id: 'ugc_e3', source: 'ugc1', target: 'ugc3', color: '#f59e0b' },
      { id: 'ugc_e4', source: 'ugc2', target: 'ugc4', color: '#3b82f6' },
      { id: 'ugc_e5', source: 'ugc3', target: 'ugc4', color: '#f59e0b' },
      { id: 'ugc_e6', source: 'ugc4', target: 'ugc5', color: '#2563eb' },

      /* Salidas -> Capa Financiera/Persistencia */
      { id: 'ef1', source: 'out1', target: 'fin1', color: '#6366f1' }, /* CRM trigger Stripe */
      { id: 'ef2', source: 'out1', target: 'fin2', color: '#00e599' }, /* CRM guarda en Neon */
    ],
  },
`;

const startIndex = code.indexOf('const FLOW_TEMPLATES = [');
const endIndex = code.indexOf('// ─── Change Request Modal ─────────────────────────────────────────────────────');
if (startIndex !== -1 && endIndex !== -1) {
    const templatesStr = code.substring(startIndex, endIndex);
    const firstTemplateEnd = templatesStr.indexOf('  },');
    if (firstTemplateEnd !== -1) {
        // Just replace the first template text roughly, or better use Regex:
    }
}

// Safer Regex to replace just FLOW_TEMPLATES[0] (which we know starts with { name: '🌌 El Cerebro de Godzilla' and ends with } )
const flowRegex = /\{\s*name:\s*'🌌 El Cerebro de Godzilla'[\s\S]*?\}(?=\s*,\s*\{\s*name:\s*'🌌 Ecosistema Central Godzilla')/;

const NEW_CEREBRO_OBJ = `{
    name: '🌌 El Cerebro de Godzilla',
    description: 'Topología Masiva: Cloudflare, APIs y Ejército de Bots',
    nodes: [
      /* --- NÚCLEO --- */
      { id: 'core1', type: 'action', title: 'Cerebro Central AI', subtitle: 'Motor Principal', icon: 'Brain', x: 800, y: 550, color: '#eab308', pm2_process: 'ai-core' },
      { id: 'core2', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Pinecone Vector DB', icon: 'Network', x: 800, y: 350, color: '#0d9488', pm2_process: 'vector-db' },
      { id: 'core3', type: 'action', title: 'Gemini API', subtitle: 'LLM Core', icon: 'Sparkles', x: 800, y: 750, color: '#4285f4', pm2_process: '' },
      
      /* --- ESCUDO / GATEWAY --- */
      { id: 'edge1', type: 'action', title: 'Cloudflare Workers', subtitle: 'Gateway Edge', icon: 'Cloud', x: 450, y: 550, color: '#f38020', pm2_process: '' },
      
      /* --- EJÉRCITO DE BOTS (Conectados al Gateway) --- */
      { id: 'bot1', type: 'trigger', title: 'Zilla Bot', subtitle: 'Asistente / Atención', icon: 'Bot', x: 100, y: 100, color: '#10b981', pm2_process: 'zilla-bot' },
      { id: 'bot2', type: 'trigger', title: 'Goyi Bot', subtitle: 'Asistente / Cierre', icon: 'Bot', x: 100, y: 250, color: '#ec4899', pm2_process: 'goyi-bot' },
      { id: 'bot3', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', x: 100, y: 400, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'bot4', type: 'trigger', title: 'TikTok Bot', subtitle: 'Interacción TikTok', icon: 'Video', x: 100, y: 550, color: '#ff0050', pm2_process: 'tiktok-bot' },
      { id: 'bot5', type: 'trigger', title: 'IG / Messenger Bot', subtitle: 'Interacción Meta', icon: 'MessageCircle', x: 100, y: 700, color: '#d946ef', pm2_process: 'meta-bot' },
      { id: 'bot6', type: 'action', title: 'Bot Newsletter', subtitle: 'Redacción / Difusión', icon: 'Mail', x: 100, y: 850, color: '#f97316', pm2_process: 'newsletter-bot' },
      { id: 'bot7', type: 'action', title: 'Trends Bot', subtitle: 'Analizador Redes', icon: 'TrendingUp', x: 100, y: 1000, color: '#8b5cf6', pm2_process: 'trends-bot' },
      
      /* --- ENTRADAS EXTERNAS --- */
      { id: 'in1', type: 'trigger', title: 'GoDaddy', subtitle: 'DNS / Dominios', icon: 'Globe', x: 450, y: 200, color: '#1bbb11', pm2_process: '' },
      { id: 'in2', type: 'trigger', title: 'Vercel', subtitle: 'Hosting / Deployment', icon: 'Server', x: 450, y: 900, color: '#ffffff', pm2_process: '' },

      /* --- FLUJO DE CITAS (Appointments) --- */
      { id: 'cita1', type: 'trigger', title: 'Webhook Cita', subtitle: 'Formulario Web', icon: 'Globe', x: 1200, y: 100, color: '#06b6d4', pm2_process: '' },
      { id: 'cita2', type: 'action', title: 'Calendario Global', subtitle: 'Registrar Cita', icon: 'Calendar', x: 1200, y: 300, color: '#8b5cf6', pm2_process: '' },

      /* --- MÁQUINA UGC --- */
      { id: 'ugc1', type: 'action', title: 'Planificador IA', subtitle: 'Origen Mensual', icon: 'Wand2', x: 1200, y: 500, color: '#a855f7', pm2_process: '' },
      { id: 'ugc2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 1500, y: 400, color: '#3b82f6', pm2_process: '' },
      { id: 'ugc3', type: 'action', title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', x: 1500, y: 600, color: '#f59e0b', pm2_process: '' },
      { id: 'ugc4', type: 'action', title: 'Editor Pro', subtitle: 'Capcut', icon: 'Video', x: 1800, y: 500, color: '#2563eb', pm2_process: '' },
      { id: 'ugc5', type: 'action', title: 'Publicador Social', subtitle: 'Tiktok/IG', icon: 'Send', x: 2100, y: 500, color: '#10b981', pm2_process: 'publisher-bot' },

      /* --- RESOLUCIÓN / SALIDAS --- */
      { id: 'out1', type: 'action', title: 'Godzilla CM', subtitle: 'CRM & Tareas', icon: 'LayoutDashboard', x: 1200, y: 800, color: '#2563eb', pm2_process: '' },
      { id: 'out2', type: 'action', title: 'Brevo', subtitle: 'Email Marketing', icon: 'Mail', x: 1200, y: 1000, color: '#0092ff', pm2_process: '' },
      
      /* --- CAPA FINANCIERA / DATOS --- */
      { id: 'fin1', type: 'action', title: 'Stripe', subtitle: 'Pasarela Pagos', icon: 'CreditCard', x: 1600, y: 800, color: '#6366f1', pm2_process: '' },
      { id: 'fin2', type: 'action', title: 'Neon DB', subtitle: 'PostgreSQL Serverless', icon: 'Database', x: 1600, y: 300, color: '#00e599', pm2_process: '' },
    ],
    edges: [
      /* Núcleo -> Memoria y LLM */
      { id: 'e_core_1', source: 'core1', target: 'core2', color: '#eab308' },
      { id: 'e_core_2', source: 'core2', target: 'core1', color: '#0d9488' },
      { id: 'e_core_3', source: 'core1', target: 'core3', color: '#eab308' },
      { id: 'e_core_4', source: 'core3', target: 'core1', color: '#4285f4' },

      /* Edge Gateway -> Cerebro Central */
      { id: 'e_edge_1', source: 'edge1', target: 'core1', color: '#f38020' },
      { id: 'e_edge_2', source: 'core1', target: 'edge1', color: '#eab308' },

      /* Bots -> Edge Gateway */
      { id: 'eb1', source: 'bot1', target: 'edge1', color: '#10b981' },
      { id: 'eb2', source: 'bot2', target: 'edge1', color: '#ec4899' },
      { id: 'eb3', source: 'bot3', target: 'edge1', color: '#25d366' },
      { id: 'eb4', source: 'bot4', target: 'edge1', color: '#ff0050' },
      { id: 'eb7', source: 'bot5', target: 'edge1', color: '#d946ef' },
      { id: 'eb5', source: 'core1', target: 'bot6', color: '#f97316' }, /* El cerebro manda la señal al Newsletter */
      { id: 'eb6', source: 'bot7', target: 'core1', color: '#8b5cf6' }, /* Trends le avisa al cerebro */

      /* Integraciones Frontend -> Edge Gateway */
      { id: 'ei1', source: 'in1', target: 'edge1', color: '#1bbb11' },
      { id: 'ei2', source: 'in2', target: 'edge1', color: '#ffffff' },

      /* Cerebro -> Salidas (CM, Calendario, Brevo) */
      { id: 'eo2', source: 'core1', target: 'out1', color: '#2563eb' },
      { id: 'eo3', source: 'core1', target: 'out2', color: '#0092ff' },

      /* Citas Flow */
      { id: 'cita_e1', source: 'cita1', target: 'cita2', color: '#06b6d4' },
      { id: 'cita_e2', source: 'cita2', target: 'fin2', color: '#8b5cf6' }, /* Calendario -> Database */
      { id: 'cita_e3', source: 'cita2', target: 'bot3', color: '#25d366' }, /* Calendario -> WA Alerta */

      /* UGC Flow */
      { id: 'ugc_e1', source: 'core1', target: 'ugc1', color: '#a855f7' }, /* Cerebro dispara Planificador */
      { id: 'ugc_e2', source: 'ugc1', target: 'ugc2', color: '#3b82f6' },
      { id: 'ugc_e3', source: 'ugc1', target: 'ugc3', color: '#f59e0b' },
      { id: 'ugc_e4', source: 'ugc2', target: 'ugc4', color: '#3b82f6' },
      { id: 'ugc_e5', source: 'ugc3', target: 'ugc4', color: '#f59e0b' },
      { id: 'ugc_e6', source: 'ugc4', target: 'ugc5', color: '#2563eb' },

      /* Salidas -> Capa Financiera/Persistencia */
      { id: 'ef1', source: 'out1', target: 'fin1', color: '#6366f1' }, /* CRM trigger Stripe */
      { id: 'ef2', source: 'out1', target: 'fin2', color: '#00e599' }, /* CRM guarda en Neon */
    ]
  }`;

code = code.replace(flowRegex, NEW_CEREBRO_OBJ);


// 2. Add Restart button inside Right Config Panel
const OLD_POWER_BLOCK = `            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-400 mb-1 flex items-center gap-1"><Power className="w-3 h-3"/>Motor</p>
              {selectedNode.pm2_process
                ? (() => { const p=pm2Status.find(x=>x.name===selectedNode.pm2_process); return p?<p className="text-[10px] text-emerald-400 font-bold">🟢 ONLINE · {Math.round(p.memory/1024/1024)}MB · {p.cpu}%</p>:<p className="text-[10px] text-rose-400 font-bold">🔴 OFFLINE</p>; })()
                : <><p className="text-[10px] text-emerald-400 font-bold">🟢 ONLINE - Integración Nativa</p><p className="text-[9px] text-emerald-500/60">Corre dentro del núcleo de Godzilla Server.</p></>
              }
            </div>`;

const NEW_POWER_BLOCK = `            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-400 mb-1 flex items-center gap-1"><Power className="w-3 h-3"/>Motor</p>
              {selectedNode.pm2_process
                ? (() => { 
                    const p = pm2Status.find(x=>x.name===selectedNode.pm2_process); 
                    const isOnline = !!p;
                    return (
                      <div className="flex items-center justify-between">
                        {isOnline 
                          ? <p className="text-[10px] text-emerald-400 font-bold">🟢 ONLINE · {Math.round(p.memory/1024/1024)}MB · {p.cpu}%</p>
                          : <p className="text-[10px] text-rose-400 font-bold">🔴 OFFLINE</p>
                        }
                        <button 
                          onClick={async () => {
                            const token = localStorage.getItem('adminToken');
                            try {
                              const res = await fetch('/api/automation/restart', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
                                body: JSON.stringify({ processName: selectedNode.pm2_process })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert(data.message);
                                // Refresh status
                                const statRes = await fetch('/api/automation/status', { headers: { Authorization: \`Bearer \${token}\` } });
                                const statData = await statRes.json();
                                if (statData.success) setPm2Status(statData.pm2 || []);
                              } else alert(data.error);
                            } catch(e) { alert('Error de red al reiniciar'); }
                          }}
                          className="bg-black border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded-md text-[9px] font-bold text-white transition flex items-center gap-1"
                        >
                          <Power className="w-2.5 h-2.5" /> {isOnline ? 'Reiniciar' : 'Encender'}
                        </button>
                      </div>
                    );
                  })()
                : <><p className="text-[10px] text-emerald-400 font-bold">🟢 ONLINE - Integración Nativa</p><p className="text-[9px] text-emerald-500/60">Corre dentro del núcleo de Godzilla Server.</p></>
              }
            </div>`;

code = code.replace(OLD_POWER_BLOCK, NEW_POWER_BLOCK);

fs.writeFileSync('src/components/AutomationFlow.jsx', code);
