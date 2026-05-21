import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, Play, Pause, Scissors, Loader2, Download, Video, Music, Type, Trash2, PlusCircle, Undo2, Redo2, Gauge, Zap, Volume2, ArrowLeftRight, Settings2, Image as ImageIcon, Search } from 'lucide-react';
import FloatingToolbar from './FloatingToolbar';
import WaveformCanvas from './WaveformCanvas';
import { Timeline } from '@xzdarcy/react-timeline-editor';
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css';
import { useEditorProject, makeVideoClip, makeAudioClip, makeTextClip, makeLayer, ASPECT_RATIOS } from '../hooks/useEditorProject';
import { useFFmpegRenderer } from '../hooks/useFFmpegRenderer';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';

const getVideoDuration = (url) => new Promise(r => {
  const v = document.createElement('video');
  v.src = url; v.onloadedmetadata = () => r(v.duration || 5); v.onerror = () => r(5);
});

const TRACK_COLORS = { video: '#3b82f6', audio: '#10b981', text: '#eab308' };

const STOCK_VIDEOS = [
  { id: 'v1', type: 'video', url: 'https://cdn.coverr.co/videos/coverr-a-person-typing-on-a-laptop-5291/1080p.mp4', caption: 'Tecnología / Hacker', tags: ['tech', 'laptop', 'trabajo', 'oficina'] },
  { id: 'v2', type: 'video', url: 'https://cdn.coverr.co/videos/coverr-person-counting-dollar-bills-1080p.mp4', caption: 'Dinero / Billetes', tags: ['dinero', 'cash', 'finanzas', 'negocios'] },
  { id: 'v3', type: 'video', url: 'https://cdn.coverr.co/videos/coverr-walking-in-a-crowded-city-1080p.mp4', caption: 'Ciudad / Gente', tags: ['ciudad', 'urbano', 'caminar', 'gente'] },
  { id: 'v4', type: 'video', url: 'https://cdn.coverr.co/videos/coverr-man-working-out-at-the-gym-1080p.mp4', caption: 'Gym / Fitness', tags: ['gym', 'fitness', 'ejercicio', 'deporte'] },
  { id: 'v5', type: 'video', url: 'https://cdn.coverr.co/videos/coverr-crypto-trading-1080p.mp4', caption: 'Trading / Crypto', tags: ['trading', 'crypto', 'bitcoin', 'graficas'] }
];

const MOTION_GRAPHICS_LIBRARY = [
  { id: 'mg1', type: 'video', url: 'https://cdn.pixabay.com/video/2020/05/26/40134-424722510_large.mp4', caption: 'Suscríbete (Chroma Verde)', chromaKey: { color: '#00ff00', similarity: 0.3, blend: 0.1 } },
  { id: 'mg2', type: 'video', url: 'https://cdn.pixabay.com/video/2021/08/04/83893-585149301_large.mp4', caption: 'Like & Bell (Chroma Verde)', chromaKey: { color: '#00ff00', similarity: 0.3, blend: 0.1 } },
  { id: 'mg3', type: 'video', url: 'https://raw.githubusercontent.com/misterhat/transparent-video-demo/master/demo.webm', caption: 'Loading (WebM Transparente)', chromaKey: null },
  { id: 'mg4', type: 'video', url: 'https://cdn.pixabay.com/video/2023/10/22/186008-877209765_large.mp4', caption: 'Explosión (Chroma Negro)', chromaKey: { color: '#000000', similarity: 0.15, blend: 0.1 } }
];

