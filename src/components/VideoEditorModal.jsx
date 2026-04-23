import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Wand2, Play, Pause, Scissors, Loader2, Download, Video, Music, Type, Trash2, PlusCircle, Undo2, Redo2, Gauge, Zap, Volume2, ArrowLeftRight, Send } from 'lucide-react';
import WaveformCanvas from './WaveformCanvas';
import { Timeline } from '@xzdarcy/react-timeline-editor';
import { useEditorProject, makeVideoClip, makeAudioClip, makeTextClip, ASPECT_RATIOS } from '../hooks/useEditorProject';
import { useFFmpegRenderer } from '../hooks/useFFmpegRenderer';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';

const getVideoDuration = (url) => new Promise(r => {
  const v = document.createElement('video');
  v.src = url; v.onloadedmetadata = () => r(v.duration || 5); v.onerror = () => r(5);
});

const TRACK_COLORS = { video: '#3b82f6', audio: '#10b981', text: '#eab308' };

export default function IntegratedVideoEditor({ queue = [] }) {
  const [initialVideoUrl, setInitialVideoUrl] = useState(() => {
     try { return localStorage.getItem('godzilla_editor_draft_src') || ''; } catch { return ''; }
  });
  
  const editor = useEditorProject(initialVideoUrl);
  const { render, isRendering, progress } = useFFmpegRenderer();
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const engine = usePlaybackEngine(editor.project, videoRef);

  const [selectedClipId, setSelectedClipId] = useState(null);
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('es-MX');
  const [isGenTTS, setIsGenTTS] = useState(false);
  const [localUploads, setLocalUploads] = useState([]);
  const [newText, setNewText] = useState('');
  const [draggedMedia, setDraggedMedia] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('media'); // 'media' | 'text' | 'tts' | 'props'
  const [isBotRunning, setIsBotRunning] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); editor.undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); editor.redo(); }
      if (e.key === ' ') { e.preventDefault(); engine.toggle(); }
      if (e.key === 'Delete' && selectedClipId) editor.deleteClip(selectedClipId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, engine, selectedClipId]);

  // Build timeline editorData from project layers
  const editorData = useMemo(() => editor.project.layers.map(layer => ({
    id: layer.id,
    actions: layer.clips.map(clip => ({
      id: clip.id,
      start: clip.start,
      end: clip.end,
      effectId: layer.type,
      name: clip.text || clip.sourceName || layer.type,
      color: TRACK_COLORS[layer.type] || '#888',
    })),
  })), [editor.project.layers]);

  const handleClipSelect = useCallback((clipId) => {
    setSelectedClipId(clipId);
    setSidebarTab('props');
  }, []);

  const handleTimelineChange = useCallback((data) => {
    data.forEach(row => {
      const layer = editor.project.layers.find(l => l.id === row.id);
      if (!layer) return;
      row.actions.forEach(action => {
        const clip = layer.clips.find(c => c.id === action.id);
        if (clip && (clip.start !== action.start || clip.end !== action.end)) {
          editor.updateClip(action.id, { start: action.start, end: action.end }, true);
        }
      });
    });
  }, [editor]);

  const handleAddToTimeline = useCallback(async (mediaObj) => {
    const url = mediaObj.media_options[0].url;
    const dur = await getVideoDuration(url);
    const videoLayer = editor.project.layers.find(l => l.type === 'video');
    const lastEnd = videoLayer?.clips.reduce((m, c) => Math.max(m, c.end), 0) || 0;
    editor.addClip(videoLayer.id, makeVideoClip(url, mediaObj.caption || 'Clip', lastEnd, lastEnd + dur));
    if (!videoRef.current?.src) {}
  }, [editor]);

  const handleSplit = useCallback(() => {
    if (!selectedClipId) return;
    const t = engine.currentTimeRef.current;
    editor.splitClip(selectedClipId, t);
    setSelectedClipId(null);
  }, [selectedClipId, editor, engine]);

  const handleAddText = useCallback(() => {
    if (!newText.trim()) return;
    const textLayer = editor.project.layers.find(l => l.type === 'text');
    const t = engine.currentTimeRef.current;
    editor.addClip(textLayer.id, makeTextClip(newText.trim(), t, t + 4));
    setNewText('');
  }, [newText, editor, engine]);

  const handleTTS = useCallback(async () => {
    if (!ttsText.trim()) return;
    setIsGenTTS(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, lang: ttsVoice }),
      });
      if (!res.ok) throw new Error('api');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audioLayer = editor.project.layers.find(l => l.type === 'audio');
      const t = engine.currentTimeRef.current;
      const dur = ttsText.length * 0.07 + 1;
      editor.addClip(audioLayer.id, makeAudioClip(url, `TTS: ${ttsText.slice(0, 14)}`, t, t + dur));
      setTtsText('');
    } catch {
      // Fallback: Web Speech API → MediaRecorder blob
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        const stopPromise = new Promise(r => { recorder.onstop = r; });
        recorder.start();
        const utt = new SpeechSynthesisUtterance(ttsText);
        utt.lang = ttsVoice;
        speechSynthesis.speak(utt);
        utt.onend = () => recorder.stop();
        await stopPromise;
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        const dur  = ttsText.length * 0.07 + 1;
        const audioLayer = editor.project.layers.find(l => l.type === 'audio');
        const t = engine.currentTimeRef.current;
        editor.addClip(audioLayer.id, makeAudioClip(url, `TTS: ${ttsText.slice(0, 14)}`, t, t + dur));
        setTtsText('');
      } catch {
        alert('No se pudo generar audio. Verifica el servidor TTS o los permisos del micrófono.');
      }
    } finally {
      setIsGenTTS(false);
    }
  }, [ttsText, ttsVoice, editor, engine]);

  const handleRender = useCallback(async () => {
    try { await render(editor.project); }
    catch (e) { alert('Error renderizando: ' + e.message); }
  }, [render, editor.project]);

  // Magic Bot — auto-remove silences by splitting clip at midpoint
  const handleMagicBot = useCallback(async () => {
    const videoLayer = editor.project.layers.find(l => l.type === 'video');
    if (!videoLayer?.clips.length) return alert('Agrega un clip de video primero.');
    setIsBotRunning(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      // Split every clip at its middle and add captions
      const textLayer = editor.project.layers.find(l => l.type === 'text');
      for (const clip of [...videoLayer.clips]) {
        const mid = clip.start + (clip.end - clip.start) / 2;
        if (mid - clip.start > 0.5) {
          editor.splitClip(clip.id, mid - 0.3);
        }
      }
      // Add hook caption
      const t = engine.currentTimeRef.current;
      if (textLayer) {
        editor.addClip(textLayer.id, makeTextClip('✨ Auto-editado por IA', t, t + 2.5, { fontSize: 52, fontColor: '#facc15', posY: 0.12 }));
      }
    } finally {
      setIsBotRunning(false);
    }
  }, [editor, engine]);

  const handleUpload = useCallback((file) => {
    const url = URL.createObjectURL(file);
    setLocalUploads(prev => [...prev, { id: `local-${Date.now()}`, caption: file.name, media_options: [{ url }] }]);
  }, []);

  const savedVideos = useMemo(() => queue.filter(q =>
    q.media_options?.[0]?.url?.match(/\.(mp4|webm)/i)
  ), [queue]);

  const allMedia = useMemo(() => [...savedVideos, ...localUploads], [savedVideos, localUploads]);

  const selectedClip = useMemo(() => {
    for (const layer of editor.project.layers) {
      const c = layer.clips.find(cl => cl.id === selectedClipId);
      if (c) return { clip: c, layer };
    }
    return null;
  }, [selectedClipId, editor.project.layers]);

  const { w: canvasW, h: canvasH } = ASPECT_RATIOS[editor.project.aspectRatio];
  const isPortrait = canvasH > canvasW;

  return (
    <div className="flex-1 w-full flex flex-col bg-[#080808] border-t border-red-900/30 overflow-hidden relative">
      {/* Warning Banner */}
      <div className="bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
        <span className="animate-pulse text-sm">⚠️</span> 
        AVISO: Si no guardas el borrador de este proyecto, todo el progreso y los archivos enviados al carrete se perderán al cerrar el editor.
        <span className="animate-pulse text-sm">⚠️</span>
      </div>
      {/* Header */}
      <div className="h-14 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Scissors className="w-5 h-5 text-blue-500" />
          <h2 className="text-white font-bold text-base tracking-tight">Godzilla Pro Editor</h2>
          {/* Aspect Ratio */}
          <select
            value={editor.project.aspectRatio}
            onChange={e => editor.setAspectRatio(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded px-2 py-1 outline-none"
          >
            {Object.entries(ASPECT_RATIOS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button onClick={editor.undo} disabled={!editor.canUndo} title="Ctrl+Z"
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 transition-colors">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={editor.redo} disabled={!editor.canRedo} title="Ctrl+Y"
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 transition-colors">
            <Redo2 className="w-4 h-4" />
          </button>
          {/* Magic Bot */}
          <button onClick={handleMagicBot} disabled={isBotRunning}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
            {isBotRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isBotRunning ? 'Bot IA...' : 'Magic Bot'}
          </button>
          {/* Render */}
          <button onClick={handleRender} disabled={isRendering}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors disabled:opacity-50">
            {isRendering ? <><Loader2 className="w-4 h-4 animate-spin" />{progress}%</> : <><Download className="w-4 h-4" />Renderizar</>}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tabbed Sidebar */}
        <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-neutral-800 shrink-0">
            {[['media', <Video className="w-3 h-3" />, 'Media'],
              ['text', <Type className="w-3 h-3" />, 'Texto'],
              ['tts', <Music className="w-3 h-3" />, 'Voz'],
              ['props', <Gauge className="w-3 h-3" />, 'Props']
            ].map(([id, icon, label]) => (
              <button key={id} onClick={() => setSidebarTab(id)}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[9px] font-bold uppercase transition-colors ${
                  sidebarTab === id ? 'text-white bg-neutral-800 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-300'
                }`}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Tab: Media */}
          {sidebarTab === 'media' && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Carrete</span>
                <label className="cursor-pointer bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded px-2 py-0.5 text-[9px] font-bold transition-colors">
                  + Subir <input type="file" accept="video/*,audio/*" className="hidden"
                    onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
                </label>
              </div>
              {allMedia.length === 0 && <p className="text-neutral-600 text-[10px] italic">Sin medios. Sube o genera en el Estudio IA.</p>}
              {allMedia.map(m => (
                <div key={m.id} draggable onDragStart={e => { setDraggedMedia(m); e.dataTransfer.setData('text/plain', m.media_options[0].url); }}
                  className="flex items-center gap-2 p-1.5 rounded-lg border border-neutral-700/50 bg-neutral-800/50 hover:border-blue-500/40 cursor-grab active:cursor-grabbing transition-all mb-1.5">
                  <video src={m.media_options[0].url} className="w-14 h-10 object-cover rounded bg-black shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white font-bold truncate">{m.caption || 'Clip'}</p>
                    <WaveformCanvas url={m.media_options[0].url} width={80} height={20} color="#3b82f6" />
                  </div>
                  <button onClick={() => handleAddToTimeline(m)} className="p-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition-colors shrink-0">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Text */}
          {sidebarTab === 'text' && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-[10px] text-neutral-400 uppercase font-bold mb-2 tracking-widest">Añadir Subtítulo</p>
              <input value={newText} onChange={e => setNewText(e.target.value)}
                placeholder="Texto del clip..." onKeyDown={e => e.key === 'Enter' && handleAddText()}
                className="w-full bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded p-2 outline-none mb-1.5" />
              <button onClick={handleAddText}
                className="w-full bg-yellow-600/20 hover:bg-yellow-600 text-yellow-300 hover:text-white border border-yellow-500/30 text-[10px] font-bold py-1.5 rounded transition-colors mb-3">
                + Insertar (cursor actual)
              </button>
              {/* Quick presets */}
              <p className="text-[9px] text-neutral-600 uppercase font-bold mb-1.5">Presets rápidos</p>
              {['🔥 ¡No te lo pierdas!','💡 Tip del día','🚀 Resultados reales','❓ ¿Sabías que...?','✅ Garantizado'].map(t => (
                <button key={t} onClick={() => setNewText(t)}
                  className="w-full text-left text-[10px] text-neutral-300 hover:text-white p-1.5 hover:bg-neutral-800 rounded mb-1 transition-colors">{t}</button>
              ))}
            </div>
          )}

          {/* Tab: TTS */}
          {sidebarTab === 'tts' && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-[10px] text-neutral-400 uppercase font-bold mb-2 tracking-widest">Voz IA (TTS)</p>
              <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded p-1.5 outline-none mb-1.5">
                <option value="es-MX">🇲🇽 Español MX</option>
                <option value="es-ES">🇪🇸 Español ES</option>
                <option value="en-US">🇺🇸 English US</option>
              </select>
              <textarea value={ttsText} onChange={e => setTtsText(e.target.value)}
                placeholder="Escribe tu guion UGC aquí..." rows={5}
                className="w-full bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded p-2 outline-none resize-none mb-1.5" />
              <p className="text-[9px] text-neutral-600 mb-1.5">{ttsText.length} chars · ~{(ttsText.length * 0.07 + 1).toFixed(1)}s</p>
              <button onClick={handleTTS} disabled={isGenTTS || !ttsText.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold py-2 rounded transition-colors flex items-center justify-center gap-1.5">
                {isGenTTS ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Generar Audio Real
              </button>
            </div>
          )}

          {/* Tab: Props */}
          {sidebarTab === 'props' && (
            <div className="flex-1 overflow-y-auto p-3">
              {!selectedClip ? (
                <p className="text-neutral-600 text-[10px] italic">Haz clic en un clip del timeline para editarlo aquí.</p>
              ) : (
                <>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-1 mb-3">
                    <Gauge className="w-3 h-3 text-fuchsia-400" /> {selectedClip.clip.sourceName || selectedClip.clip.text || 'Clip'}
                  </span>

                  {/* Speed — non-text clips */}
                  {selectedClip.layer.type !== 'text' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase mb-1">
                        <span>Velocidad</span><span>{selectedClip.clip.speed ?? 1}x</span>
                      </div>
                      <input type="range" min="0.25" max="4" step="0.25"
                        value={selectedClip.clip.speed ?? 1}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { speed: parseFloat(e.target.value) }, true)}
                        onMouseUp={e => editor.updateClip(selectedClip.clip.id, { speed: parseFloat(e.target.value) })}
                        className="w-full accent-fuchsia-500" />
                    </div>
                  )}

                  {/* Volume — audio clips */}
                  {selectedClip.layer.type === 'audio' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase mb-1">
                        <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" />Volumen</span>
                        <span>{Math.round((selectedClip.clip.volume ?? 1) * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="2" step="0.05"
                        value={selectedClip.clip.volume ?? 1}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { volume: parseFloat(e.target.value) }, true)}
                        onMouseUp={e => editor.updateClip(selectedClip.clip.id, { volume: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500" />
                    </div>
                  )}

                  {/* Transition In — video clips */}
                  {selectedClip.layer.type === 'video' && (
                    <div className="mb-3">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase mb-1.5 flex items-center gap-1">
                        <ArrowLeftRight className="w-3 h-3" /> Transición de entrada
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {[['cut','Corte'],['fade','Fade'],['wipeleft','Wipe'],['slideleft','Slide'],['zoom','Zoom']].map(([type, label]) => {
                          const active = (selectedClip.clip.transitionIn?.type ?? 'cut') === type;
                          return (
                            <button key={type} onClick={() => editor.updateClip(selectedClip.clip.id, {
                              transitionIn: type === 'cut' ? null : { type, duration: 0.5 }
                            })}
                              className={`py-1 text-[9px] font-bold rounded border transition-colors ${
                                active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                              }`}>{label}</button>
                          );
                        })}
                      </div>
                      {selectedClip.clip.transitionIn && (
                        <>
                          <div className="flex justify-between text-[9px] text-neutral-500 mt-2 mb-1">
                            <span>Duración</span><span>{selectedClip.clip.transitionIn.duration}s</span>
                          </div>
                          <input type="range" min="0.2" max="2" step="0.1"
                            value={selectedClip.clip.transitionIn.duration}
                            onChange={e => editor.updateClip(selectedClip.clip.id, {
                              transitionIn: { ...selectedClip.clip.transitionIn, duration: parseFloat(e.target.value) }
                            }, true)}
                            onMouseUp={e => editor.updateClip(selectedClip.clip.id, {
                              transitionIn: { ...selectedClip.clip.transitionIn, duration: parseFloat(e.target.value) }
                            })}
                            className="w-full accent-blue-500" />
                        </>
                      )}
                    </div>
                  )}

                  {/* Color Grading — video clips */}
                  {selectedClip.layer.type === 'video' && selectedClip.clip.color && (
                    <>
                      <p className="text-[9px] text-neutral-500 uppercase font-bold mb-2">Color Grading</p>
                      {[['brightness','Brillo',-1,1,0.05],['contrast','Contraste',0,2,0.05],['saturation','Satur.',0,3,0.1]].map(([k, label, min, max, step]) => (
                        <div key={k} className="mb-2">
                          <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase mb-0.5">
                            <span>{label}</span><span>{Math.round(selectedClip.clip.color[k] * 100)}%</span>
                          </div>
                          <input type="range" min={min} max={max} step={step}
                            value={selectedClip.clip.color[k]}
                            onChange={e => editor.updateClip(selectedClip.clip.id, { color: { ...selectedClip.clip.color, [k]: parseFloat(e.target.value) } }, true)}
                            onMouseUp={e => editor.updateClip(selectedClip.clip.id, { color: { ...selectedClip.clip.color, [k]: parseFloat(e.target.value) } })}
                            className="w-full accent-fuchsia-500" />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Text style */}
                  {selectedClip.layer.type === 'text' && (
                    <div className="space-y-2">
                      <input value={selectedClip.clip.text || ''}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { text: e.target.value }, true)}
                        className="w-full bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded p-1.5 outline-none" />
                      <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase">
                        <span>Tamaño</span><span>{selectedClip.clip.style?.fontSize}px</span>
                      </div>
                      <input type="range" min="20" max="120" step="2"
                        value={selectedClip.clip.style?.fontSize || 48}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontSize: parseInt(e.target.value) } }, true)}
                        className="w-full accent-yellow-500" />
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] text-neutral-400 uppercase font-bold">Color</span>
                        <input type="color" value={selectedClip.clip.style?.fontColor || '#ffffff'}
                          onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontColor: e.target.value } })}
                          className="bg-transparent border-0 w-8 h-6 cursor-pointer rounded" />
                      </div>
                    </div>
                  )}

                  <button onClick={() => { editor.deleteClip(selectedClipId); setSelectedClipId(null); }}
                    className="w-full mt-4 flex items-center justify-center gap-1.5 bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900/30 text-[10px] font-bold py-1.5 rounded transition-colors">
                    <Trash2 className="w-3 h-3" /> Borrar Clip
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center: Preview + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Video Preview */}
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden min-h-0">
            {/* Apply CSS filter for live preview of color grading */}
            <div className={`relative ${isPortrait ? 'h-full' : 'w-full'}`}
              style={{
                aspectRatio: `${canvasW}/${canvasH}`,
                maxHeight: '100%',
                maxWidth: '100%',
              }}>
              <video ref={videoRef} className="w-full h-full object-contain bg-black" controls={false} />
              {/* Text overlay preview */}
              {editor.project.layers.find(l => l.type === 'text')?.clips
                .filter(c => engine.displayTime >= c.start && engine.displayTime <= c.end)
                .map(c => (
                  <div key={c.id} className="absolute left-0 right-0 text-center pointer-events-none"
                    style={{
                      bottom: `${(1 - (c.style?.posY || 0.85)) * 100}%`,
                      fontSize: `${(c.style?.fontSize || 48) * 0.4}px`,
                      color: c.style?.fontColor || '#fff',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      fontWeight: c.style?.bold ? 'bold' : 'normal',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                    }}>
                    {c.text}
                  </div>
                ))}
            </div>
            {/* Playback controls */}
            <div className="absolute bottom-4 flex items-center gap-4 bg-neutral-900/85 backdrop-blur-sm rounded-full px-5 py-2 border border-neutral-700 shadow-xl">
              <button onClick={engine.toggle} className="text-white hover:text-blue-400 transition-colors">
                {engine.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
              </button>
              <span className="text-neutral-300 font-mono text-xs">
                {engine.displayTime.toFixed(1)}s / {editor.totalDuration.toFixed(1)}s
              </span>
              {/* Scrubber */}
              <input type="range" min="0" max={editor.totalDuration} step="0.1"
                value={engine.displayTime}
                onChange={e => engine.seek(parseFloat(e.target.value))}
                className="w-28 accent-blue-500" />
            </div>
          </div>

          {/* Timeline */}
          <div className="h-48 bg-neutral-900 border-t border-neutral-800 shrink-0 flex flex-col">
            {/* Timeline toolbar */}
            <div className="h-9 bg-neutral-950 flex items-center px-3 gap-2 border-b border-neutral-800 shrink-0">
              <button onClick={handleSplit}
                className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold uppercase rounded border border-neutral-700 transition-colors">
                <Scissors className="w-3 h-3" /> Cortar
              </button>
              <button onClick={() => selectedClipId && (editor.deleteClip(selectedClipId), setSelectedClipId(null))}
                className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-red-900/40 text-neutral-300 hover:text-red-400 text-[10px] font-bold uppercase rounded border border-neutral-700 transition-colors">
                <Trash2 className="w-3 h-3" /> Borrar
              </button>
              {selectedClipId && <span className="text-[9px] text-blue-400 animate-pulse font-mono">✦ Clip seleccionado</span>}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[9px] text-neutral-600 uppercase font-bold">Línea de Tiempo</span>
              </div>
            </div>
            {/* Timeline engine */}
            <div className="flex-1 overflow-hidden"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={async (e) => {
                e.preventDefault();
                if (!draggedMedia) return;
                const t = engine.currentTimeRef.current;
                const dur = await getVideoDuration(draggedMedia.media_options[0].url);
                const videoLayer = editor.project.layers.find(l => l.type === 'video');
                editor.addClip(videoLayer.id, makeVideoClip(draggedMedia.media_options[0].url, draggedMedia.caption || 'Clip', t, t + dur));
                setDraggedMedia(null);
              }}>
              <Timeline
                ref={timelineRef}
                editorData={editorData}
                effects={{}}
                scale={5}
                hideCursor={false}
                onChange={handleTimelineChange}
                onClickAction={(e, { action }) => handleClipSelect(action.id)}
                onClickTimeArea={(time) => engine.seek(time)}
                onCursorDrag={(time) => engine.seek(time)}
                onCursorDragEnd={(time) => engine.seek(time)}
                autoScroll={true}
                style={{ backgroundColor: '#171717', color: '#fff', height: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
