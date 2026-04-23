const fs = require('fs');
let code = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

const startToken = '{/* Dynamic Config Block */}';
const endToken = '<div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">';
const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  const newConfigBlock = `
            {/* Dynamic Config Block */}
            <div className="pt-3 mt-3 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-yellow-400 uppercase flex items-center gap-1.5"><Settings2 className="w-3 h-3"/> Ajustes Obligatorios</label>
                <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">Admite {"{{ $json.var }}"}</span>
              </div>
              
              {selectedNode.title === 'Webhook Entrada' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Método HTTP</label>
                    <select value={selectedNode.config?.method||''} onChange={e=>updateNode({config:{...selectedNode.config, method:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="">Selecciona...</option>
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Endpoint URL</label>
                    <input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="/api/hooks/mi-evento" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Cerebro Central AI' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Modelo LLM</label>
                    <select value={selectedNode.config?.model||''} onChange={e=>updateNode({config:{...selectedNode.config, model:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rápido)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Razonamiento)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">System Prompt</label>
                    <textarea value={selectedNode.config?.prompt||''} onChange={e=>updateNode({config:{...selectedNode.config, prompt:e.target.value}})} placeholder="Eres un asistente experto. Evalúa este JSON: {{ $json.mensaje }}" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Reloj / Cron' && (
                <div>
                  <label className="text-[10px] text-neutral-400 mb-1 block">Expresión Cron</label>
                  <input value={selectedNode.config?.cron||''} onChange={e=>updateNode({config:{...selectedNode.config, cron:e.target.value}})} placeholder="0 9 * * 1 (Ej. Lunes 9 AM)" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                </div>
              )}

              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (
                <div>
                  <label className="text-[10px] text-neutral-400 mb-1 block">Mensaje / Fallback Reply</label>
                  <textarea value={selectedNode.config?.fallback||''} onChange={e=>updateNode({config:{...selectedNode.config, fallback:e.target.value}})} placeholder="Hola {{ $json.nombre }}, recibimos tu solicitud." rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/>
                </div>
              )}

              {selectedNode.title === 'Calendario Global' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Acción de Calendario</label>
                    <select value={selectedNode.config?.action||''} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="">Selecciona...</option>
                      <option value="Agendar">Agendar Cita</option>
                      <option value="Leer">Leer Disponibilidad</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Datos de Cita (JSON)</label>
                    <input value={selectedNode.config?.payload||''} onChange={e=>updateNode({config:{...selectedNode.config, payload:e.target.value}})} placeholder="{ fecha: '{{ $json.date }}' }" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                </div>
              )}

              {['Brevo', 'GoDaddy'].includes(selectedNode.title) && (
                <div>
                  <label className="text-[10px] text-neutral-400 mb-1 block">API Key / Token (Oculto)</label>
                  <input type="password" value={selectedNode.config?.apiKey||''} onChange={e=>updateNode({config:{...selectedNode.config, apiKey:e.target.value}})} placeholder="••••••••••••••••" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-rose-500 transition"/>
                </div>
              )}

              {['Gemini API', 'Stripe', 'Neon DB', 'Cloudflare Workers', 'Vercel'].includes(selectedNode.title) && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-2">
                  <p className="text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1.5"><Shield className="w-3 h-3"/> Credenciales Nativas Seguras</p>
                  <p className="text-[8.5px] text-emerald-500/70 leading-tight">API administrada desde las variables de entorno locales (<code>.env</code>). Todo el tráfico entrante/saliente está monitoreado activamente por el WAF.</p>
                </div>
              )}

            </div>
            `;
  code = code.substring(0, startIndex) + newConfigBlock + code.substring(endIndex);
  fs.writeFileSync('src/components/AutomationFlow.jsx', code);
  console.log('Done');
} else {
  console.log('Not found');
}
