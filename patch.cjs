const fs = require('fs');
let content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

const targetStr = `              {selectedNode.title === 'Calendario Global' && (`;

const insertStr = `              {['Base de Datos', 'Neon DB'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Query SQL</label><textarea value={selectedNode.config?.query||''} onChange={e=>updateNode({config:{...selectedNode.config, query:e.target.value}})} placeholder="SELECT * FROM users WHERE email = $1" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-[10px]"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Parámetros (JSON Array)</label><input value={selectedNode.config?.params||''} onChange={e=>updateNode({config:{...selectedNode.config, params:e.target.value}})} placeholder='["{{ $json.email }}"]' className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition font-mono text-[10px]"/></div>
                </div>
              )}

              {selectedNode.title === 'Monitor Servidor' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">URL a monitorear</label><input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="https://api.miproyecto.com/health" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Transformador JSON' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Reglas de Mapeo (JSON)</label><textarea value={selectedNode.config?.mapping||''} onChange={e=>updateNode({config:{...selectedNode.config, mapping:e.target.value}})} placeholder='{ "nuevo_campo": "{{ $json.viejo_campo }}" }' rows={4} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-[10px]"/></div>
                </div>
              )}

              {selectedNode.title === 'Merge / Combinar' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Estrategia</label>
                    <select value={selectedNode.config?.strategy||'append'} onChange={e=>updateNode({config:{...selectedNode.config, strategy:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="append">Anexar (Array)</option>
                      <option value="merge">Fusionar (Objeto)</option>
                      <option value="wait">Esperar todas las ramas</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Bot Newsletter' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Tema de la Newsletter</label><input value={selectedNode.config?.topic||''} onChange={e=>updateNode({config:{...selectedNode.config, topic:e.target.value}})} placeholder="Noticias de IA y Tech" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Instrucciones extra</label><textarea value={selectedNode.config?.instructions||''} onChange={e=>updateNode({config:{...selectedNode.config, instructions:e.target.value}})} placeholder="Enfócate en lanzamientos recientes..." rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Trends Bot' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Nicho a analizar</label><input value={selectedNode.config?.niche||''} onChange={e=>updateNode({config:{...selectedNode.config, niche:e.target.value}})} placeholder="Marketing digital, SaaS, AI..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'RSS Feed' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">URL del Feed RSS</label><input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="https://news.ycombinator.com/rss" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'PDF Generator' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Template HTML</label><textarea value={selectedNode.config?.html||''} onChange={e=>updateNode({config:{...selectedNode.config, html:e.target.value}})} placeholder="<h1>Reporte para {{ $json.cliente }}</h1>" rows={4} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-[10px]"/></div>
                </div>
              )}

              {selectedNode.title === 'Brevo' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="correo@ejemplo.com" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Asunto</label><input value={selectedNode.config?.subject||''} onChange={e=>updateNode({config:{...selectedNode.config, subject:e.target.value}})} placeholder="Notificación" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Template ID / HTML</label><textarea value={selectedNode.config?.html||''} onChange={e=>updateNode({config:{...selectedNode.config, html:e.target.value}})} placeholder="ID numérico o <html>..." rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                </div>
              )}

              {['Generador Visual', 'Generador Video', 'Tarea de Studio'].includes(selectedNode.title) && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mt-2">
                  <p className="text-[10px] font-bold text-purple-400 mb-1">🤖 Nodo Automático</p>
                  <p className="text-[9px] text-purple-500/70 leading-tight">Este nodo no requiere configuración manual. Lee el plan estratégico del contexto de la rama actual y ejecuta su tarea en segundo plano.</p>
                </div>
              )}

` + targetStr;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, insertStr);
  fs.writeFileSync('src/components/AutomationFlow.jsx', content, 'utf8');
  console.log('Successfully updated AutomationFlow.jsx');
} else {
  console.error('Target string not found!');
}
