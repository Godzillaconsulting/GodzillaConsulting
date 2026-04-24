import React, { useState } from 'react';
import { Volume2, Gauge, Palette, ArrowLeftRight, Type, ImageIcon, Wand2, Music, Activity, Target, Layers } from 'lucide-react';

export default function FloatingToolbar({ selectedClip, editor }) {
  const [activeTab, setActiveTab] = useState(null);

  const clip = selectedClip?.clip;
  const type = selectedClip?.layer?.type;
  const disabled = !selectedClip;

  const toggleTab = (tab) => {
    if (disabled) return;
    setActiveTab(activeTab === tab ? null : tab);
  };

  const Popover = ({ isOpen, title, children }) => {
    if (!isOpen) return null;
    return (
      <div className="absolute top-[130%] left-1/2 -translate-x-1/2 w-96 bg-[#18181b] border border-[#27272a] rounded-xl p-4 shadow-2xl cursor-default text-left z-[100]" onClick={e => e.stopPropagation()}>
        <h4 className="text-[11px] font-semibold text-neutral-200 mb-3 uppercase tracking-wider">{title}</h4>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 p-1 bg-[#18181b]/95 backdrop-blur-md shadow-2xl rounded-xl border border-[#27272a]">
      
      {/* Volume */}
      <div className="relative">
        <button onClick={() => toggleTab('volume')} disabled={disabled || (type !== 'audio' && type !== 'video')} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'volume' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Volume2 className="w-4 h-4" />
        </button>
        {clip && (type === 'audio' || type === 'video') && (
          <Popover isOpen={activeTab === 'volume'} title="Volumen">
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="2" step="0.05"
                value={clip.volume ?? 1}
                onChange={e => editor.updateClip(clip.id, { volume: parseFloat(e.target.value) }, true)}
                onMouseUp={e => editor.updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white" />
              <span className="w-12 text-right text-xs font-mono text-neutral-400">{Math.round((clip.volume ?? 1) * 100)}%</span>
            </div>
            {/* Fade In/Out */}
            <div className="pt-2 border-t border-[#27272a] space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Fade In</span><span>{clip.fadeIn ?? 0}s</span></div>
                <input type="range" min="0" max="5" step="0.1" value={clip.fadeIn ?? 0} onChange={e => editor.updateClip(clip.id, { fadeIn: parseFloat(e.target.value) }, true)} className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Fade Out</span><span>{clip.fadeOut ?? 0}s</span></div>
                <input type="range" min="0" max="5" step="0.1" value={clip.fadeOut ?? 0} onChange={e => editor.updateClip(clip.id, { fadeOut: parseFloat(e.target.value) }, true)} className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none" />
              </div>
            </div>
          </Popover>
        )}
      </div>

      {/* Speed */}
      <div className="relative">
        <button onClick={() => toggleTab('speed')} disabled={disabled || type === 'text'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'speed' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Gauge className="w-4 h-4" />
        </button>
        {clip && type !== 'text' && (
          <Popover isOpen={activeTab === 'speed'} title="Velocidad">
            <div className="flex items-center gap-3">
              <input type="range" min="0.25" max="4" step="0.25"
                value={clip.speed ?? 1}
                onChange={e => editor.updateClip(clip.id, { speed: parseFloat(e.target.value) }, true)}
                onMouseUp={e => editor.updateClip(clip.id, { speed: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <div className="w-12 bg-[#27272a] border border-[#3f3f46] rounded flex items-center justify-center py-1">
                <span className="text-[10px] font-mono text-white">{clip.speed ?? 1}x</span>
              </div>
            </div>
          </Popover>
        )}
      </div>

      {/* Audio FX */}
      <div className="relative">
        <button onClick={() => toggleTab('audiofx')} disabled={disabled || (type !== 'audio' && type !== 'video')} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'audiofx' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Music className="w-4 h-4" />
        </button>
        {clip && (type === 'audio' || type === 'video') && (
          <Popover isOpen={activeTab === 'audiofx'} title="Efectos de Voz IA">
            <select value={clip.voiceFx || ''} onChange={e => editor.updateClip(clip.id, { voiceFx: e.target.value })}
              className="w-full bg-[#27272a] text-[11px] p-2 rounded-lg outline-none border border-[#3f3f46] text-white focus:border-blue-500 transition-colors">
              <option value="">Ninguno</option>
              <option value="deep">Voz Profunda</option>
              <option value="chipmunk">Ardilla</option>
              <option value="echo">Eco</option>
              <option value="radio">Radio Antigua</option>
            </select>
            <label className="flex items-center gap-2 mt-2 text-[11px] text-neutral-300 cursor-pointer">
              <input type="checkbox" checked={clip.noiseReduction || false}
                onChange={e => editor.updateClip(clip.id, { noiseReduction: e.target.checked })} 
                className="accent-emerald-500 w-3.5 h-3.5" />
            </label>
          </Popover>
        )}
      </div>

      {/* Text Styles */}
      <div className="relative">
        <button onClick={() => toggleTab('text')} disabled={disabled || type !== 'text'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'text' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Type className="w-4 h-4" />
        </button>
        {clip && type === 'text' && (
          <Popover isOpen={activeTab === 'text'} title="Tipografía & Texto">
            {/* Text content */}
            <textarea value={clip.text || ''}
              onChange={e => editor.updateClip(clip.id, { text: e.target.value }, true)}
              className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-lg p-2.5 outline-none focus:border-yellow-500 transition-colors resize-none min-h-[50px]" />
            
            {/* Font Family */}
            <div className="mt-3">
              <label className="text-[10px] text-neutral-400 mb-1 block uppercase tracking-wider">Fuente</label>
              <select value={clip.style?.fontFamily || 'Inter'}
                onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, fontFamily: e.target.value } })}
                className="w-full bg-[#27272a] text-xs p-1.5 rounded-lg outline-none border border-[#3f3f46] text-white focus:border-yellow-500">
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

            {/* Size + Style Toggles */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-neutral-400 mb-1 block uppercase tracking-wider">Tamaño</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="12" max="144" step="2"
                    value={clip.style?.fontSize || 48}
                    onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, fontSize: parseInt(e.target.value) } }, true)}
                    className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                  <span className="text-[10px] font-mono text-white w-8 text-right">{clip.style?.fontSize || 48}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 mb-1 block uppercase tracking-wider">Estilo</label>
                <div className="flex gap-1">
                  {[{key:'bold',label:'B',cls:'font-black'},{key:'italic',label:'I',cls:'italic'},{key:'underline',label:'U',cls:'underline'}].map(s => (
                    <button key={s.key} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, [s.key]: !clip.style?.[s.key] } })}
                      className={`flex-1 py-1 text-[11px] ${s.cls} rounded border transition-all ${clip.style?.[s.key] ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-400 hover:text-white'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color + BG */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Color Texto</label>
                <div className="flex gap-1 flex-wrap">
                  {['#ffffff','#facc15','#ef4444','#3b82f6','#22c55e','#f97316','#000000'].map(c => (
                    <button key={c} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, fontColor: c } })}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${clip.style?.fontColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={clip.style?.fontColor || '#ffffff'}
                    onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, fontColor: e.target.value } })}
                    className="w-5 h-5 p-0 border-0 rounded-full cursor-pointer bg-transparent" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 mb-1.5 block uppercase tracking-wider">Fondo Texto</label>
                <div className="flex gap-1 flex-wrap">
                  {['transparent','#000000','#ffffff','#ef4444','#3b82f6','#facc15'].map(c => (
                    <button key={c} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, bgColor: c === 'transparent' ? null : c } })}
                      className={`w-5 h-5 rounded border-2 transition-transform ${ (clip.style?.bgColor || null) === (c === 'transparent' ? null : c) ? 'border-white scale-110' : 'border-neutral-600 hover:scale-105'}`}
                      style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%),linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%)' : undefined, backgroundSize: '6px 6px', backgroundPosition: '0 0,3px 3px' }} />
                  ))}
                  <input type="color" value={clip.style?.bgColor || '#000000'}
                    onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, bgColor: e.target.value } })}
                    className="w-5 h-5 p-0 border-0 rounded cursor-pointer bg-transparent" />
                </div>
              </div>
            </div>

            {/* Outline + Shadow */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Contorno</label>
                  <span className="text-[9px] font-mono text-neutral-500">{clip.style?.outlineWidth || 0}px</span>
                </div>
                <input type="range" min="0" max="8" step="1"
                  value={clip.style?.outlineWidth || 0}
                  onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, outlineWidth: parseInt(e.target.value) } }, true)}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Sombra</label>
                  <span className="text-[9px] font-mono text-neutral-500">{clip.style?.shadowBlur || 0}px</span>
                </div>
                <input type="range" min="0" max="20" step="1"
                  value={clip.style?.shadowBlur || 0}
                  onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, shadowBlur: parseInt(e.target.value) } }, true)}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>

            {/* Alignment + Position */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-neutral-400 mb-1 block uppercase tracking-wider">Alineación</label>
                <div className="flex gap-1">
                  {[{v:'left',l:'⬛'},{v:'center',l:'⬛'},{v:'right',l:'⬛'}].map((a,i) => (
                    <button key={a.v} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, align: a.v } })}
                      className={`flex-1 py-1 text-[11px] rounded border transition-all ${clip.style?.align === a.v || (!clip.style?.align && a.v === 'center') ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-400'}`}>
                      {i === 0 ? '⬛▪▪' : i === 1 ? '▪⬛▪' : '▪▪⬛'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Posición Y</label>
                  <span className="text-[9px] font-mono text-neutral-500">{Math.round((clip.style?.posY ?? 0.5) * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01"
                  value={clip.style?.posY ?? 0.5}
                  onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, posY: parseFloat(e.target.value) } }, true)}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
              </div>
            </div>

            {/* Animation */}
            <div className="mt-3">
              <label className="text-[10px] text-neutral-400 mb-1 block uppercase tracking-wider">Animación Entrada</label>
              <select value={clip.style?.animation || ''} onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, animation: e.target.value } })}
                className="w-full bg-[#27272a] text-xs p-1.5 rounded-lg outline-none border border-[#3f3f46] text-white focus:border-yellow-500">
                <option value="">Estático</option>
                <option value="fade">Aparición suave (Fade In)</option>
                <option value="typewriter">Máquina de escribir</option>
                <option value="slideup">Deslizar hacia arriba</option>
                <option value="bounce">Rebote</option>
                <option value="pop">Pop (Escala)</option>
              </select>
            </div>
          </Popover>
        )}
      </div>

      {/* PiP & Transform */}
      <div className="relative">
        <button onClick={() => toggleTab('pip')} disabled={disabled || type !== 'video'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'pip' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <ImageIcon className="w-4 h-4" />
        </button>
        {clip && type === 'video' && (
          <Popover isOpen={activeTab === 'pip'} title="Transformación (PiP)">
            {[
              { key: 'scale', label: 'Escala', min: 0.1, max: 3, step: 0.1, def: 1, unit: 'x' },
              { key: 'x', label: 'Posición X', min: -1000, max: 1000, step: 10, def: 0, unit: 'px' },
              { key: 'y', label: 'Posición Y', min: -1000, max: 1000, step: 10, def: 0, unit: 'px' }
            ].map(t => {
              const val = clip.transform?.[t.key] ?? t.def;
              return (
                <div key={t.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-neutral-400">{t.label}</span>
                    <span className="text-[9px] font-mono text-neutral-500">{val}{t.unit}</span>
                  </div>
                  <input type="range" min={t.min} max={t.max} step={t.step} value={val}
                    onChange={e => editor.updateClip(clip.id, { transform: { ...(clip.transform || {}), [t.key]: parseFloat(e.target.value) } }, true)}
                    onMouseUp={e => editor.updateClip(clip.id, { transform: { ...(clip.transform || {}), [t.key]: parseFloat(e.target.value) } })}
                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              )
            })}
          </Popover>
        )}
      </div>

      {/* Color Grading (Advanced 3-Way) */}
      <div className="relative">
        <button onClick={() => toggleTab('color')} disabled={disabled || type !== 'video'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'color' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Palette className="w-4 h-4" />
        </button>
        {clip && type === 'video' && (
          <Popover isOpen={activeTab === 'color'} title="Corrección de Color 3-Way">
            {/* EDIUS style 3-way color correction mock UI */}
            <div className="flex gap-4 mb-4">
              {['Sombras', 'Medios', 'Luces'].map(t => (
                <div key={t} className="flex flex-col items-center flex-1">
                  <span className="text-[9px] text-neutral-400 uppercase tracking-wider mb-2">{t}</span>
                  <div className="w-16 h-16 rounded-full border border-[#3f3f46] bg-[#121212] flex items-center justify-center relative overflow-hidden">
                     {/* Mock Color Wheel */}
                     <div className="w-full h-full bg-gradient-conic from-red-500 via-green-500 to-blue-500 opacity-20 rounded-full"></div>
                     <div className="w-2 h-2 bg-white rounded-full absolute shadow-[0_0_5px_rgba(0,0,0,1)]"></div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" defaultValue="0.5" className="w-full h-1 mt-3 bg-neutral-700 rounded-lg appearance-none accent-white" />
                </div>
              ))}
            </div>
            {/* Basic Sliders */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#27272a] pt-3">
              {[
                {k:'brightness', label:'Exposición', min:-1, max:1, step:0.05, c:'accent-white'},
                {k:'contrast', label:'Contraste', min:0, max:2, step:0.05, c:'accent-white'},
                {k:'saturation', label:'Saturación', min:0, max:3, step:0.1, c:'accent-pink-500'},
                {k:'temperature', label:'Temperatura', min:-1, max:1, step:0.05, c:'accent-orange-500'}
              ].map(c => (
                <div key={c.k}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-neutral-400">{c.label}</span>
                    <span className="text-[9px] font-mono text-neutral-500">{Math.round((clip.color?.[c.k] ?? (c.k==='contrast'||c.k==='saturation'?1:0)) * 100)}%</span>
                  </div>
                  <input type="range" min={c.min} max={c.max} step={c.step}
                    value={clip.color?.[c.k] ?? (c.k==='contrast'||c.k==='saturation'?1:0)}
                    onChange={e => editor.updateClip(clip.id, { color: { ...(clip.color || {brightness:0,contrast:1,saturation:1,temperature:0}), [c.k]: parseFloat(e.target.value) } }, true)}
                    onMouseUp={e => editor.updateClip(clip.id, { color: { ...(clip.color || {brightness:0,contrast:1,saturation:1,temperature:0}), [c.k]: parseFloat(e.target.value) } })}
                    className={`w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer ${c.c}`} />
                </div>
              ))}
            </div>
          </Popover>
        )}
      </div>

      {/* FX Filters, Chroma & Tracking */}
      <div className="relative">
        <button onClick={() => toggleTab('fx')} disabled={disabled || type !== 'video'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'fx' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Wand2 className="w-4 h-4" />
        </button>
        {clip && type === 'video' && (
          <Popover isOpen={activeTab === 'fx'} title="Máscaras, FX & Tracking">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[ {id:'blur', label:'Desenfocar Gaussian'}, {id:'vhs', label:'Glitch / VHS'}, {id:'bw', label:'Cinematic LUT'}, {id:'vignette', label:'Viñeta Dinámica'} ].map(fx => {
                const active = clip.effects?.includes(fx.id);
                return (
                  <button key={fx.id} onClick={() => {
                    const current = clip.effects || [];
                    const next = active ? current.filter(e => e !== fx.id) : [...current, fx.id];
                    editor.updateClip(clip.id, { effects: next });
                  }} className={`py-1.5 px-1 text-[10px] font-medium rounded-lg border transition-all flex flex-col items-center gap-1 ${active ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-300 hover:border-neutral-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-purple-500' : 'bg-neutral-600'}`}></div>
                    {fx.label}
                  </button>
                )
              })}
            </div>
            
            {/* Tracking / Masking */}
            <div className="border-t border-[#27272a] pt-3 mb-3">
              <label className="flex items-center gap-2 text-[11px] text-neutral-200 font-semibold cursor-pointer mb-2">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                Rastreo de Movimiento (Tracking)
              </label>
              <div className="flex gap-2">
                <button className="flex-1 bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 text-[10px] py-1.5 rounded border border-[#3f3f46]">Seleccionar Sujeto</button>
                <button className="flex-1 bg-blue-600/20 text-blue-400 text-[10px] py-1.5 rounded border border-blue-500/30">Iniciar IA Tracking</button>
              </div>
            </div>

            {/* Chroma Key */}
            <div className="border-t border-[#27272a] pt-3">
              <label className="flex items-center gap-2 text-[11px] text-neutral-200 font-semibold cursor-pointer mb-2">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                Chroma Key Avanzado
                <input type="checkbox" checked={!!clip.chromaKey}
                  onChange={e => editor.updateClip(clip.id, { chromaKey: e.target.checked ? { color: '#00ff00', similarity: 0.2, blend: 0.1 } : null })} 
                  className="accent-emerald-500 w-3 h-3 ml-auto" />
              </label>
              {clip.chromaKey && (
                <div className="space-y-3 pl-5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-400">Color a extraer</span>
                    <input type="color" value={clip.chromaKey.color} onChange={e => editor.updateClip(clip.id, { chromaKey: { ...clip.chromaKey, color: e.target.value } })} className="w-5 h-5 p-0 border-0 rounded cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-neutral-400">Tolerancia (Spill)</span>
                      <span className="font-mono text-neutral-500">{Math.round(clip.chromaKey.similarity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="0.5" step="0.01" value={clip.chromaKey.similarity} onChange={e => editor.updateClip(clip.id, { chromaKey: { ...clip.chromaKey, similarity: parseFloat(e.target.value) } }, true)} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                </div>
              )}
            </div>
          </Popover>
        )}
      </div>

      {/* Keyframes */}
      <div className="relative">
        <button onClick={() => toggleTab('keyframes')} disabled={disabled || type === 'audio'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'keyframes' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Activity className="w-4 h-4" />
        </button>
        {clip && type !== 'audio' && (
          <Popover isOpen={activeTab === 'keyframes'} title="Animación & Keyframes">
            <div className="space-y-3 text-center py-4">
               <Activity className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-50" />
               <p className="text-[11px] text-neutral-400 px-4">Añade puntos de control (Keyframes) para animar posición, escala u opacidad a lo largo del tiempo.</p>
               <button className="bg-[#27272a] hover:bg-[#3f3f46] text-white text-[11px] px-4 py-2 rounded-lg font-medium border border-[#3f3f46] shadow-md transition-all">
                  + Añadir Keyframe aquí
               </button>
            </div>
          </Popover>
        )}
      </div>

      {/* Transition */}
      <div className="relative">
        <button onClick={() => toggleTab('transition')} disabled={disabled || type !== 'video'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'transition' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        {clip && type === 'video' && (
          <Popover isOpen={activeTab === 'transition'} title="Transición (Entrada)">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['cut','Ninguna'],['fade','Fundido'],['wipeleft','Barrido'],['slideleft','Deslizar'],['zoom','Zoom In']].map(([t, label]) => {
                const active = (clip.transitionIn?.type ?? 'cut') === t;
                return (
                  <button key={t} onClick={() => editor.updateClip(clip.id, { transitionIn: t === 'cut' ? null : { type: t, duration: 0.5 } })}
                    className={`py-1.5 text-[10px] font-medium rounded border transition-all ${active ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-300'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            {clip.transitionIn && (
              <div>
                <div className="flex justify-between items-center mb-1 text-[10px]">
                  <span className="text-neutral-400">Duración</span>
                  <span className="font-mono text-neutral-500">{clip.transitionIn.duration}s</span>
                </div>
                <input type="range" min="0.2" max="2" step="0.1" value={clip.transitionIn.duration} onChange={e => editor.updateClip(clip.id, { transitionIn: { ...clip.transitionIn, duration: parseFloat(e.target.value) } }, true)} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            )}
          </Popover>
        )}
      </div>
    </div>
  );
}