const SFX_LIBRARY = [
  { id: 's1', type: 'audio', url: 'https://actions.google.com/sounds/v1/foley/whoosh.ogg', caption: '💨 Whoosh Rápido', icon: '💨' },
  { id: 's2', type: 'audio', url: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg', caption: '🫧 Pop Text', icon: '🫧' },
  { id: 's3', type: 'audio', url: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg', caption: '🛎️ Ding Idea', icon: '🛎️' },
  { id: 's4', type: 'audio', url: 'https://actions.google.com/sounds/v1/office/cash_register.ogg', caption: '💵 Caja Registradora', icon: '💵' },
  { id: 's5', type: 'audio', url: 'https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_takeoff.ogg', caption: '📈 Tensión Riser', icon: '📈' },
];

const getBackendUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://bot.godzillaconsulting.ai';
};

const API_URL = getBackendUrl();

export const resolveMedia = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
            try {
                const urlObj = new URL(url);
                return `${API_URL}${urlObj.pathname}${urlObj.search}`;
            } catch(e) { /* ignore */ }
        }
        return url;
    }
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function IntegratedVideoEditor({ queue = [], onClose }) {
  const [initialVideoUrl, setInitialVideoUrl] = useState(() => {
    if (queue && queue.length > 0) {
      const task = queue[0];
      if (task && task.media_options) {
        return JSON.stringify(task.media_options);
      }
    }
    try { return localStorage.getItem('godzilla_editor_draft_src') || ''; } catch { return ''; }
  });

  const editor = useEditorProject(initialVideoUrl);
  const { render, isRendering, progress } = useFFmpegRenderer();
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const engine = usePlaybackEngine(editor.project, videoRef);

  const [selectedClipId, setSelectedClipId] = useState(null);
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('edge:es-MX-JorgeNeural');
  const [ttsReferenceAudio, setTtsReferenceAudio] = useState('');
  const [isGenTTS, setIsGenTTS] = useState(false);
  const [localUploads, setLocalUploads] = useState([]);
  const [newText, setNewText] = useState('');
  const [draggedMedia, setDraggedMedia] = useState(null);
  const [leftTab, setLeftTab] = useState('media'); // 'media' | 'text' | 'tts'
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({ quality: 'medium', fps: 30 });
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(0);
  const [stockQuery, setStockQuery] = useState('');
  const [captionLanguage, setCaptionLanguage] = useState('spanish');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [iaScope, setIaScope] = useState('clip');
  const [captionStyle, setCaptionStyle] = useState('hormozi');

  const CAPTION_STYLES = {
    hormozi: { fontSize: 52, fontColor: '#ffffff', posY: 0.80, bold: true, align: 'center', karaoke: true },
    classic: { fontSize: 40, fontColor: '#ffffff', posY: 0.90, bold: false, align: 'center', karaoke: false },
    yellowBox: { fontSize: 44, fontColor: '#000000', bgColor: '#facc15', posY: 0.80, bold: true, align: 'center', karaoke: false }
  };
  
  const filteredStock = useMemo(() => {
    if (!stockQuery) return STOCK_VIDEOS;
    const q = stockQuery.toLowerCase();
    return STOCK_VIDEOS.filter(v => v.caption.toLowerCase().includes(q) || v.tags.some(t => t.toLowerCase().includes(q)));
  }, [stockQuery]);

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

  // Force first frame load on mount
  useEffect(() => {
    engine.seek(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const insertClipWithoutOverlap = useCallback((newClip, type) => {
    const layersOfType = editor.project.layers.filter(l => l.type === type);
    
    // Find a layer where this clip doesn't overlap with any existing clip
    let targetLayer = layersOfType.find(layer => {
      const hasOverlap = layer.clips.some(c => 
        (newClip.start < c.end && newClip.end > c.start)
      );
      return !hasOverlap;
    });

    if (targetLayer) {
      editor.addClip(targetLayer.id, newClip);
    } else {
      // Create a new layer of the same type and insert the clip
      const newLayer = makeLayer(type);
      newLayer.clips.push(newClip);
      editor.addLayer(newLayer);
    }
    setSelectedClipId(newClip.id);
  }, [editor]);

  const handleTimelineChange = useCallback((data) => {
    const SNAP_THRESHOLD = 0.3; // 0.3 segundos de magnetismo

    data.forEach(row => {
      const layer = editor.project.layers.find(l => l.id === row.id);
      if (!layer) return;
      row.actions.forEach(action => {
        const clip = layer.clips.find(c => c.id === action.id);
        if (clip && (Math.abs(clip.start - action.start) > 0.01 || Math.abs(clip.end - action.end) > 0.01)) {
          let newStart = action.start;
          let newEnd = action.end;
          const dur = newEnd - newStart;

          // Magnetismo (Snap)
          const otherClips = layer.clips.filter(c => c.id !== clip.id);
          for (const other of otherClips) {
             if (Math.abs(newStart - other.end) < SNAP_THRESHOLD) {
                 newStart = other.end;
                 newEnd = newStart + dur;
                 break;
             }
             if (Math.abs(newEnd - other.start) < SNAP_THRESHOLD) {
                 newEnd = other.start;
                 newStart = newEnd - dur;
                 break;
             }
          }
          if (newStart < SNAP_THRESHOLD) {
              newStart = 0;
              newEnd = dur;
          }

          editor.updateClip(clip.id, { start: newStart, end: newEnd });
        }
      });
    });
  }, [editor]);

  const handleAddToTimeline = useCallback(async (mediaObj) => {
    const url = mediaObj.media_options?.[0]?.url || mediaObj.url;
    const dur = await getVideoDuration(url);
    const isAudio = mediaObj.type === 'audio' || url.match(/\.(mp3|wav|ogg|m4a|aac)$/i) || (mediaObj.caption && mediaObj.caption.match(/\.(mp3|wav|ogg|m4a|aac)$/i));
    const layerType = isAudio ? 'audio' : 'video';
    
    const t = engine.currentTimeRef.current;

    let newClip;
    if (isAudio) {
      newClip = makeAudioClip(url, mediaObj.caption || 'Audio', t, t + dur);
    } else {
      newClip = makeVideoClip(url, mediaObj.caption || 'Video', t, t + dur);
    }
    
    insertClipWithoutOverlap(newClip, layerType);
  }, [editor, engine, insertClipWithoutOverlap]);

  const handleSplit = useCallback(() => {
    if (!selectedClipId) return;
    const t = engine.currentTimeRef.current;
    editor.splitClip(selectedClipId, t);
    setSelectedClipId(null);
  }, [selectedClipId, editor, engine]);

  const handleAddText = useCallback(() => {
    if (!newText.trim()) return;
    const t = engine.currentTimeRef.current;
    const newClip = makeTextClip(newText.trim(), t, t + 4);
    insertClipWithoutOverlap(newClip, 'text');
    setNewText('');
  }, [newText, editor, engine, insertClipWithoutOverlap]);

  const handleTTS = useCallback(async () => {
    if (!ttsText.trim()) return;
    setIsGenTTS(true);
    try {
      const res = await fetch('/api/studio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({
          text: ttsText,
          voice: ttsVoice,
          referenceAudio: ttsVoice.startsWith('xtts:') ? ttsReferenceAudio : null
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error generando TTS en el backend');
      }
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      
      const t = engine.currentTimeRef.current;
      const dur = ttsText.length * 0.07 + 1; // Approx duration, audio will pause when it ends naturally
      
      const newClip = makeAudioClip(localUrl, `Voz IA: ${ttsText.slice(0, 14)}`, t, t + dur);
      insertClipWithoutOverlap(newClip, 'audio');
      setTtsText('');
    } catch (e) {
      console.error('[TTS Error]', e);
      alert(`⚠️ Error en el servicio de Voz IA:\n\n${e.message}\n\nAsegúrate de que el backend está corriendo y el modelo seleccionado está disponible.`);
    } finally {
      setIsGenTTS(false);
    }
  }, [ttsText, ttsVoice, ttsReferenceAudio, editor, engine, insertClipWithoutOverlap]);

  const handleVoiceRecord = useCallback(async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
      engine.pause();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstart = () => {
        recordingStartTimeRef.current = Date.now();
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const dur = (Date.now() - recordingStartTimeRef.current) / 1000;
        
        const t = engine.currentTimeRef.current;
        const newClip = makeAudioClip(url, `Grabación de Voz`, Math.max(0, t - dur), t);
        insertClipWithoutOverlap(newClip, 'audio');
      };

      recorder.start();
      setIsRecordingVoice(true);
      engine.play(); // Play video while recording
    } catch (err) {
      alert('Error accediendo al micrófono: ' + err.message);
    }
  }, [isRecordingVoice, editor, engine, insertClipWithoutOverlap]);

  const handleRender = useCallback(async () => {
    setShowExportModal(false);
    try { await render(editor.project, exportSettings); }
    catch (e) { alert('Error renderizando: ' + e.message); }
  }, [render, editor.project, exportSettings]);

  const handleSmartCut = useCallback(async () => {
    let targetClips = [];
    if (iaScope === 'all') {
      const layer = editor.project.layers.find(l => l.type === 'video');
      targetClips = layer ? layer.clips : [];
      if (!targetClips.length) return alert('No hay clips de video en la línea principal para procesar.');
    } else {
      if (!selectedClipId) return alert('Selecciona un clip para eliminar silencios, o usa "Todo el Video".');
      const targetClip = editor.project.layers.flatMap(l => l.clips).find(c => c.id === selectedClipId);
      if (!targetClip || (targetClip.type !== 'video' && targetClip.type !== 'audio')) return alert('Clip no válido para esta acción.');
      targetClips = [targetClip];
    }

    setIsBotRunning(true);
    let totalCortes = 0;
    try {
      for (const targetClip of targetClips) {
        // Ejecutamos la lógica para cada clip

      const response = await fetch(targetClip.sourceUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('mediaFile', blob, 'clip.mp4');

      const apiRes = await fetch('/api/studio/smart-cut', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: formData
      });

      if (!apiRes.ok) throw new Error('Error en el servidor de Smart Cut.');
      const data = await apiRes.json();
      
      const sourceStart = targetClip.sourceStart || 0;
      const clipDuration = targetClip.end - targetClip.start;
      const sourceEnd = sourceStart + clipDuration;

      const keepRegions = [];
      let currentRegionStart = sourceStart;

      (data.silences || []).forEach(s => {
          // Si el silencio está dentro de los límites del clip
          if (s.start > currentRegionStart && s.start < sourceEnd) {
              keepRegions.push({ start: currentRegionStart, end: s.start });
          }
          if (s.end > currentRegionStart) {
              currentRegionStart = s.end;
          }
      });

      if (sourceEnd > currentRegionStart) {
          keepRegions.push({ start: currentRegionStart, end: sourceEnd });
      }

      if (keepRegions.length <= 1) {
        alert('No se detectaron suficientes silencios largos. El clip ya está limpio.');
        return;
      }

      const layer = editor.project.layers.find(l => l.clips.some(c => c.id === targetClip.id));
      let currentTimelineStart = targetClip.start;

      keepRegions.forEach((region, idx) => {
        const duration = region.end - region.start;
        const newClip = targetClip.type === 'video'
          ? makeVideoClip(targetClip.sourceUrl, `${targetClip.sourceName} p${idx + 1}`, currentTimelineStart, currentTimelineStart + duration)
          : makeAudioClip(targetClip.sourceUrl, `${targetClip.sourceName} p${idx + 1}`, currentTimelineStart, currentTimelineStart + duration);

        newClip.sourceStart = region.start;
        newClip.speed = targetClip.speed || 1;
        newClip.volume = targetClip.volume !== undefined ? targetClip.volume : 1;

        editor.addClip(layer.id, newClip);
        currentTimelineStart += duration;
      });

      editor.deleteClip(targetClip.id);
      totalCortes += (keepRegions.length - 1);
      } // Fin for

      setSelectedClipId(null);
      alert(`¡Corte Mágico completado! Se eliminaron ${totalCortes} silencios en total.`);
    } catch (e) {
      console.error(e);
      alert('Error procesando el audio para cortes inteligentes.');
    } finally {
      setIsBotRunning(false);
    }
  }, [selectedClipId, editor]);

  const handleAutoCaptions = useCallback(async () => {
    let targetClips = [];
    if (iaScope === 'all') {
      const layer = editor.project.layers.find(l => l.type === 'video' || l.type === 'audio');
      targetClips = layer ? layer.clips : [];
      if (!targetClips.length) return alert('No hay clips para procesar.');
    } else {
      if (!selectedClipId) return alert('Selecciona un clip de video/audio para autogenerar subtítulos.');
      const targetClip = editor.project.layers.flatMap(l => l.clips).find(c => c.id === selectedClipId);
      if (!targetClip || (targetClip.type !== 'video' && targetClip.type !== 'audio')) return alert('Clip no válido.');
      targetClips = [targetClip];
    }

    setIsBotRunning(true);
    try {
      for (const targetClip of targetClips) {
        const response = await fetch(targetClip.sourceUrl);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('mediaFile', blob, 'clip.mp4');

        const apiRes = await fetch('/api/studio/auto-captions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
          body: formData
        });

        if (!apiRes.ok) throw new Error('Error en el backend de Auto-Captions');
        const data = await apiRes.json();
        
        const result = { chunks: data.captions || [] };

      const textLayer = editor.project.layers.find(l => l.type === 'text');
      if (!textLayer) return alert('No se encontró la capa de texto.');

      let currentTimelineStart = targetClip.start;
      const sourceOffset = targetClip.sourceStart || 0;
      const sourceEnd = sourceOffset + (targetClip.end - targetClip.start);

      const validChunks = result.chunks ? result.chunks.filter(c => {
         if (!c.timestamp || c.timestamp[0] === null || c.timestamp[1] === null) return false;
         return c.timestamp[0] >= sourceOffset && c.timestamp[0] < sourceEnd;
      }) : [];

      if (validChunks.length === 0) {
        return alert('No se detectó voz clara en el segmento seleccionado del clip.');
      }

      let currentSentence = [];
      let currentSentenceText = '';

      const flushSentence = () => {
        if (currentSentence.length === 0) return;
        const start = currentSentence[0].timestamp[0];
        const end = currentSentence[currentSentence.length - 1].timestamp[1];
        if (start === null || end === null) { currentSentence = []; return; }

        const relativeStart = start - sourceOffset;
        const relativeEnd = Math.min(end, sourceEnd) - sourceOffset;

        const clipStart = currentTimelineStart + relativeStart;
        const clipEnd = currentTimelineStart + relativeEnd;

        const wordsArr = currentSentence.map(w => ({
          text: w.text.trim().toUpperCase(),
          start: currentTimelineStart + (w.timestamp[0] - sourceOffset),
          end: currentTimelineStart + (Math.min(w.timestamp[1], sourceEnd) - sourceOffset)
        }));

        const selectedStyle = CAPTION_STYLES[captionStyle];

        editor.addClip(textLayer.id, makeTextClip(currentSentenceText.trim().toUpperCase(), clipStart, clipEnd, {
          fontSize: selectedStyle.fontSize,
          fontColor: selectedStyle.fontColor,
          bgColor: selectedStyle.bgColor || 'rgba(0,0,0,0.5)',
          posY: selectedStyle.posY,
          bold: selectedStyle.bold,
          align: selectedStyle.align,
          words: wordsArr,
          karaoke: selectedStyle.karaoke
        }));

        currentSentence = [];
        currentSentenceText = '';
      };

      validChunks.forEach(chunk => {
        currentSentence.push(chunk);
        currentSentenceText += chunk.text + ' ';
        if (chunk.text.match(/[.!?]$/) || currentSentence.length >= 5) flushSentence();
      });
      flushSentence();
      } // Fin for

      setLeftTab('text');
      alert('¡Subtítulos con efecto Karaoke generados exitosamente!');

    } catch (e) {
      console.error(e);
      alert('Error en Whisper IA: ' + e.message);
    } finally {
      setIsBotRunning(false);
    }
  }, [selectedClipId, editor, engine]);

  const handleHormoziBot = useCallback(async () => {
    if (!selectedClipId) return alert('Selecciona un clip de video para aplicar el Bot Hormozi.');
    const targetClip = editor.project.layers.flatMap(l => l.clips).find(c => c.id === selectedClipId);
    if (!targetClip || targetClip.type !== 'video') return alert('El Bot Hormozi solo funciona en clips de video.');

    setIsBotRunning(true);
    try {
      const response = await fetch(targetClip.sourceUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('mediaFile', blob, 'clip.mp4');
      formData.append('language', captionLanguage);

      const [cutRes, capRes] = await Promise.all([
          fetch('/api/studio/smart-cut', { method: 'POST', body: formData }),
          fetch('/api/studio/auto-captions', { method: 'POST', body: formData })
      ]);

      if (!cutRes.ok || !capRes.ok) throw new Error('Error en los servicios de IA de backend.');
      
      const cutData = await cutRes.json();
      const capData = await capRes.json();

      const keepRegions = cutData.keepRegions || [];
      const result = { chunks: capData.captions || [] };

      if (keepRegions.length === 0) {
          keepRegions.push({ start: targetClip.sourceStart || 0, end: (targetClip.sourceStart || 0) + (targetClip.end - targetClip.start) });
      }

      const layer = editor.project.layers.find(l => l.clips.some(c => c.id === targetClip.id));
      const textLayer = editor.project.layers.find(l => l.type === 'text');
      
      let overlayLayer = editor.project.layers.find(l => l.type === 'video' && l.id !== layer.id);
      if (!overlayLayer) {
          overlayLayer = makeLayer('video');
          editor.addLayer(overlayLayer);
      }
      
      let sfxLayer = editor.project.layers.find(l => l.type === 'audio');
      if (!sfxLayer) {
          sfxLayer = makeLayer('audio');
          editor.addLayer(sfxLayer);
      }

      let currentTimelineStart = targetClip.start;
      let punchIn = false;

      keepRegions.forEach((region, idx) => {
        const duration = region.end - region.start;

        const newClip = makeVideoClip(targetClip.sourceUrl, `${targetClip.sourceName} p${idx + 1}`, currentTimelineStart, currentTimelineStart + duration);
        newClip.sourceStart = region.start;
        newClip.speed = targetClip.speed || 1;
        newClip.volume = targetClip.volume !== undefined ? targetClip.volume : 1;

        if (punchIn) newClip.transform = { scale: 1.15, x: 0, y: 0 };
        punchIn = !punchIn; 

        editor.addClip(layer.id, newClip);

        if (result.chunks) {
          const regionChunks = result.chunks.filter(c => {
             const [start, end] = c.timestamp;
             return start !== null && end !== null && start >= region.start && start < region.end;
          });

          let currentSentence = [];
          let currentSentenceText = '';

          const flushSentence = () => {
            if (currentSentence.length === 0) return;
            const start = currentSentence[0].timestamp[0];
            const end = currentSentence[currentSentence.length - 1].timestamp[1];

            const relativeStart = start - region.start;
            const relativeEnd = Math.min(end, region.end) - region.start;

            const clipStart = currentTimelineStart + relativeStart;
            const clipEnd = currentTimelineStart + relativeEnd;

            const wordsArr = currentSentence.map(w => ({
              text: w.text.trim().toUpperCase(),
              start: currentTimelineStart + (w.timestamp[0] - region.start),
              end: currentTimelineStart + (Math.min(w.timestamp[1], region.end) - region.start)
            }));

            const textUpper = currentSentenceText.toUpperCase();
            if (textUpper.match(/SUSCRIB|CAMPANITA|LIKE/)) {
                const mg = MOTION_GRAPHICS_LIBRARY[1];
                const mgClip = makeVideoClip(mg.url, mg.caption, clipStart, clipStart + 3);
                mgClip.chromaKey = mg.chromaKey;
                mgClip.transform = { scale: 0.5, x: 0, y: -0.3 };
                editor.addClip(overlayLayer.id, mgClip);
                
                const sfx = SFX_LIBRARY[1];
                editor.addClip(sfxLayer.id, makeAudioClip(sfx.url, sfx.caption, clipStart, clipStart + 1));
            } else if (textUpper.match(/DINERO|DÓLAR|VENTA|COMPRA/)) {
                const sfx = SFX_LIBRARY[3];
                editor.addClip(sfxLayer.id, makeAudioClip(sfx.url, sfx.caption, clipStart, clipStart + 1.5));
            } else if (textUpper.match(/ALERTA|CUIDADO|PELIGRO|IMPORTANTE/)) {
                const sfx = SFX_LIBRARY[4];
                editor.addClip(sfxLayer.id, makeAudioClip(sfx.url, sfx.caption, clipStart, clipStart + 2));
            }

            const selectedStyle = CAPTION_STYLES[captionStyle];

            editor.addClip(textLayer.id, makeTextClip(currentSentenceText.trim().toUpperCase(), clipStart, clipEnd, {
              fontSize: selectedStyle.fontSize,
              fontColor: selectedStyle.fontColor,
              bgColor: selectedStyle.bgColor || 'rgba(0,0,0,0.5)',
              posY: selectedStyle.posY,
              bold: selectedStyle.bold,
              align: selectedStyle.align,
              words: wordsArr,
              karaoke: selectedStyle.karaoke
            }));

            currentSentence = [];
            currentSentenceText = '';
          };

          regionChunks.forEach(chunk => {
            currentSentence.push(chunk);
            currentSentenceText += chunk.text + ' ';
            if (chunk.text.match(/[.!?]$/) || currentSentence.length >= 4) flushSentence();
          });
          flushSentence();
        }

        currentTimelineStart += duration;
      });

      editor.deleteClip(targetClip.id);
      setLeftTab('text');
      alert('¡Bot Hormozi completado! Se eliminaron silencios, inyectaron gráficos, y generaron subtítulos.');

    } catch (e) {
      console.error(e);
      alert('Error ejecutando Bot Hormozi: ' + e.message);
    } finally {
      setIsBotRunning(false);
    }
  }, [selectedClipId, editor, engine, captionLanguage, captionStyle]);

  const handleExtractAudio = useCallback(() => {
    if (!selectedClipId) return;
    const { clip, layer } = selectedClip || {};
    if (!clip || layer?.type !== 'video') return alert('Selecciona un clip de video para extraer su audio.');

    // Silenciar el video original
    editor.updateClip(clip.id, { volume: 0 });

    // Crear clip de audio con los mismos tiempos
    const newAudioClip = makeAudioClip(clip.sourceUrl, `Audio Extraído`, clip.start, clip.end);
    newAudioClip.sourceStart = clip.sourceStart;
    newAudioClip.speed = clip.speed;

    insertClipWithoutOverlap(newAudioClip, 'audio');
    alert('Audio extraído exitosamente a la pista de audio.');
  }, [selectedClipId, selectedClip, editor, insertClipWithoutOverlap]);

  const handleUpload = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio/');
    setLocalUploads(prev => [...prev, { id: `local-${Date.now()}`, type: isAudio ? 'audio' : 'video', caption: file.name, media_options: [{ url }] }]);
  }, []);

  const savedVideos = useMemo(() => queue.filter(q =>
    q.media_options?.[0]?.url?.match(/\.(mp4|webm)/i)
  ), [queue]);

  const allMedia = useMemo(() => [...savedVideos, ...localUploads], [savedVideos, localUploads]);

  const { w: canvasW, h: canvasH } = ASPECT_RATIOS[editor.project.aspectRatio];
  const isPortrait = canvasH > canvasW;

  const { seek } = engine;

  const [timelineZoom, setTimelineZoom] = useState(5);

  const timelineEffects = useMemo(() => ({
    video: { id: 'video', name: 'Video' },
    audio: { id: 'audio', name: 'Audio' },
    text: { id: 'text', name: 'Texto' }
  }), []);

  const timelineNode = useMemo(() => (
    <Timeline
      ref={timelineRef}
      editorData={editorData}
      effects={timelineEffects}
      scale={timelineZoom}
      hideCursor={false}
      onChange={handleTimelineChange}
      onClickAction={(e, { action }) => handleClipSelect(action.id)}
      onClickTimeArea={(time) => seek(time)}
      onCursorDrag={(time) => seek(time)}
      onCursorDragEnd={(time) => seek(time)}
      autoScroll={true}
      style={{ backgroundColor: '#18181b', color: '#fff', height: '100%' }}
      getActionRender={(action, row) => {
        const isAudio = row.id.startsWith('layer-a-');
        const isVideo = row.id.startsWith('layer-v-');
        const layer = editor.project.layers.find(l => l.id === row.id);
        const clip = layer?.clips.find(c => c.id === action.id);

        return (
          <div className={`relative w-full h-full rounded flex items-center overflow-hidden px-2 
            ${selectedClipId === action.id ? 'ring-2 ring-white z-10 shadow-lg' : ''}`}
            style={{ backgroundColor: action.color }}>
            <span className="text-[10px] font-bold text-white whitespace-nowrap z-10 drop-shadow-md">
              {action.name}
            </span>
            {isAudio && clip && clip.sourceUrl && (
              <div className="absolute inset-0 opacity-40 pointer-events-none flex items-center justify-center">
                <WaveformCanvas url={resolveMedia(clip.sourceUrl)} width={800} height={32} color="#ffffff" className="w-full h-full object-cover" style={{ width: '100%', height: '100%' }} />
              </div>
            )}
            {isVideo && clip && clip.sourceUrl && (
               <div className="absolute inset-0 opacity-20 pointer-events-none">
                 {clip.isImage ? (
                   <img src={resolveMedia(clip.sourceUrl)} className="w-full h-full object-cover" />
                 ) : (
                   <video src={resolveMedia(clip.sourceUrl)} className="w-full h-full object-cover" />
                 )}
               </div>
            )}
          </div>
        );
      }}
    />
  ), [editorData, timelineEffects, handleTimelineChange, handleClipSelect, seek, selectedClipId, editor.project.layers]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.setTime(engine.displayTime);
    }
  }, [engine.displayTime]);

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
          
          <div className="h-4 w-px bg-neutral-700 hidden sm:block mx-1"></div>
          
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
          <div className="relative">
            <button onClick={() => { }} disabled={isBotRunning} className="peer flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] text-white px-3 py-1.5 rounded-md text-xs font-medium border border-purple-500/30 hover:border-purple-500/60 transition-all group relative">
              <Zap className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
              <span className="hidden sm:inline">IA Tools</span>
            </button>
            {/* Dropdown IA Tools */}
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#18181b] border border-[#3f3f46] rounded-md shadow-2xl z-50 hidden hover:block peer-hover:block">
              <div className="p-3 border-b border-[#27272a] bg-[#121212] rounded-t-md">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide block mb-2">Alcance de IA</label>
                <div className="flex bg-[#27272a] rounded p-1">
                  <button onClick={() => setIaScope('clip')} className={`flex-1 text-[10px] py-1 rounded transition-colors ${iaScope === 'clip' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}>Clip Sel.</button>
                  <button onClick={() => setIaScope('all')} className={`flex-1 text-[10px] py-1 rounded transition-colors ${iaScope === 'all' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'}`}>Todo el Video</button>
                </div>
              </div>
              <button onClick={handleHormoziBot} className="w-full text-left px-4 py-3 text-xs text-white hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 flex items-center gap-2 border-b border-[#27272a] font-bold">
                <Wand2 className="w-4 h-4 text-purple-400" /> Bot Hormozi (Todo en 1)
              </button>
              <button onClick={handleSmartCut} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-[#27272a] hover:text-purple-400 flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5" /> Smart Cut (Silencios)
              </button>
              <button onClick={handleAutoCaptions} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-[#27272a] hover:text-blue-400 flex items-center gap-2 border-t border-[#27272a]">
                <Type className="w-3.5 h-3.5" /> Auto-Subtítulos
              </button>
            </div>
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
          <div className="flex p-2 gap-1 border-b border-[#27272a] overflow-x-auto custom-scrollbar">
            {[
              { id: 'media', icon: <ImageIcon className="w-4 h-4" />, label: 'Medios' },
              { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Texto' },
              { id: 'tts', icon: <Music className="w-4 h-4" />, label: 'Voz IA' },
              { id: 'motion', icon: <Wand2 className="w-4 h-4" />, label: 'Motion' },
              { id: 'stock', icon: <Search className="w-4 h-4" />, label: 'Stock' },
              { id: 'sfx', icon: <Zap className="w-4 h-4" />, label: 'SFX' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setLeftTab(tab.id)}
                className={`flex-1 min-w-[56px] flex flex-col items-center py-2.5 rounded-md gap-1 text-[11px] font-medium transition-all ${leftTab === tab.id ? 'bg-[#27272a] text-white shadow-sm' : 'text-neutral-400 hover:bg-[#27272a]/50 hover:text-neutral-200'
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
                    const isAudio = m.type === 'audio' || m.media_options[0].url.match(/\.(mp3|wav|ogg|m4a|aac)$/i) || (m.caption && m.caption.match(/\.(mp3|wav|ogg|m4a|aac)$/i));
                    return (
                      <div key={m.id} draggable onDragStart={e => { setDraggedMedia(m); e.dataTransfer.setData('text/plain', m.media_options[0].url); }}
                        className="group relative flex flex-col bg-[#27272a] rounded-lg border border-[#3f3f46] overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors">
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                          {isAudio ? (
                            <Music className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <video src={resolveMedia(m.media_options[0].url)} className="w-full h-full object-cover" />
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
                  <h4 className="text-[10px] text-neutral-400 font-semibold mb-2 uppercase tracking-wide">Motion Graphics & Títulos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => {
                      const t = engine.currentTimeRef.current;
                      const clip = makeTextClip('¡SUSCRÍBETE!', t, t + 3, { fontSize: 60, fontColor: '#ffffff', bgColor: '#ef4444', bold: true, animation: 'pop', posY: 0.85, outlineWidth: 0 });
                      insertClipWithoutOverlap(clip, 'text');
                    }} className="text-left text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 p-2 rounded-md transition-all text-center">
                      Botón Suscríbete
                    </button>
                    <button onClick={() => {
                      const t = engine.currentTimeRef.current;
                      const clip = makeTextClip('@TuUsuario', t, t + 4, { fontSize: 40, fontColor: '#ffffff', bgColor: 'rgba(0,0,0,0.6)', bold: true, animation: 'slideup', posY: 0.90, outlineWidth: 0, align: 'left', posX: 0.1 });
                      insertClipWithoutOverlap(clip, 'text');
                    }} className="text-left text-[10px] font-bold text-white bg-neutral-800 hover:bg-neutral-700 p-2 rounded-md transition-all text-center">
                      Lower Third (Redes)
                    </button>
                    <button onClick={() => {
                      const t = engine.currentTimeRef.current;
                      const clip = makeTextClip('NUEVO VIDEO', t, t + 2, { fontSize: 80, fontColor: '#facc15', bgColor: 'transparent', bold: true, animation: 'bounce', posY: 0.5, outlineWidth: 4 });
                      insertClipWithoutOverlap(clip, 'text');
                    }} className="col-span-2 text-left text-[10px] font-bold text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black p-2 rounded-md transition-all text-center uppercase">
                      Título Impacto (Pop)
                    </button>
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
                      <optgroup label="⚡ Piper TTS — Local (Ultarrápido)">
                        <option value="piper:es_MX-ald-medium">🇲🇽 Narrador Neutro (es_MX)</option>
                      </optgroup>
                      <optgroup label="☁️ Edge TTS — Básico (Respaldo)">
                        <option value="edge:es-MX-JorgeNeural">🇲🇽 Jorge MX — Narrador épico</option>
                      </optgroup>
                      <optgroup label="🎭 FakeYou — Celebridades (Gratis)">
                        <option value="fakeyou:adal-ramones">🎤 Adal Ramones (Español)</option>
                        <option value="fakeyou:alucard-latino">🧛 Alucard — Hellsing (Latino)</option>
                        <option value="fakeyou:ballas-gta">🎮 Pandillero Ballas — GTA</option>
                        <option value="fakeyou:spongebob">🧽 Bob Esponja (EN)</option>
                        <option value="fakeyou:andrew-tate">💪 Andrew Tate (EN)</option>
                        <option value="fakeyou:alan-watts">🧘 Alan Watts (EN)</option>
                      </optgroup>
                      <optgroup label="🐕 Bark (HuggingFace) — Muy Expresivas">
                        <option value="bark:v2/es_speaker_0">🇪🇸 Español Speaker 0 (Hombre)</option>
                        <option value="bark:v2/es_speaker_1">🇪🇸 Español Speaker 1 (Mujer)</option>
                        <option value="bark:v2/es_speaker_2">🇪🇸 Español Speaker 2 (Hombre suave)</option>
                        <option value="bark:v2/es_speaker_9">🇪🇸 Español Speaker 9 (Mujer cálida)</option>
                      </optgroup>
                      <optgroup label="🧬 XTTS-v2 (HuggingFace) — Clonación">
                        <option value="xtts:clone">🎙️ Clonar Voz (Sube un audio)</option>
                      </optgroup>
                    </select>
                  </div>

                  {ttsVoice.startsWith('xtts:') && (
                      <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-md">
                          <label className="text-[10px] text-red-400 font-semibold mb-1 block">Sube Audio de Referencia (5-10s)</label>
                          <input 
                              type="file" 
                              accept="audio/*"
                              onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => setTtsReferenceAudio(reader.result);
                                      reader.readAsDataURL(file);
                                  }
                              }}
                              className="w-full text-[10px] text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-red-500/20 file:text-red-300 hover:file:bg-red-500/30"
                          />
                          {ttsReferenceAudio && (
                            <div className="mt-2">
                              <p className="text-[9px] text-green-400 mb-1">✓ Audio listo para clonar</p>
                              <audio src={ttsReferenceAudio} controls className="w-full h-8 outline-none rounded" />
                            </div>
                          )}
                      </div>
                  )}

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

            {/* STOCK */}
            {leftTab === 'stock' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-white">Buscador de B-Roll</h3>
                </div>
                <div className="flex gap-2">
                   <input type="text" placeholder="Pegar URL directa de MP4..." onKeyDown={e => {
                     if (e.key === 'Enter' && e.target.value) {
                       handleAddToTimeline({ media_options: [{ url: e.target.value }], caption: 'Video Web' });
                       e.target.value = '';
                     }
                   }} className="flex-1 bg-[#27272a] border border-[#3f3f46] text-white text-[10px] rounded p-2 outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
                  <input value={stockQuery} onChange={e => setStockQuery(e.target.value)}
                    placeholder="Buscar (ej. dinero, gym)..."
                    className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-xs rounded-md pl-8 pr-2.5 py-2 outline-none focus:border-blue-500 transition-colors placeholder:text-neutral-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filteredStock.length === 0 && <div className="col-span-2 text-center py-4 text-neutral-500 text-[10px]">No hay resultados</div>}
                  {filteredStock.map(m => (
                    <div key={m.id} draggable onDragStart={e => { setDraggedMedia(m); e.dataTransfer.setData('text/plain', m.url); }}
                      className="group relative flex flex-col bg-[#27272a] rounded-lg border border-[#3f3f46] overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors">
                      <div className="aspect-video bg-black flex items-center justify-center relative">
                        <video src={resolveMedia(m.url)} className="w-full h-full object-cover" muted loop onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm pointer-events-none">
                          <button onClick={() => handleAddToTimeline({ media_options: [{ url: m.url }], caption: m.caption })} className="bg-blue-600 pointer-events-auto text-white p-1.5 rounded-full hover:scale-110 transition-transform">
                            <PlusCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-1.5 flex flex-col items-center">
                        <p className="text-[9px] text-neutral-300 font-medium truncate w-full text-center" title={m.caption}>{m.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-neutral-500 text-center mt-2">Videos proporcionados por Coverr.</p>
              </div>
            )}

            {/* SFX */}
            {leftTab === 'sfx' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white">Efectos de Sonido</h3>
                <div className="flex gap-2">
                   <input type="text" placeholder="Pegar URL directa de MP3/WAV..." onKeyDown={e => {
                     if (e.key === 'Enter' && e.target.value) {
                       handleAddToTimeline({ media_options: [{ url: e.target.value }], type: 'audio', caption: 'Audio Web' });
                       e.target.value = '';
                     }
                   }} className="flex-1 bg-[#27272a] border border-[#3f3f46] text-white text-[10px] rounded p-2 outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  {SFX_LIBRARY.map(s => (
                    <div key={s.id} draggable onDragStart={e => { setDraggedMedia(s); e.dataTransfer.setData('text/plain', s.url); }}
                      className="group flex items-center justify-between bg-[#27272a]/50 hover:bg-[#27272a] border border-transparent hover:border-[#3f3f46] p-2 rounded-md transition-all cursor-grab active:cursor-grabbing">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{s.icon}</span>
                        <span className="text-xs text-neutral-300">{s.caption}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { const a = new Audio(s.url); a.play(); }} className="text-neutral-400 hover:text-white p-1">
                          <Play className="w-3.5 h-3.5" fill="currentColor" />
                        </button>
                        <button onClick={() => handleAddToTimeline({ media_options: [{ url: s.url }], caption: s.caption })} className="text-blue-400 hover:text-blue-300 p-1">
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MOTION GRAPHICS */}
            {leftTab === 'motion' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-white">Librería Motion Graphics</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MOTION_GRAPHICS_LIBRARY.map(m => (
                    <div key={m.id} draggable onDragStart={e => { setDraggedMedia(m); e.dataTransfer.setData('text/plain', m.url); }}
                      className="group relative flex flex-col bg-[#27272a] rounded-lg border border-[#3f3f46] overflow-hidden cursor-grab active:cursor-grabbing hover:border-purple-500 transition-colors">
                      <div className="aspect-video flex items-center justify-center relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAOklEQVQYV2NkYGAwYcSPgXwY8IEDMQRVwCQKj5J/D8X/4QxMglkUNwpNwG0QGwUmwSwKVUhsFJiERwkA10QhQ2/x2g8AAAAASUVORK5CYII=')]">
                        <video src={resolveMedia(m.url)} className="w-full h-full object-cover" muted loop onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm pointer-events-none">
                          <button onClick={() => {
                            const t = engine.currentTimeRef.current;
                            getVideoDuration(m.url).then(dur => {
                              const newClip = makeVideoClip(m.url, m.caption, t, t + dur);
                              if (m.chromaKey) newClip.chromaKey = m.chromaKey;
                              insertClipWithoutOverlap(newClip, 'video');
                            });
                          }} className="bg-purple-600 pointer-events-auto text-white p-1.5 rounded-full hover:scale-110 transition-transform shadow-lg">
                            <PlusCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-1.5 flex flex-col items-center">
                        <p className="text-[9px] text-neutral-300 font-medium truncate w-full text-center" title={m.caption}>{m.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-purple-400 text-center mt-2 font-medium">✨ Se aplicará Chroma Key automático si es fondo verde/negro.</p>
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
              {(() => {
                 const currentVideoClip = editor.project.layers.find(l => l.type === 'video')?.clips.find(c => engine.displayTime >= c.start && engine.displayTime <= c.end);
                 const activeEffects = currentVideoClip?.effects || [];
                 let cssFilter = '';
                 if (activeEffects.includes('blur')) cssFilter += 'blur(5px) ';
                 if (activeEffects.includes('bw')) cssFilter += 'grayscale(100%) ';
                 if (activeEffects.includes('vignette')) cssFilter += 'contrast(1.2) brightness(0.8) ';
                 if (activeEffects.includes('vhs')) cssFilter += 'sepia(30%) hue-rotate(-20deg) saturate(150%) contrast(1.1) ';
                 
                 const color = currentVideoClip?.color || { brightness: 0, contrast: 1, saturation: 1 };
                 if (color.brightness !== 0) cssFilter += `brightness(${1 + color.brightness}) `;
                 if (color.contrast !== 1) cssFilter += `contrast(${color.contrast}) `;
                 if (color.saturation !== 1) cssFilter += `saturate(${color.saturation}) `;

                 return (
                   <video ref={videoRef} className="w-full h-full object-contain transition-all duration-300" controls={false} style={{ filter: cssFilter.trim() || 'none' }} />
                 );
              })()}

              {/* Text overlay preview */}
              {editor.project.layers.find(l => l.type === 'text')?.clips
                .filter(c => engine.displayTime >= c.start && engine.displayTime <= c.end)
                .map(c => (
                  <div key={c.id} className="absolute text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] cursor-move hover:ring-2 hover:ring-yellow-500 rounded p-2"
                    onMouseDown={(e) => {
                       e.preventDefault(); // prevent text selection
                       const target = e.currentTarget;
                       const container = target.parentElement;
                       const startY = e.clientY;
                       const startX = e.clientX;
                       const startPosY = c.style?.posY ?? 0.85;
                       const startPosX = c.style?.posX ?? 0.5;
                       
                       const handleMove = (ev) => {
                          const deltaY = ev.clientY - startY;
                          const deltaX = ev.clientX - startX;
                          const h = container.clientHeight;
                          const w = container.clientWidth;
                          
                          let newY = startPosY + (deltaY / h);
                          let newX = startPosX + (deltaX / w);
                          newY = Math.max(0, Math.min(1, newY));
                          newX = Math.max(0, Math.min(1, newX));
                          
                          editor.updateClip(c.id, { style: { ...c.style, posY: newY, posX: newX } }, true);
                       };
                       const handleUp = () => {
                          window.removeEventListener('mousemove', handleMove);
                          window.removeEventListener('mouseup', handleUp);
                       };
                       window.addEventListener('mousemove', handleMove);
                       window.addEventListener('mouseup', handleUp);
                    }}
                    style={{
                      top: `${(c.style?.posY ?? 0.85) * 100}%`,
                      left: `${(c.style?.posX ?? 0.5) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${(c.style?.fontSize || 48) * (isPortrait ? 0.4 : 0.6)}px`,
                      color: c.style?.fontColor || '#fff',
                      fontWeight: 'bold',
                      textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 4px 15px rgba(0,0,0,0.8)',
                      background: c.style?.bgColor ? c.style.bgColor : 'transparent',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      width: '90%',
                      userSelect: 'none'
                    }}>
                    {c.style?.karaoke && c.style?.words ? (
                       c.style.words.map((w, idx) => {
                          const isActive = engine.displayTime >= w.start && engine.displayTime <= w.end;
                          const isPast = engine.displayTime > w.end;
                          return (
                             <span key={idx} style={{ 
                                color: isActive ? '#facc15' : (isPast ? '#e5e5e5' : '#ffffff'), 
                                transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)', 
                                display: 'inline-block', 
                                margin: '0 6px',
                                transform: isActive ? 'scale(1.15) translateY(-4px)' : 'scale(1)'
                             }}>
                               {w.text}
                             </span>
                          )
                       })
                    ) : (
                       c.text
                    )}
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

        {/* RIGHT PANEL: Properties (was FloatingToolbar) */}
        <FloatingToolbar selectedClip={selectedClip} editor={editor} engine={engine} />
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
            <button onClick={() => editor.addLayer(makeLayer('video'))} className="text-[10px] font-semibold text-neutral-400 hover:text-white px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center gap-1"><Video className="w-3 h-3" /> + Video</button>
            <button onClick={() => editor.addLayer(makeLayer('audio'))} className="text-[10px] font-semibold text-neutral-400 hover:text-white px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center gap-1"><Music className="w-3 h-3" /> + Audio</button>
            <button onClick={() => editor.addLayer(makeLayer('text'))} className="text-[10px] font-semibold text-neutral-400 hover:text-white px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center gap-1"><Type className="w-3 h-3" /> + Texto</button>
            
            <div className="w-px h-4 bg-neutral-700 mx-1"></div>
            
            <button onClick={handleVoiceRecord} className={`text-[10px] font-bold px-3 py-1 rounded border flex items-center gap-1.5 transition-all ${isRecordingVoice ? 'bg-red-600/20 text-red-500 border-red-500 animate-pulse' : 'bg-[#27272a] text-neutral-400 hover:text-white hover:bg-[#3f3f46] border-[#3f3f46]'}`}>
              <div className={`w-2 h-2 rounded-full ${isRecordingVoice ? 'bg-red-500' : 'bg-neutral-500'}`}></div>
              {isRecordingVoice ? 'Grabando...' : 'Grabar Voz'}
            </button>
          </div>
          <div className="flex items-center gap-6 ml-auto">
            {/* Timeline Zoom */}
            <div className="flex items-center gap-2 hidden sm:flex">
              <span className="text-[10px] text-neutral-500 font-bold tracking-wider">ZOOM</span>
              <input type="range" min="1" max="20" step="1"
                value={timelineZoom}
                onChange={e => setTimelineZoom(parseInt(e.target.value))}
                className="w-24 accent-neutral-500" />
            </div>

            <div className="w-px h-6 bg-neutral-800 hidden sm:block"></div>

            {/* Playhead Time */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider hidden sm:inline-block">Línea de Tiempo</span>
              <input type="range" min="0" max={editor.totalDuration || 10} step="0.1"
                value={engine.displayTime}
                onChange={e => engine.seek(parseFloat(e.target.value))}
                className="w-32 sm:w-48 accent-blue-500" />
            </div>
          </div>
        </div>

        {/* Timeline Editor Canvas */}
        <div className={`flex-1 overflow-hidden transition-all duration-200 ${isDraggingOver ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/10' : ''}`}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            const t = engine.currentTimeRef.current;

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const file = e.dataTransfer.files[0];
              if (!file.type.match(/^(video|audio|image)\//)) return;
              const url = URL.createObjectURL(file);
              const dur = await getVideoDuration(url);
              const isAudio = file.type.startsWith('audio/');
              const layerType = isAudio ? 'audio' : 'video';

              const newClip = isAudio 
                ? makeAudioClip(url, file.name, t, t + dur)
                : makeVideoClip(url, file.name, t, t + dur);
              
              insertClipWithoutOverlap(newClip, layerType);

              setLocalUploads(prev => [...prev, { id: `local-${Date.now()}`, caption: file.name, media_options: [{ url }] }]);
              return;
            }

            if (!draggedMedia) return;
            const url = draggedMedia.media_options?.[0]?.url || draggedMedia.url;
            const dur = await getVideoDuration(url);
            const isAudio = draggedMedia.type === 'audio' || url.match(/\.(mp3|wav|ogg|m4a|aac)$/i) || (draggedMedia.caption && draggedMedia.caption.match(/\.(mp3|wav|ogg|m4a|aac)$/i));
            const layerType = isAudio ? 'audio' : 'video';
            
            const newClip = isAudio
              ? makeAudioClip(url, draggedMedia.caption || 'Audio', t, t + dur)
              : makeVideoClip(url, draggedMedia.caption || 'Video', t, t + dur);
            
            insertClipWithoutOverlap(newClip, layerType);
            
            setDraggedMedia(null);
          }}>
          {timelineNode}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 w-80 shadow-2xl relative">
            <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-blue-500" /> Exportar Video</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-neutral-400 font-semibold mb-1.5 block">Calidad (Bitrate)</label>
                <select value={exportSettings.quality} onChange={e => setExportSettings({ ...exportSettings, quality: e.target.value })} className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-sm rounded-md p-2 outline-none focus:border-blue-500">
                  <option value="high">Alta (Mejor calidad, más pesado)</option>
                  <option value="medium">Media (Recomendado para Redes)</option>
                  <option value="low">Baja (Rápido, menos espacio)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-semibold mb-1.5 block">Cuadros por Segundo (FPS)</label>
                <select value={exportSettings.fps} onChange={e => setExportSettings({ ...exportSettings, fps: parseInt(e.target.value) })} className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-sm rounded-md p-2 outline-none focus:border-blue-500">
                  <option value={30}>30 FPS (Estándar)</option>
                  <option value={60}>60 FPS (Fluido)</option>
                </select>
              </div>
            </div>

            <button onClick={handleRender} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Procesar y Descargar
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
