import React from 'react';
import { Volume2, Palette, ArrowLeftRight, Type, ImageIcon, Wand2, Activity, Target, Layers, PlusCircle } from 'lucide-react';

// Section defined at module scope to avoid "cannot create components during render" warning
const Section = ({ title, icon: Icon, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-4 border-b border-[#27272a] pb-2">
      <Icon className="w-4 h-4 text-blue-500" />
      <h4 className="text-white text-xs uppercase tracking-wider font-semibold">{title}</h4>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export default function FloatingToolbar({ selectedClip, editor, engine }) {
  const clip = selectedClip?.clip;
  const type = selectedClip?.layer?.type;

  if (!selectedClip) {
    return (
      <div className="w-full md:w-80 bg-[#18181b] border-t md:border-t-0 md:border-l border-[#27272a] h-auto md:h-full shrink-0 flex flex-col items-center justify-center text-center p-6">
        <Activity className="w-10 h-10 text-neutral-600 mb-4" />
        <h3 className="text-neutral-400 font-medium text-sm mb-2">Sin selección</h3>
        <p className="text-xs text-neutral-600">Selecciona un clip de video, audio o texto en la línea de tiempo para ver sus propiedades avanzadas.</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 md:sm:w-96 bg-[#18181b] border-t md:border-t-0 md:border-l border-[#27272a] h-auto md:h-full shrink-0 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-[#27272a] bg-[#121212] shrink-0">
        <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
          Propiedades: {type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Texto'}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        
        {/* TEXT PROPERTIES */}
        {type === 'text' && (
          <Section title="Tipografía & Texto" icon={Type}>
            <textarea value={clip.text || ''}
              onChange={e => editor.updateClip(clip.id, { text: e.target.value }, true)}
              className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-lg p-3 outline-none focus:border-yellow-500 transition-colors resize-none min-h-[60px]" />
            
            <div className="mt-3">
              <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Fuente</label>
              <select value={clip.style?.fontFamily || 'Inter'}
                onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, fontFamily: e.target.value } })}
                className="w-full bg-[#27272a] text-xs p-2 rounded-lg outline-none border border-[#3f3f46] text-white focus:border-yellow-500">
                <option value="Inter">Inter (Default)</option>
                <option value="Outfit">Outfit</option>
                <option value="Roboto">Roboto</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Oswald">Oswald (Titulares)</option>
                <option value="Bebas Neue">Bebas Neue (Impacto)</option>
                <option value="Pacifico">Pacifico (Script)</option>
                <option value="Courier New">Courier New (Mono)</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Impact">Impact (Viral)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Tamaño</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="12" max="144" step="2"
                    value={clip.style?.fontSize || 48}
                    onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, fontSize: parseInt(e.target.value) } }, true)}
                    className="flex-1 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                  <span className="text-[10px] font-mono text-white w-6 text-right">{clip.style?.fontSize || 48}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Estilo</label>
                <div className="flex gap-1">
                  {[{key:'bold',label:'B',cls:'font-black'},{key:'italic',label:'I',cls:'italic'},{key:'underline',label:'U',cls:'underline'}].map(s => (
                    <button key={s.key} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, [s.key]: !clip.style?.[s.key] } })}
                      className={`flex-1 py-1.5 text-[11px] ${s.cls} rounded border transition-all ${clip.style?.[s.key] ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-400 hover:text-white'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[10px] text-neutral-400 mb-2 block uppercase tracking-wider">Color Texto</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['#ffffff','#facc15','#ef4444','#3b82f6','#22c55e','#f97316','#000000'].map(c => (
                    <button key={c} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, fontColor: c } })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${clip.style?.fontColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 mb-2 block uppercase tracking-wider">Fondo Texto</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['transparent','#000000','#ffffff','#ef4444','#3b82f6','#facc15'].map(c => (
                    <button key={c} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, bgColor: c === 'transparent' ? null : c } })}
                      className={`w-6 h-6 rounded border-2 transition-transform ${ (clip.style?.bgColor || null) === (c === 'transparent' ? null : c) ? 'border-white scale-110 shadow-lg' : 'border-[#3f3f46] hover:scale-105'}`}
                      style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%),linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%)' : undefined, backgroundSize: '6px 6px', backgroundPosition: '0 0,3px 3px' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Contorno</label>
                  <span className="text-[9px] font-mono text-neutral-500">{clip.style?.outlineWidth || 0}px</span>
                </div>
                <input type="range" min="0" max="8" step="1"
                  value={clip.style?.outlineWidth || 0}
                  onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, outlineWidth: parseInt(e.target.value) } }, true)}
                  className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Sombra</label>
                  <span className="text-[9px] font-mono text-neutral-500">{clip.style?.shadowBlur || 0}px</span>
                </div>
                <input type="range" min="0" max="20" step="1"
                  value={clip.style?.shadowBlur || 0}
                  onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, shadowBlur: parseInt(e.target.value) } }, true)}
                  className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Alineación</label>
                <div className="flex gap-1">
                  {[{v:'left',l:'⬛'},{v:'center',l:'⬛'},{v:'right',l:'⬛'}].map((a,i) => (
                    <button key={a.v} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, align: a.v } })}
                      className={`flex-1 py-1.5 text-[11px] rounded border transition-all ${clip.style?.align === a.v || (!clip.style?.align && a.v === 'center') ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-400'}`}>
                      {i === 0 ? '⬛▪▪' : i === 1 ? '▪⬛▪' : '▪▪⬛'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Posición Y</label>
                  <span className="text-[9px] font-mono text-neutral-500">{Math.round((clip.style?.posY ?? 0.5) * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01"
                  value={clip.style?.posY ?? 0.5}
                  onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, posY: parseFloat(e.target.value) } }, true)}
                  className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Animación Entrada</label>
              <select value={clip.style?.animation || ''} onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, animation: e.target.value } })}
                className="w-full bg-[#27272a] text-xs p-2 rounded-lg outline-none border border-[#3f3f46] text-white focus:border-yellow-500">
                <option value="">Estático</option>
                <option value="fade">Aparición suave (Fade In)</option>
                <option value="typewriter">Máquina de escribir</option>
                <option value="slideup">Deslizar hacia arriba</option>
                <option value="bounce">Rebote</option>
                <option value="pop">Pop (Escala)</option>
              </select>
            </div>
          </Section>
        )}

        {/* AUDIO & VIDEO COMMON */}
        {(type === 'audio' || type === 'video') && (
          <Section title="Volumen & Audio" icon={Volume2}>
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-neutral-400" />
              <input type="range" min="0" max="2" step="0.05"
                value={clip.volume ?? 1}
                onChange={e => editor.updateClip(clip.id, { volume: parseFloat(e.target.value) }, true)}
                onMouseUp={e => editor.updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white" />
              <span className="w-10 text-right text-xs font-mono text-white">{Math.round((clip.volume ?? 1) * 100)}%</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1.5 uppercase tracking-wider"><span>Fade In</span><span>{clip.fadeIn ?? 0}s</span></div>
                <input type="range" min="0" max="5" step="0.1" value={clip.fadeIn ?? 0} onChange={e => editor.updateClip(clip.id, { fadeIn: parseFloat(e.target.value) }, true)} className="w-full accent-blue-500 h-1.5 bg-neutral-700 rounded-lg appearance-none" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1.5 uppercase tracking-wider"><span>Fade Out</span><span>{clip.fadeOut ?? 0}s</span></div>
                <input type="range" min="0" max="5" step="0.1" value={clip.fadeOut ?? 0} onChange={e => editor.updateClip(clip.id, { fadeOut: parseFloat(e.target.value) }, true)} className="w-full accent-blue-500 h-1.5 bg-neutral-700 rounded-lg appearance-none" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#27272a]">
              <label className="text-[10px] text-neutral-400 mb-2 block uppercase tracking-wider">Efectos de Voz (IA)</label>
              <select value={clip.voiceFx || ''} onChange={e => editor.updateClip(clip.id, { voiceFx: e.target.value })}
                className="w-full bg-[#27272a] text-xs p-2 rounded-lg outline-none border border-[#3f3f46] text-white focus:border-blue-500 transition-colors">
                <option value="">Ninguno (Original)</option>
                <option value="deep">Voz Profunda (Anónimo)</option>
                <option value="chipmunk">Ardilla (Comedia)</option>
                <option value="echo">Eco (Reverb)</option>
                <option value="radio">Radio Antigua (Lo-Fi)</option>
              </select>
            </div>
          </Section>
        )}

        {/* VIDEO ONLY */}
        {type === 'video' && (
          <>
            <Section title="Transformación (PiP)" icon={ImageIcon}>
              <div className="space-y-4">
                {[
                  { key: 'scale', label: 'Escala', min: 0.1, max: 3, step: 0.1, def: 1, unit: 'x' },
                  { key: 'x', label: 'Posición X', min: -1000, max: 1000, step: 10, def: 0, unit: 'px' },
                  { key: 'y', label: 'Posición Y', min: -1000, max: 1000, step: 10, def: 0, unit: 'px' }
                ].map(t => {
                  const val = clip.transform?.[t.key] ?? t.def;
                  return (
                    <div key={t.key}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{t.label}</span>
                        <span className="text-[10px] font-mono text-white bg-[#27272a] px-2 py-0.5 rounded">{val}{t.unit}</span>
                      </div>
                      <input type="range" min={t.min} max={t.max} step={t.step} value={val}
                        onChange={e => editor.updateClip(clip.id, { transform: { ...(clip.transform || {}), [t.key]: parseFloat(e.target.value) } }, true)}
                        onMouseUp={e => editor.updateClip(clip.id, { transform: { ...(clip.transform || {}), [t.key]: parseFloat(e.target.value) } })}
                        className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                  )
                })}
              </div>
            </Section>

            <Section title="Color Grading Avanzado" icon={Palette}>
              <div className="flex gap-4 mb-6">
                {['Sombras', 'Medios', 'Luces'].map(t => (
                  <div key={t} className="flex flex-col items-center flex-1">
                    <span className="text-[9px] text-neutral-400 uppercase tracking-wider mb-2">{t}</span>
                    <div className="w-16 h-16 rounded-full border-2 border-[#3f3f46] bg-[#121212] flex items-center justify-center relative overflow-hidden shadow-inner">
                       <div className="w-full h-full bg-gradient-conic from-red-500 via-green-500 to-blue-500 opacity-30 rounded-full"></div>
                       <div className="w-2 h-2 bg-white rounded-full absolute shadow-[0_0_5px_rgba(0,0,0,1)]"></div>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" defaultValue="0.5" className="w-full h-1 mt-3 bg-neutral-700 rounded-lg appearance-none accent-white" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4 border-t border-[#27272a]">
                {[
                  {k:'brightness', label:'Exposición', min:-1, max:1, step:0.05, c:'accent-white'},
                  {k:'contrast', label:'Contraste', min:0, max:2, step:0.05, c:'accent-white'},
                  {k:'saturation', label:'Saturación', min:0, max:3, step:0.1, c:'accent-pink-500'},
                  {k:'temperature', label:'Temperatura', min:-1, max:1, step:0.05, c:'accent-orange-500'}
                ].map(c => (
                  <div key={c.k}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{c.label}</span>
                      <span className="text-[9px] font-mono text-white">{Math.round((clip.color?.[c.k] ?? (c.k==='contrast'||c.k==='saturation'?1:0)) * 100)}%</span>
                    </div>
                    <input type="range" min={c.min} max={c.max} step={c.step}
                      value={clip.color?.[c.k] ?? (c.k==='contrast'||c.k==='saturation'?1:0)}
                      onChange={e => editor.updateClip(clip.id, { color: { ...(clip.color || {brightness:0,contrast:1,saturation:1,temperature:0}), [c.k]: parseFloat(e.target.value) } }, true)}
                      onMouseUp={e => editor.updateClip(clip.id, { color: { ...(clip.color || {brightness:0,contrast:1,saturation:1,temperature:0}), [c.k]: parseFloat(e.target.value) } })}
                      className={`w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer ${c.c}`} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Máscaras, FX & Tracking" icon={Wand2}>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[ {id:'blur', label:'Desenfocar Gaussian'}, {id:'vhs', label:'Glitch / VHS'}, {id:'bw', label:'Cinematic LUT'}, {id:'vignette', label:'Viñeta Dinámica'} ].map(fx => {
                  const active = clip.effects?.includes(fx.id);
                  return (
                    <button key={fx.id} onClick={() => {
                      const current = clip.effects || [];
                      const next = active ? current.filter(e => e !== fx.id) : [...current, fx.id];
                      editor.updateClip(clip.id, { effects: next });
                    }} className={`py-2 px-1 text-[10px] font-medium rounded-lg border transition-all flex flex-col items-center gap-1.5 ${active ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-300 hover:border-neutral-500'}`}>
                      <div className={`w-2 h-2 rounded-full ${active ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-neutral-600'}`}></div>
                      {fx.label}
                    </button>
                  )
                })}
              </div>
              
              <div className="border-t border-[#27272a] pt-4 mb-4">
                <label className="flex items-center gap-2 text-[11px] text-neutral-200 font-semibold cursor-pointer mb-3">
                  <Target className="w-4 h-4 text-blue-500" />
                  Rastreo de Movimiento (Tracking)
                </label>
                <div className="flex gap-2">
                  <button className="flex-1 bg-[#27272a] hover:bg-[#3f3f46] text-white text-[10px] py-2 rounded-lg border border-[#3f3f46] font-medium transition-colors">Seleccionar Sujeto</button>
                  <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-2 rounded-lg font-medium transition-colors">Iniciar Tracking</button>
                </div>
              </div>

              <div className="border-t border-[#27272a] pt-4">
                <label className="flex items-center gap-2 text-[11px] text-neutral-200 font-semibold cursor-pointer mb-3">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Chroma Key Avanzado
                  <input type="checkbox" checked={!!clip.chromaKey}
                    onChange={e => editor.updateClip(clip.id, { chromaKey: e.target.checked ? { color: '#00ff00', similarity: 0.2, blend: 0.1 } : null })} 
                    className="accent-emerald-500 w-4 h-4 ml-auto" />
                </label>
                {clip.chromaKey && (
                  <div className="space-y-4 pl-6 bg-[#27272a]/20 p-3 rounded-lg border border-[#3f3f46]/50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-300">Color Base</span>
                      <div className="flex items-center gap-2">
                         <span className="font-mono text-neutral-500 text-[9px] uppercase">{clip.chromaKey.color}</span>
                         <input type="color" value={clip.chromaKey.color} onChange={e => editor.updateClip(clip.id, { chromaKey: { ...clip.chromaKey, color: e.target.value } })} className="w-6 h-6 p-0 border-0 rounded cursor-pointer shadow-sm" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-1.5 uppercase tracking-wider">
                        <span className="text-neutral-400">Tolerancia (Spill)</span>
                        <span className="font-mono text-white bg-[#27272a] px-2 py-0.5 rounded">{Math.round(clip.chromaKey.similarity * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="0.5" step="0.01" value={clip.chromaKey.similarity} onChange={e => editor.updateClip(clip.id, { chromaKey: { ...clip.chromaKey, similarity: parseFloat(e.target.value) } }, true)} className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Keyframes & Animación" icon={Activity}>
               <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4">
                 <div className="text-center mb-3">
                   <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2 opacity-80" />
                   <h5 className="text-white text-xs font-semibold">Animación Dinámica</h5>
                   <p className="text-[9px] text-neutral-400 mt-1">Añade puntos de control (Keyframes) en el tiempo actual ({engine?.displayTime?.toFixed(1) || '0.0'}s) para interpolar posición y escala.</p>
                 </div>
                 
                 <button onClick={() => {
                   const kfs = clip.keyframes ? [...clip.keyframes] : [];
                   // We store the keyframe relative to clip start, or absolute? Relative to clip start is better:
                   const relativeTime = (engine?.displayTime || 0) - clip.start;
                   if (relativeTime < 0 || relativeTime > (clip.end - clip.start)) return alert('El cabezal debe estar sobre el clip para añadir un keyframe.');
                   
                   // Find if keyframe exists near this time
                   const existingIdx = kfs.findIndex(k => Math.abs(k.time - relativeTime) < 0.1);
                   const transformProps = clip.transform || { scale: 1, x: 0, y: 0 };
                   
                   if (existingIdx >= 0) kfs[existingIdx] = { time: relativeTime, ...transformProps };
                   else kfs.push({ time: relativeTime, ...transformProps });
                   
                   kfs.sort((a,b) => a.time - b.time);
                   editor.updateClip(clip.id, { keyframes: kfs });
                 }} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mb-3">
                    <PlusCircle className="w-3.5 h-3.5" /> Añadir / Actualizar Keyframe aquí
                 </button>

                 {clip.keyframes && clip.keyframes.length > 0 && (
                   <div className="space-y-1.5 mt-2 border-t border-[#3f3f46] pt-3">
                     {clip.keyframes.map((k, i) => (
                       <div key={i} className="flex items-center justify-between bg-[#121212] px-2 py-1.5 rounded text-[10px]">
                         <span className="font-mono text-blue-400">{k.time.toFixed(1)}s</span>
                         <span className="text-neutral-500 truncate w-24 text-right">s:{k.scale?.toFixed(1)} x:{k.x} y:{k.y}</span>
                         <button onClick={() => {
                           const newKfs = clip.keyframes.filter((_, idx) => idx !== i);
                           editor.updateClip(clip.id, { keyframes: newKfs.length ? newKfs : null });
                         }} className="text-red-400 hover:text-red-300 px-1">X</button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </Section>

            <Section title="Transición (Entrada)" icon={ArrowLeftRight}>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[['cut','Ninguna'],['fade','Fundido'],['wipeleft','Barrido'],['slideleft','Deslizar'],['zoom','Zoom In']].map(([t, label]) => {
                  const active = (clip.transitionIn?.type ?? 'cut') === t;
                  return (
                    <button key={t} onClick={() => editor.updateClip(clip.id, { transitionIn: t === 'cut' ? null : { type: t, duration: 0.5 } })}
                      className={`py-2 text-[10px] font-medium rounded-lg border transition-all ${active ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-300 hover:border-neutral-500'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {clip.transitionIn && (
                <div>
                  <div className="flex justify-between items-center mb-1.5 text-[10px] uppercase tracking-wider">
                    <span className="text-neutral-400">Duración</span>
                    <span className="font-mono text-white bg-[#27272a] px-2 py-0.5 rounded">{clip.transitionIn.duration}s</span>
                  </div>
                  <input type="range" min="0.2" max="2" step="0.1" value={clip.transitionIn.duration} onChange={e => editor.updateClip(clip.id, { transitionIn: { ...clip.transitionIn, duration: parseFloat(e.target.value) } }, true)} className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

