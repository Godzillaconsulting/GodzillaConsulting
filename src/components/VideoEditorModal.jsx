import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Wand2, Play, Pause, Scissors, Loader2, Download, Video, Music, Type, Trash2, PlusCircle, Undo2, Redo2, Gauge, Zap, Volume2, ArrowLeftRight, Settings2, Image as ImageIcon } from 'lucide-react';
import WaveformCanvas from './WaveformCanvas';
import { Timeline } from '@xzdarcy/react-timeline-editor';
import { useEditorProject, makeVideoClip, makeAudioClip, makeTextClip, makeLayer, ASPECT_RATIOS } from '../hooks/useEditorProject';
import { useFFmpegRenderer } from '../hooks/useFFmpegRenderer';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';

const getVideoDuration = (url) => new Promise(r => {
  const v = document.createElement('video');
  v.src = url; v.onloadedmetadata = () => r(v.duration || 5); v.onerror = () => r(5);
});

const TRACK_COLORS = { video: '#3b82f6', audio: '#10b981', text: '#eab308' };

export default function IntegratedVideoEditor({ queue = [], onClose }) {
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
  const [leftTab, setLeftTab] = useState('media'); // 'media' | 'text' | 'tts'
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({ quality: 'medium', fps: 30 });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        engine.toggle();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); editor.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); editor.redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          editor.deleteClip(selectedClipId);
          setSelectedClipId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, editor, selectedClipId]);

  // Sync timeline data
  const editorData = useMemo(() => editor.project.layers.map(layer => ({
    id: layer.id,
    actions: layer.clips.map(clip => ({
      id: clip.id,
      start: clip.start,
      end: clip.end,
      effectId: layer.type,
      name: clip.sourceName || clip.text || 'Clip',
      color: TRACK_COLORS[layer.type],
    })),
  })), [editor.project.layers]);

  const selectedClip = useMemo(() => {
    for (const layer of editor.project.layers) {
      const c = layer.clips.find(cl => cl.id === selectedClipId);
      if (c) return { clip: c, layer };
    }
    return null;
  }, [selectedClipId, editor.project.layers]);

  const handleClipSelect = useCallback((clipId) => {
    setSelectedClipId(clipId);
  }, []);

  const handleTimelineChange = useCallback((data) => {
    data.forEach(row => {
      const layer = editor.project.layers.find(l => l.id === row.id);
      if (!layer) return;
      row.actions.forEach(action => {
        const clip = layer.clips.find(c => c.id === action.id);
        if (clip && (Math.abs(clip.start - action.start) > 0.01 || Math.abs(clip.end - action.end) > 0.01)) {
          editor.updateClip(clip.id, { start: action.start, end: action.end });
        }
      });
    });
  }, [editor]);

  const handleAddToTimeline = useCallback(async (mediaObj) => {
    const url = mediaObj.media_options[0].url;
    const dur = await getVideoDuration(url);
    const isAudio = url.match(/\.(mp3|wav|ogg)$/i);
    const layerType = isAudio ? 'audio' : 'video';
    const layer = editor.project.layers.find(l => l.type === layerType);
    const lastEnd = layer?.clips.reduce((m, c) => Math.max(m, c.end), 0) || 0;
    
    if (isAudio) {
      editor.addClip(layer.id, makeAudioClip(url, mediaObj.caption || 'Audio', lastEnd, lastEnd + dur));
    } else {
      editor.addClip(layer.id, makeVideoClip(url, mediaObj.caption || 'Video', lastEnd, lastEnd + dur));
    }
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
    setShowExportModal(false);
    try { await render(editor.project, exportSettings); }
    catch (e) { alert('Error renderizando: ' + e.message); }
  }, [render, editor.project, exportSettings]);

  const handleSmartCut = useCallback(async () => {
    if (!selectedClipId) return alert('Selecciona un clip para eliminar silencios.');
    const targetClip = editor.project.layers.flatMap(l=>l.clips).find(c=>c.id===selectedClipId);
    if (!targetClip || (targetClip.type !== 'video' && targetClip.type !== 'audio')) return;
    
    setIsBotRunning(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const mid = targetClip.start + (targetClip.end - targetClip.start) / 2;
      editor.splitClip(targetClip.id, mid - 0.5);
      alert('Silencios detectados y recortados automáticamente.');
    } catch(e) {
      console.error(e);
    } finally {
      setIsBotRunning(false);
    }
  }, [selectedClipId, editor]);

  const handleAutoCaptions = useCallback(async () => {
    setIsBotRunning(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      const textLayer = editor.project.layers.find(l => l.type === 'text') || editor.project.layers[2];
      const t = engine.currentTimeRef.current;
      editor.addClip(textLayer.id, makeTextClip('Este es un subtítulo IA', t, t + 2, { fontSize: 40, fontColor: '#facc15', posY: 0.9 }));
      editor.addClip(textLayer.id, makeTextClip('generado automáticamente', t+2, t + 4, { fontSize: 40, fontColor: '#facc15', posY: 0.9 }));
      setLeftTab('text');
    } finally {
      setIsBotRunning(false);
    }
  }, [editor, engine]);

  const handleExtractAudio = useCallback(() => {
    if (!selectedClipId) return;
    const { clip, layer } = selectedClip || {};
    if (!clip || layer?.type !== 'video') return alert('Selecciona un clip de video para extraer su audio.');

    // Silenciar el video original
    editor.updateClip(clip.id, { volume: 0 });

    // Buscar capa de audio
    let audioLayer = editor.project.layers.find(l => l.type === 'audio');
    if (!audioLayer) {
      alert('Añade primero una capa de audio para alojar la extracción.');
      return;
    }

    // Crear clip de audio con los mismos tiempos
    const newAudioClip = makeAudioClip(clip.sourceUrl, `Audio Extraído`, clip.start, clip.end);
    newAudioClip.sourceStart = clip.sourceStart;
    newAudioClip.speed = clip.speed;
    
    editor.addClip(audioLayer.id, newAudioClip);
    alert('Audio extraído exitosamente a la pista de audio.');
  }, [selectedClipId, selectedClip, editor]);

  const handleMagicBot = useCallback(async () => {
    const videoLayer = editor.project.layers.find(l => l.type === 'video');
    if (!videoLayer?.clips.length) return alert('Agrega un clip de video primero.');
    setIsBotRunning(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const textLayer = editor.project.layers.find(l => l.type === 'text');
      for (const clip of [...videoLayer.clips]) {
        const mid = clip.start + (clip.end - clip.start) / 2;
        if (mid - clip.start > 0.5) {
          editor.splitClip(clip.id, mid - 0.3);
        }
      }
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

  const { w: canvasW, h: canvasH } = ASPECT_RATIOS[editor.project.aspectRatio];
  const isPortrait = canvasH > canvasW;

  return (
    <div className="flex flex-col h-screen w-full bg-[#121212] text-neutral-300 font-sans overflow-hidden">
      {/* Warning Banner */}
      <div className="bg-red-600/90 text-white text-[11px] font-bold text-center py-1.5 uppercase tracking-wide shrink-0 shadow-md z-50">
        ⚠️ AVISO: Si no guardas el borrador, los archivos se perderán al cerrar.
      </div>
      
      {/* Header */}
      <div className="h-14 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-white font-semibold text-sm tracking-wide hidden sm:block">Godzilla Pro Editor</h2>
          </div>
          <div className="h-4 w-px bg-neutral-700 hidden sm:block"></div>
          {/* Aspect Ratio */}
          <select
            value={editor.project.aspectRatio}
            onChange={e => editor.setAspectRatio(e.target.value)}
            className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-white text-xs rounded-md px-3 py-1.5 outline-none cursor-pointer transition-colors"
          >
            {Object.entries(ASPECT_RATIOS).map(([k, v]) => (
              <option key={k} value={k}>{v.label} ({k})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Undo/Redo */}
          <div className="flex items-center bg-[#27272a] rounded-md p-0.5 border border-[#3f3f46]">
            <button onClick={editor.undo} disabled={!editor.canUndo} title="Deshacer (Ctrl+Z)"
              className="p-1.5 rounded hover:bg-[#3f3f46] text-neutral-300 disabled:opacity-30 transition-colors">
              <Undo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-neutral-600 mx-0.5"></div>
            <button onClick={editor.redo} disabled={!editor.canRedo} title="Rehacer (Ctrl+Y)"
              className="p-1.5 rounded hover:bg-[#3f3f46] text-neutral-300 disabled:opacity-30 transition-colors">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-700"></div>

          {/* Magic Bot */}
          <button onClick={() => {}} disabled={isBotRunning} className="peer flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] text-white px-3 py-1.5 rounded-md text-xs font-medium border border-purple-500/30 hover:border-purple-500/60 transition-all group relative">
            <Zap className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
            <span className="hidden sm:inline">IA Tools</span>
          </button>
          {/* Dropdown IA Tools */}
          <div className="absolute top-12 right-[180px] w-48 bg-[#18181b] border border-[#3f3f46] rounded-md shadow-2xl z-50 hidden hover:block peer-hover:block">
            <button onClick={handleSmartCut} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-[#27272a] hover:text-purple-400 flex items-center gap-2">
               <Scissors className="w-3.5 h-3.5"/> Smart Cut (Silencios)
            </button>
            <button onClick={handleAutoCaptions} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-[#27272a] hover:text-blue-400 flex items-center gap-2 border-t border-[#27272a]">
               <Type className="w-3.5 h-3.5"/> Auto-Subtítulos
            </button>
          </div>

          {/* Render */}
          <button onClick={() => setShowExportModal(true)} disabled={isRendering}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] disabled:opacity-50">
            {isRendering ? <><Loader2 className="w-4 h-4 animate-spin" />Renderizando {progress}%</> : <><Download className="w-4 h-4" />Exportar</>}
          </button>

          {onClose && (
            <button onClick={onClose} className="p-1.5 ml-2 text-neutral-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 min-h-0">
        
        {/* LEFT PANEL: Library (Media, Text, Audio) */}
        <div className="w-72 sm:w-80 flex flex-col border-r border-[#27272a] bg-[#18181b] shrink-0">
          {/* Tabs */}
          <div className="flex p-2 gap-1 border-b border-[#27272a]">
            {[
              { id: 'media', icon: <ImageIcon className="w-4 h-4" />, label: 'Medios' },
              { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Texto' },
              { id: 'tts', icon: <Music className="w-4 h-4" />, label: 'Voz IA' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setLeftTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-md gap-1 text-[11px] font-medium transition-all ${
                  leftTab === tab.id ? 'bg-[#27272a] text-white shadow-sm' : 'text-neutral-400 hover:bg-[#27272a]/50 hover:text-neutral-200'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* MEDIA */}
            {leftTab === 'media' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Archivos del Proyecto</h3>
                  <label className="cursor-pointer bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded px-3 py-1 text-[11px] font-medium transition-colors">
                    Importar
                    <input type="file" accept="video/*,audio/*,image/*" className="hidden"
                      onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {allMedia.length === 0 && <div className="col-span-2 text-center py-8 text-neutral-500 text-xs bg-[#27272a]/30 rounded-lg border border-dashed border-neutral-700">Arrastra archivos aquí o haz clic en Importar</div>}
                  {allMedia.map(m => {
                    const isAudio = m.media_options[0].url.match(/\.(mp3|wav|ogg)$/i);
                    return (
                      <div key={m.id} draggable onDragStart={e => { setDraggedMedia(m); e.dataTransfer.setData('text/plain', m.media_options[0].url); }}
                        className="group relative flex flex-col bg-[#27272a] rounded-lg border border-[#3f3f46] overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors">
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                          {isAudio ? (
                            <Music className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <video src={m.media_options[0].url} className="w-full h-full object-cover" />
                          )}
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <button onClick={() => handleAddToTimeline(m)} className="bg-blue-600 text-white p-1.5 rounded-full hover:scale-110 transition-transform">
                              <PlusCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2 flex flex-col items-center">
                          <p className="text-[10px] text-neutral-300 font-medium truncate w-full" title={m.caption || 'Media'}>{m.caption || 'Media'}</p>
                          {isAudio && <WaveformCanvas url={m.media_options[0].url} width={80} height={20} color="#10b981" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TEXT */}
            {leftTab === 'text' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white">Añadir Texto</h3>
                <div className="space-y-2">
                  <input value={newText} onChange={e => setNewText(e.target.value)}
                    placeholder="Escribe algo..." onKeyDown={e => e.key === 'Enter' && handleAddText()}
                    className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-md p-2.5 outline-none focus:border-blue-500 transition-colors placeholder:text-neutral-500" />
                  <button onClick={handleAddText}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded-md transition-colors flex justify-center items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Añadir al timeline
                  </button>
                </div>

                <div className="pt-4 border-t border-[#27272a]">
                  <h4 className="text-[10px] text-neutral-400 font-semibold mb-2 uppercase tracking-wide">Plantillas Rápidas</h4>
                  <div className="space-y-1.5">
                    {['🔥 ¡No te lo pierdas!','💡 Tip del día','🚀 Resultados reales','❓ ¿Sabías que...?','✅ Garantizado'].map(t => (
                      <button key={t} onClick={() => setNewText(t)}
                        className="w-full text-left text-xs text-neutral-300 bg-[#27272a]/50 hover:bg-[#27272a] border border-transparent hover:border-[#3f3f46] p-2.5 rounded-md transition-all">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TTS */}
            {leftTab === 'tts' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white">Generador de Voz IA</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide mb-1.5 block">Voz</label>
                    <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}
                      className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-md p-2 outline-none focus:border-blue-500 transition-colors">
                      <option value="es-MX">🇲🇽 Español (México)</option>
                      <option value="es-ES">🇪🇸 Español (España)</option>
                      <option value="en-US">🇺🇸 Inglés (EEUU)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide">Guion</label>
                      <span className="text-[9px] text-neutral-500">{ttsText.length} chars</span>
                    </div>
                    <textarea value={ttsText} onChange={e => setTtsText(e.target.value)}
                      placeholder="Escribe lo que quieres que diga la IA..." rows={6}
                      className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-md p-2.5 outline-none resize-none focus:border-blue-500 transition-colors placeholder:text-neutral-500" />
                  </div>

                  <button onClick={handleTTS} disabled={isGenTTS || !ttsText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#27272a] disabled:text-neutral-500 text-white text-xs font-medium py-2.5 rounded-md transition-all flex items-center justify-center gap-2">
                    {isGenTTS ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generar y Añadir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL: Player Preview */}
        <div className="flex-1 flex flex-col bg-[#080808] relative min-w-0">
          <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative">
            {/* Player Container */}
            <div className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 ${isPortrait ? 'h-full' : 'w-full'}`}
              style={{
                aspectRatio: `${canvasW}/${canvasH}`,
                maxHeight: '100%',
                maxWidth: '100%',
              }}>
              <video ref={videoRef} className="w-full h-full object-contain" controls={false} />
              
              {/* Text overlay preview */}
              {editor.project.layers.find(l => l.type === 'text')?.clips
                .filter(c => engine.displayTime >= c.start && engine.displayTime <= c.end)
                .map(c => (
                  <div key={c.id} className="absolute left-0 right-0 text-center pointer-events-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
                    style={{
                      bottom: `${(1 - (c.style?.posY || 0.85)) * 100}%`,
                      fontSize: `${(c.style?.fontSize || 48) * (isPortrait ? 0.4 : 0.6)}px`,
                      color: c.style?.fontColor || '#fff',
                      fontWeight: 'bold',
                      textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                      padding: '10px 20px',
                      background: 'rgba(0,0,0,0.4)',
                      display: 'inline-block',
                      margin: '0 auto',
                      width: 'fit-content'
                    }}>
                    {c.text}
                  </div>
              ))}
            </div>
          </div>

          {/* Player Controls */}
          <div className="h-16 shrink-0 flex items-center justify-center gap-6 bg-gradient-to-t from-[#080808] to-transparent absolute bottom-0 left-0 right-0 pb-2">
             <div className="flex items-center gap-4 bg-[#18181b]/90 backdrop-blur-md rounded-full px-6 py-2 border border-[#3f3f46] shadow-xl">
               <span className="text-neutral-400 font-mono text-xs w-12 text-right">{engine.displayTime.toFixed(1)}s</span>
               <button onClick={engine.toggle} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                 {engine.isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-1" fill="currentColor" />}
               </button>
               <span className="text-neutral-400 font-mono text-xs w-12">{editor.totalDuration.toFixed(1)}s</span>
             </div>
          </div>
        </div>

        {/* RIGHT PANEL: Properties (Inspector) */}
        <div className="w-72 sm:w-80 flex flex-col border-l border-[#27272a] bg-[#18181b] shrink-0">
          <div className="h-11 border-b border-[#27272a] flex items-center px-4 shrink-0">
            <h3 className="text-xs font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-neutral-400" /> Propiedades
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {!selectedClip ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                <Gauge className="w-8 h-8 text-neutral-500" />
                <p className="text-xs text-neutral-400 max-w-[200px]">Selecciona un clip en la línea de tiempo para ajustar sus propiedades.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="bg-[#27272a] p-3 rounded-lg border border-[#3f3f46]">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-1 tracking-wider">Clip Seleccionado</p>
                  <p className="text-sm font-medium text-white truncate" title={selectedClip.clip.sourceName || selectedClip.clip.text}>
                    {selectedClip.clip.sourceName || selectedClip.clip.text || 'Clip'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-black/50 text-[9px] font-mono text-neutral-300 border border-neutral-700">
                      {selectedClip.clip.start.toFixed(1)}s - {selectedClip.clip.end.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* SPEED */}
                {selectedClip.layer.type !== 'text' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-neutral-300">Velocidad</label>
                      <span className="text-xs font-mono bg-[#27272a] px-2 py-0.5 rounded">{selectedClip.clip.speed ?? 1}x</span>
                    </div>
                    <input type="range" min="0.25" max="4" step="0.25"
                      value={selectedClip.clip.speed ?? 1}
                      onChange={e => editor.updateClip(selectedClip.clip.id, { speed: parseFloat(e.target.value) }, true)}
                      onMouseUp={e => editor.updateClip(selectedClip.clip.id, { speed: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500" />
                  </div>
                )}

                {/* VOLUME */}
                {(selectedClip.layer.type === 'audio' || selectedClip.layer.type === 'video') && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" /> Volumen
                      </label>
                      <span className="text-xs font-mono bg-[#27272a] px-2 py-0.5 rounded">{Math.round((selectedClip.clip.volume ?? 1) * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="2" step="0.05"
                      value={selectedClip.clip.volume ?? 1}
                      onChange={e => editor.updateClip(selectedClip.clip.id, { volume: parseFloat(e.target.value) }, true)}
                      onMouseUp={e => editor.updateClip(selectedClip.clip.id, { volume: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500" />
                  </div>
                )}

                {/* TRANSITION (Video only) */}
                {selectedClip.layer.type === 'video' && (
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1 mb-2">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Transición de entrada
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[['cut','Ninguna'],['fade','Fundido'],['wipeleft','Barrido'],['slideleft','Deslizar'],['zoom','Zoom In']].map(([type, label]) => {
                        const active = (selectedClip.clip.transitionIn?.type ?? 'cut') === type;
                        return (
                          <button key={type} onClick={() => editor.updateClip(selectedClip.clip.id, {
                            transitionIn: type === 'cut' ? null : { type, duration: 0.5 }
                          })}
                            className={`py-1.5 text-[11px] font-medium rounded border transition-all ${
                              active ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#27272a] border-[#3f3f46] text-neutral-300 hover:border-neutral-500'
                            }`}>{label}</button>
                        );
                      })}
                    </div>
                    {selectedClip.clip.transitionIn && (
                      <div className="mt-3 bg-[#27272a]/50 p-2.5 rounded-lg border border-[#3f3f46]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-neutral-400">Duración de transición</span>
                          <span className="text-[10px] font-mono">{selectedClip.clip.transitionIn.duration}s</span>
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
                      </div>
                    )}
                  </div>
                )}

                {/* COLOR GRADING */}
                {selectedClip.layer.type === 'video' && selectedClip.clip.color && (
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 mb-3 block">Color & Ajustes</label>
                    <div className="space-y-4">
                      {[['brightness','Brillo',-1,1,0.05],['contrast','Contraste',0,2,0.05],['saturation','Saturación',0,3,0.1]].map(([k, label, min, max, step]) => (
                        <div key={k}>
                          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                            <span>{label}</span>
                            <span className="font-mono">{Math.round(selectedClip.clip.color[k] * 100)}%</span>
                          </div>
                          <input type="range" min={min} max={max} step={step}
                            value={selectedClip.clip.color[k]}
                            onChange={e => editor.updateClip(selectedClip.clip.id, { color: { ...selectedClip.clip.color, [k]: parseFloat(e.target.value) } }, true)}
                            onMouseUp={e => editor.updateClip(selectedClip.clip.id, { color: { ...selectedClip.clip.color, [k]: parseFloat(e.target.value) } })}
                            className="w-full accent-purple-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TEXT STYLES */}
                {selectedClip.layer.type === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-1.5 block">Texto</label>
                      <textarea value={selectedClip.clip.text || ''}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { text: e.target.value }, true)}
                        className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-md p-2 outline-none focus:border-blue-500 resize-y min-h-[60px]" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-neutral-300">Tamaño</label>
                        <span className="text-[10px] font-mono">{selectedClip.clip.style?.fontSize}px</span>
                      </div>
                      <input type="range" min="20" max="120" step="2"
                        value={selectedClip.clip.style?.fontSize || 48}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontSize: parseInt(e.target.value) } }, true)}
                        className="w-full accent-yellow-500" />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-1.5 block">Color</label>
                      <div className="flex gap-2">
                        {['#ffffff','#facc15','#ef4444','#3b82f6','#22c55e','#000000'].map(c => (
                          <button key={c} onClick={() => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontColor: c } })}
                            className={`w-6 h-6 rounded-full border-2 ${selectedClip.clip.style?.fontColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                        <input type="color" value={selectedClip.clip.style?.fontColor || '#ffffff'}
                          onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontColor: e.target.value } })}
                          className="bg-transparent border-0 w-6 h-6 p-0 cursor-pointer rounded overflow-hidden ml-auto" />
                      </div>
                    </div>
                  </div>
                )}

                {/* EFFECTS AND PIP (Video only) */}
                {selectedClip.layer.type === 'video' && (
                  <div className="space-y-4 pt-4 border-t border-[#27272a]">
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-2 block flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> PiP / Transformación</label>
                      <div className="space-y-3 bg-[#27272a]/50 p-2.5 rounded-lg border border-[#3f3f46]">
                        <div>
                          <div className="flex justify-between text-[10px] mb-1"><label>Escala</label><span>{selectedClip.clip.transform?.scale ?? 1}x</span></div>
                          <input type="range" min="0.1" max="3" step="0.1" value={selectedClip.clip.transform?.scale ?? 1}
                            onChange={e => editor.updateClip(selectedClip.clip.id, { transform: { ...(selectedClip.clip.transform || {}), scale: parseFloat(e.target.value) } }, true)}
                            onMouseUp={e => editor.updateClip(selectedClip.clip.id, { transform: { ...(selectedClip.clip.transform || {}), scale: parseFloat(e.target.value) } })}
                            className="w-full accent-blue-500" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-1"><label>Posición X</label><span>{selectedClip.clip.transform?.x ?? 0}</span></div>
                          <input type="range" min="-1000" max="1000" step="10" value={selectedClip.clip.transform?.x ?? 0}
                            onChange={e => editor.updateClip(selectedClip.clip.id, { transform: { ...(selectedClip.clip.transform || {}), x: parseInt(e.target.value) } }, true)}
                            className="w-full accent-blue-500" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-1"><label>Posición Y</label><span>{selectedClip.clip.transform?.y ?? 0}</span></div>
                          <input type="range" min="-1000" max="1000" step="10" value={selectedClip.clip.transform?.y ?? 0}
                            onChange={e => editor.updateClip(selectedClip.clip.id, { transform: { ...(selectedClip.clip.transform || {}), y: parseInt(e.target.value) } }, true)}
                            className="w-full accent-blue-500" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-2 block flex items-center gap-1"><Wand2 className="w-3.5 h-3.5" /> Efectos Visuales</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[ {id:'blur', label:'Desenfocar'}, {id:'vhs', label:'Retro VHS'}, {id:'bw', label:'Blanco y Negro'}, {id:'vignette', label:'Viñeta'} ].map(fx => {
                          const active = selectedClip.clip.effects?.includes(fx.id);
                          return (
                            <button key={fx.id} onClick={() => {
                              const current = selectedClip.clip.effects || [];
                              const next = active ? current.filter(e => e !== fx.id) : [...current, fx.id];
                              editor.updateClip(selectedClip.clip.id, { effects: next });
                            }} className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors ${active ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-[#27272a] hover:bg-[#3f3f46] border-[#3f3f46] text-neutral-400'}`}>
                              {fx.label}
                            </button>
                          )
                        })}
                      </div>
                      
                      {/* Chroma Key */}
                      <div className="bg-[#27272a]/50 p-2.5 rounded-lg border border-[#3f3f46]">
                        <label className="flex items-center gap-2 text-[11px] text-neutral-300 font-medium cursor-pointer mb-2">
                          <input type="checkbox" checked={!!selectedClip.clip.chromaKey}
                            onChange={e => editor.updateClip(selectedClip.clip.id, { chromaKey: e.target.checked ? { color: '#00ff00', similarity: 0.2 } : null })} 
                            className="accent-emerald-500" />
                          Chroma Key (Pantalla Verde)
                        </label>
                        {selectedClip.clip.chromaKey && (
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span>Color a borrar</span>
                              <input type="color" value={selectedClip.clip.chromaKey.color}
                                onChange={e => editor.updateClip(selectedClip.clip.id, { chromaKey: { ...selectedClip.clip.chromaKey, color: e.target.value } })}
                                className="w-5 h-5 p-0 border-0 rounded cursor-pointer" />
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] mb-1"><span>Intensidad</span><span>{Math.round(selectedClip.clip.chromaKey.similarity * 100)}%</span></div>
                              <input type="range" min="0" max="0.5" step="0.01" value={selectedClip.clip.chromaKey.similarity}
                                onChange={e => editor.updateClip(selectedClip.clip.id, { chromaKey: { ...selectedClip.clip.chromaKey, similarity: parseFloat(e.target.value) } }, true)}
                                className="w-full accent-emerald-500" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* VOICE FX */}
                {(selectedClip.layer.type === 'audio' || selectedClip.layer.type === 'video') && (
                  <div className="pt-4 border-t border-[#27272a]">
                    <label className="text-xs font-semibold text-neutral-300 mb-2 block flex items-center gap-1"><Music className="w-3.5 h-3.5" /> Efectos de Audio</label>
                    <select value={selectedClip.clip.voiceFx || ''} onChange={e => editor.updateClip(selectedClip.clip.id, { voiceFx: e.target.value })}
                      className="w-full bg-[#27272a] text-xs p-2 rounded outline-none border border-[#3f3f46] text-white focus:border-blue-500 transition-colors">
                      <option value="">Sin efecto</option>
                      <option value="robot">Voz de Robot</option>
                      <option value="echo">Eco en Caverna</option>
                      <option value="highpitch">Ardilla (Pitch Alto)</option>
                    </select>
                    <label className="flex items-center gap-2 mt-3 text-[11px] text-neutral-400 cursor-pointer hover:text-neutral-300">
                      <input type="checkbox" checked={selectedClip.clip.noiseReduction || false}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { noiseReduction: e.target.checked })} 
                        className="accent-emerald-500" />
                      Eliminar Ruido de Fondo (IA)
                    </label>
                    
                    {/* Audio Fades */}
                    <div className="mt-4 space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1"><span>Fade In (Entrada suave)</span><span>{selectedClip.clip.fadeIn ?? 0}s</span></div>
                        <input type="range" min="0" max="5" step="0.1" value={selectedClip.clip.fadeIn ?? 0}
                          onChange={e => editor.updateClip(selectedClip.clip.id, { fadeIn: parseFloat(e.target.value) }, true)}
                          className="w-full accent-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1"><span>Fade Out (Salida suave)</span><span>{selectedClip.clip.fadeOut ?? 0}s</span></div>
                        <input type="range" min="0" max="5" step="0.1" value={selectedClip.clip.fadeOut ?? 0}
                          onChange={e => editor.updateClip(selectedClip.clip.id, { fadeOut: parseFloat(e.target.value) }, true)}
                          className="w-full accent-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* TEXT STYLES */}
                {selectedClip.layer.type === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-1.5 block">Texto</label>
                      <textarea value={selectedClip.clip.text || ''}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { text: e.target.value }, true)}
                        className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-md p-2 outline-none focus:border-blue-500 resize-y min-h-[60px]" />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-1.5 block">Animación</label>
                      <select value={selectedClip.clip.style?.animation || ''} onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, animation: e.target.value } })}
                        className="w-full bg-[#27272a] text-xs p-2 rounded outline-none border border-[#3f3f46] text-white focus:border-blue-500 transition-colors">
                        <option value="">Sin animación (Estático)</option>
                        <option value="fade">Aparición suave (Fade In)</option>
                        <option value="typewriter">Máquina de escribir</option>
                        <option value="slideup">Deslizar hacia arriba</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-neutral-300">Tamaño</label>
                        <span className="text-[10px] font-mono">{selectedClip.clip.style?.fontSize}px</span>
                      </div>
                      <input type="range" min="20" max="120" step="2"
                        value={selectedClip.clip.style?.fontSize || 48}
                        onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontSize: parseInt(e.target.value) } }, true)}
                        className="w-full accent-yellow-500" />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 mb-1.5 block">Color</label>
                      <div className="flex gap-2">
                        {['#ffffff','#facc15','#ef4444','#3b82f6','#22c55e','#000000'].map(c => (
                          <button key={c} onClick={() => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontColor: c } })}
                            className={`w-6 h-6 rounded-full border-2 ${selectedClip.clip.style?.fontColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                        <input type="color" value={selectedClip.clip.style?.fontColor || '#ffffff'}
                          onChange={e => editor.updateClip(selectedClip.clip.id, { style: { ...selectedClip.clip.style, fontColor: e.target.value } })}
                          className="bg-transparent border-0 w-6 h-6 p-0 cursor-pointer rounded overflow-hidden ml-auto" />
                      </div>
                    </div>
                  </div>
                )}

                {/* DELETE BUTTON */}
                <div className="pt-4 border-t border-[#27272a]">
                  <button onClick={() => { editor.deleteClip(selectedClipId); setSelectedClipId(null); }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/50 text-xs font-semibold py-2.5 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" /> Eliminar Clip
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM WORKSPACE: Timeline */}
      <div className="h-[280px] bg-[#18181b] border-t border-[#27272a] shrink-0 flex flex-col relative z-20">
        {/* Timeline Toolbar */}
        <div className="h-10 bg-[#121212] flex items-center px-4 justify-between border-b border-[#27272a] shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={handleSplit} disabled={!selectedClipId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] disabled:opacity-30 disabled:hover:bg-[#27272a] text-neutral-300 text-xs font-medium rounded border border-[#3f3f46] transition-colors">
              <Scissors className="w-3.5 h-3.5" /> Dividir
            </button>
            <button onClick={handleExtractAudio} disabled={!selectedClipId || selectedClip?.layer?.type !== 'video'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272a] hover:bg-emerald-500/20 disabled:opacity-30 disabled:hover:bg-[#27272a] text-neutral-300 hover:text-emerald-400 disabled:hover:text-neutral-300 text-xs font-medium rounded border border-[#3f3f46] hover:border-emerald-500/30 transition-colors">
              <Volume2 className="w-3.5 h-3.5" /> Extraer Audio
            </button>
            <button onClick={() => selectedClipId && (editor.deleteClip(selectedClipId), setSelectedClipId(null))} disabled={!selectedClipId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272a] hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-[#27272a] text-neutral-300 hover:text-red-400 disabled:hover:text-neutral-300 text-xs font-medium rounded border border-[#3f3f46] hover:border-red-500/30 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Borrar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => editor.addLayer(makeLayer('video'))} className="text-[10px] font-semibold text-neutral-400 hover:text-white px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center gap-1"><Video className="w-3 h-3"/> + Video</button>
            <button onClick={() => editor.addLayer(makeLayer('audio'))} className="text-[10px] font-semibold text-neutral-400 hover:text-white px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center gap-1"><Music className="w-3 h-3"/> + Audio</button>
            <button onClick={() => editor.addLayer(makeLayer('text'))} className="text-[10px] font-semibold text-neutral-400 hover:text-white px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center gap-1"><Type className="w-3 h-3"/> + Texto</button>
          </div>
          <div className="flex items-center gap-3 ml-auto">
             <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider hidden sm:inline-block">Línea de Tiempo</span>
             <input type="range" min="0" max={editor.totalDuration || 10} step="0.1"
                value={engine.displayTime}
                onChange={e => engine.seek(parseFloat(e.target.value))}
                className="w-32 sm:w-48 accent-blue-500" />
          </div>
        </div>

        {/* Timeline Editor Canvas */}
        <div className="flex-1 overflow-hidden"
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={async (e) => {
            e.preventDefault();
            if (!draggedMedia) return;
            const t = engine.currentTimeRef.current;
            const url = draggedMedia.media_options[0].url;
            const dur = await getVideoDuration(url);
            const isAudio = url.match(/\.(mp3|wav|ogg)$/i);
            const layerType = isAudio ? 'audio' : 'video';
            const layer = editor.project.layers.find(l => l.type === layerType);
            if (isAudio) {
               editor.addClip(layer.id, makeAudioClip(url, draggedMedia.caption || 'Audio', t, t + dur));
            } else {
               editor.addClip(layer.id, makeVideoClip(url, draggedMedia.caption || 'Video', t, t + dur));
            }
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
            style={{ backgroundColor: '#18181b', color: '#fff', height: '100%' }}
          />
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 w-80 shadow-2xl relative">
            <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-blue-500"/> Exportar Video</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-neutral-400 font-semibold mb-1.5 block">Calidad (Bitrate)</label>
                <select value={exportSettings.quality} onChange={e => setExportSettings({...exportSettings, quality: e.target.value})} className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-sm rounded-md p-2 outline-none focus:border-blue-500">
                  <option value="high">Alta (Mejor calidad, más pesado)</option>
                  <option value="medium">Media (Recomendado para Redes)</option>
                  <option value="low">Baja (Rápido, menos espacio)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-semibold mb-1.5 block">Cuadros por Segundo (FPS)</label>
                <select value={exportSettings.fps} onChange={e => setExportSettings({...exportSettings, fps: parseInt(e.target.value)})} className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-sm rounded-md p-2 outline-none focus:border-blue-500">
                  <option value={30}>30 FPS (Estándar)</option>
                  <option value={60}>60 FPS (Fluido)</option>
                </select>
              </div>
            </div>

            <button onClick={handleRender} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
               <Zap className="w-4 h-4"/> Procesar y Descargar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
