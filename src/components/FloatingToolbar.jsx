import React, { useState } from 'react';
import { Volume2, Gauge, Palette, ArrowLeftRight, Type, ImageIcon, Wand2, Music } from 'lucide-react';

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
      <div className="absolute top-[130%] left-1/2 -translate-x-1/2 w-72 bg-[#18181b] border border-[#27272a] rounded-xl p-4 shadow-2xl cursor-default text-left z-[100]" onClick={e => e.stopPropagation()}>
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
              Eliminar Ruido de Fondo
            </label>
        )}
      </div>

      {/* Text Styles */}
      <div className="relative">
        <button onClick={() => toggleTab('text')} disabled={disabled || type !== 'text'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'text' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Type className="w-4 h-4" />
        </button>
        {clip && type === 'text' && (
          <Popover isOpen={activeTab === 'text'} title="Formato de Texto">
            <textarea value={clip.text || ''}
              onChange={e => editor.updateClip(clip.id, { text: e.target.value }, true)}
              className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-lg p-2.5 outline-none focus:border-yellow-500 transition-colors resize-none min-h-[60px]" />
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-[10px] text-neutral-400 mb-1 block">Tamaño</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="20" max="120" step="2"
                    value={clip.style?.fontSize || 48}
                    onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, fontSize: parseInt(e.target.value) } }, true)}
                    className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 mb-1 block">Color</label>
                <div className="flex gap-1">
                  {['#ffffff','#facc15','#ef4444','#3b82f6','#22c55e'].map(c => (
                    <button key={c} onClick={() => editor.updateClip(clip.id, { style: { ...clip.style, fontColor: c } })}
                      className={`w-4 h-4 rounded-full border border-[#27272a] ${clip.style?.fontColor === c ? 'ring-1 ring-white' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2">
              <label className="text-[10px] text-neutral-400 mb-1 block">Animación</label>
              <select value={clip.style?.animation || ''} onChange={e => editor.updateClip(clip.id, { style: { ...clip.style, animation: e.target.value } })}
                className="w-full bg-[#27272a] text-xs p-1.5 rounded outline-none border border-[#3f3f46] text-white">
                <option value="">Estático</option>
                <option value="fade">Aparición suave (Fade In)</option>
                <option value="typewriter">Máquina de escribir</option>
                <option value="slideup">Deslizar hacia arriba</option>
              </select>
            </div>
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
        )}
      </div>

      {/* Color Grading */}
      <div className="relative">
        <button onClick={() => toggleTab('color')} disabled={disabled || type !== 'video'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'color' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Palette className="w-4 h-4" />
        </button>
        {clip && type === 'video' && (
          <Popover isOpen={activeTab === 'color'} title="Corrección de Color">
            {[
              {k:'brightness', label:'Brillo', min:-1, max:1, step:0.05, c:'accent-yellow-500'},
              {k:'contrast', label:'Contraste', min:0, max:2, step:0.05, c:'accent-white'},
              {k:'saturation', label:'Saturación', min:0, max:3, step:0.1, c:'accent-pink-500'}
            ].map(c => (
              <div key={c.k}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-neutral-400">{c.label}</span>
                  <span className="text-[9px] font-mono text-neutral-500">{Math.round((clip.color?.[c.k] ?? (c.k==='brightness'?0:1)) * 100)}%</span>
                </div>
                <input type="range" min={c.min} max={c.max} step={c.step}
                  value={clip.color?.[c.k] ?? (c.k==='brightness'?0:1)}
                  onChange={e => editor.updateClip(clip.id, { color: { ...(clip.color || {brightness:0,contrast:1,saturation:1}), [c.k]: parseFloat(e.target.value) } }, true)}
                  onMouseUp={e => editor.updateClip(clip.id, { color: { ...(clip.color || {brightness:0,contrast:1,saturation:1}), [c.k]: parseFloat(e.target.value) } })}
                  className={`w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer ${c.c}`} />
              </div>
            ))}
        )}
      </div>

      {/* FX Filters & Chroma */}
      <div className="relative">
        <button onClick={() => toggleTab('fx')} disabled={disabled || type !== 'video'} className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'fx' ? 'bg-[#27272a] text-white' : 'hover:bg-[#27272a]/50 text-neutral-400 hover:text-white'}`}>
          <Wand2 className="w-4 h-4" />
        </button>
        {clip && type === 'video' && (
          <Popover isOpen={activeTab === 'fx'} title="Filtros Visuales & Chroma">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[ {id:'blur', label:'Desenfocar'}, {id:'vhs', label:'Retro VHS'}, {id:'bw', label:'Blanco/Negro'}, {id:'vignette', label:'Viñeta'} ].map(fx => {
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
            
            {/* Chroma Key */}
            <div className="border-t border-[#27272a] pt-3">
              <label className="flex items-center gap-2 text-[11px] text-neutral-200 font-semibold cursor-pointer mb-2">
                <input type="checkbox" checked={!!clip.chromaKey}
                  onChange={e => editor.updateClip(clip.id, { chromaKey: e.target.checked ? { color: '#00ff00', similarity: 0.2 } : null })} 
                  className="accent-emerald-500 w-3 h-3" />
                Chroma Key (Pantalla Verde)
              </label>
              {clip.chromaKey && (
                <div className="space-y-3 pl-5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-400">Color a borrar</span>
                    <input type="color" value={clip.chromaKey.color} onChange={e => editor.updateClip(clip.id, { chromaKey: { ...clip.chromaKey, color: e.target.value } })} className="w-5 h-5 p-0 border-0 rounded cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-neutral-400">Intensidad</span>
                      <span className="font-mono text-neutral-500">{Math.round(clip.chromaKey.similarity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="0.5" step="0.01" value={clip.chromaKey.similarity} onChange={e => editor.updateClip(clip.id, { chromaKey: { ...clip.chromaKey, similarity: parseFloat(e.target.value) } }, true)} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                </div>
              )}
            </div>
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
        </div>
      )}

    </div>
  );
}
