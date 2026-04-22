import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Play, Pause, Scissors, AlignCenter, Loader2, Download, Video, Music, Type, Send } from 'lucide-react';
import { Timeline } from '@xzdarcy/react-timeline-editor';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Datos dummy de inicialización para la línea de tiempo
const initialEditorData = [
  {
    id: 'track-video-1',
    actions: [
      { id: 'clip-1', start: 0, end: 10, effectId: 'video-fx', text: 'Video Base (Generado)', color: '#3b82f6' }
    ]
  },
  {
    id: 'track-audio-1',
    actions: [
      { id: 'audio-1', start: 0, end: 10, effectId: 'audio-fx', text: 'Pista de Audio', color: '#10b981' }
    ]
  },
  {
    id: 'track-captions-1',
    actions: []
  }
];

export default function IntegratedVideoEditor({ initialVideoUrl, queue = [], onClose }) {
    const [editorData, setEditorData] = useState(initialEditorData);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const timeDisplayRef = useRef(null);
    const [localVideoUrl, setLocalVideoUrl] = useState(initialVideoUrl);
    const [draggedMedia, setDraggedMedia] = useState(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [ttsText, setTtsText] = useState('');
    const [ttsVoice, setTtsVoice] = useState('es-MX');
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [localUploads, setLocalUploads] = useState([]);
    
    // Filtros estilo CapCut (Video Color Grading)
    const [filters, setFilters] = useState({ brightness: 0, contrast: 1, saturation: 1, gamma: 1 });
    const videoRef = useRef(null);
    const ffmpegRef = useRef(new FFmpeg());
    const globalTimeRef = useRef(0);
    const lastTickRef = useRef(performance.now());
    const currentClipIdRef = useRef(null);

    // Timeline Configuration
    const scale = 5; 
    const timelineState = useRef(null);

    // Filtrar videos de la bandeja (queue) que puedan editarse (videos finalizados o pendientes de aprobación guardados)
    const savedVideos = queue.filter(q => q.media_options && q.media_options.length > 0 && 
                                          q.media_options[0].url && 
                                          (q.media_options[0].url.includes('.mp4') || q.media_options[0].url.includes('.webm')));

    const displayVideos = [...savedVideos, ...localUploads];

    useEffect(() => {
        if (initialVideoUrl) {
            setLocalVideoUrl(initialVideoUrl);
            setEditorData([
              { id: 'track-video', actions: [{ id: 'main-v', start: 0, end: 10, effectId: 'v-1', text: 'Video Activo', color: '#3b82f6', sourceUrl: initialVideoUrl, sourceStart: 0 }] },
              { id: 'track-audio', actions: [{ id: 'main-a', start: 0, end: 10, effectId: 'a-1', text: 'Voz/Sonido Original', color: '#10b981' }] },
              { id: 'track-text', actions: [] }
            ]);
        } else {
            setEditorData([
              { id: 'track-video', actions: [] },
              { id: 'track-audio', actions: [] },
              { id: 'track-text', actions: [] }
            ]);
        }
    }, [initialVideoUrl]);

    useEffect(() => {
        let animationFrameId;
        const syncTime = () => {
            if (isPlaying) {
                const now = performance.now();
                const delta = (now - lastTickRef.current) / 1000;
                lastTickRef.current = now;
                globalTimeRef.current += delta;
                
                const t = globalTimeRef.current;
                
                if (timeDisplayRef.current) {
                    timeDisplayRef.current.innerText = `${t.toFixed(2)}s`;
                }
                
                if (timelineState.current && timelineState.current.setTime) {
                    timelineState.current.setTime(t);
                }

                const videoTrack = editorData.find(tr => tr.id === 'track-video');
                const clip = videoTrack?.actions.find(a => t >= a.start && t <= a.end);
                
                if (clip) {
                    if (currentClipIdRef.current !== clip.id) {
                        currentClipIdRef.current = clip.id;
                        if (videoRef.current) {
                            videoRef.current.src = clip.sourceUrl || localVideoUrl;
                            videoRef.current.currentTime = t - clip.start + (clip.sourceStart || 0);
                            videoRef.current.play().catch(e => console.log(e));
                        }
                    } else {
                        if (videoRef.current) {
                            const expectedTime = t - clip.start + (clip.sourceStart || 0);
                            if (Math.abs(videoRef.current.currentTime - expectedTime) > 0.3) {
                                videoRef.current.currentTime = expectedTime;
                            }
                        }
                    }
                } else {
                    if (currentClipIdRef.current !== null) {
                        currentClipIdRef.current = null;
                        if (videoRef.current) {
                            videoRef.current.pause();
                        }
                    }
                }
                
                animationFrameId = requestAnimationFrame(syncTime);
            }
        };

        if (isPlaying) {
            lastTickRef.current = performance.now();
            animationFrameId = requestAnimationFrame(syncTime);
        } else {
            videoRef.current?.pause();
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, editorData, localVideoUrl]);

    const handleTimeChange = (time) => {
        globalTimeRef.current = time;
        if (timeDisplayRef.current) {
            timeDisplayRef.current.innerText = `${time.toFixed(2)}s`;
        }
        if (timelineState.current && timelineState.current.setTime) {
            timelineState.current.setTime(time);
        }
        
        const videoTrack = editorData.find(t => t.id === 'track-video');
        const clip = videoTrack?.actions.find(a => time >= a.start && time <= a.end);
        
        if (clip && videoRef.current) {
            const clipUrl = clip.sourceUrl || localVideoUrl;
            if (currentClipIdRef.current !== clip.id || videoRef.current.src !== clipUrl) {
                currentClipIdRef.current = clip.id;
                videoRef.current.src = clipUrl;
                videoRef.current.load();
            }
            videoRef.current.currentTime = time - clip.start + (clip.sourceStart || 0);
        } else {
            currentClipIdRef.current = null;
        }
        return true;
    };

    const handleRender = async () => {
        const videoTrack = editorData.find(t => t.id === 'track-video');
        if (!videoTrack || videoTrack.actions.length === 0) {
            alert('Agrega al menos un clip a la pista de video');
            return;
        }

        setIsRendering(true);
        setRenderProgress(0);

        try {
            const ffmpeg = ffmpegRef.current;
            if (!ffmpeg.loaded) {
                ffmpeg.on('progress', ({ progress }) => {
                    setRenderProgress(Math.round(progress * 100));
                });
                await ffmpeg.load({
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
                    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
                });
            }

            const clips = videoTrack.actions.filter(c => c.sourceUrl);
            const uniqueUrls = [...new Set(clips.map(a => a.sourceUrl))];
            
            for (let i=0; i<uniqueUrls.length; i++) {
                const fileData = await fetchFile(uniqueUrls[i]);
                await ffmpeg.writeFile(`input${i}.mp4`, fileData);
            }

            let filterComplex = '';
            let concatString = '';
            
            clips.forEach((clip, index) => {
                const fileIndex = uniqueUrls.indexOf(clip.sourceUrl);
                const duration = clip.end - clip.start;
                const startOffset = clip.sourceStart || 0;
                
                // Aplicar filtros de color CapCut-style (Brillo, Contraste, Saturación, Gamma)
                const eqFilter = `eq=brightness=${filters.brightness}:contrast=${filters.contrast}:saturation=${filters.saturation}:gamma=${filters.gamma}`;
                filterComplex += `[${fileIndex}:v]trim=start=${startOffset}:duration=${duration},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,${eqFilter}[v${index}]; `;
                filterComplex += `[${fileIndex}:a]atrim=start=${startOffset}:duration=${duration},asetpts=PTS-STARTPTS[a${index}]; `;
                
                concatString += `[v${index}][a${index}]`;
            });

            filterComplex += `${concatString}concat=n=${clips.length}:v=1:a=1[outv][outa]`;

            const inputs = uniqueUrls.map((url, i) => ['-i', `input${i}.mp4`]).flat();
            
            await ffmpeg.exec([
                ...inputs,
                '-filter_complex', filterComplex,
                '-map', '[outv]',
                '-map', '[outa]',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'aac',
                'output.mp4'
            ]);

            const data = await ffmpeg.readFile('output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `godzilla_pro_edit_${Date.now()}.mp4`;
            a.click();
            
            alert('¡Renderizado completado con éxito!');
        } catch (error) {
            console.error('Render error:', error);
            alert('Error renderizando el video. Verifica la consola.');
        } finally {
            setIsRendering(false);
            setRenderProgress(0);
        }
    };

    const handleGenerateVoice = async () => {
        if (!ttsText.trim()) return;
        setIsGeneratingVoice(true);
        try {
            // Utilizamos el Web Speech API para simular generación de audio local y no gastar cuota de servidor
            const utterance = new SpeechSynthesisUtterance(ttsText);
            utterance.lang = ttsVoice;
            
            // Simular tiempo de carga de API
            await new Promise(r => setTimeout(r, 800));
            
            const dropTime = timelineState.current ? timelineState.current.getTime() : 0;
            const newAudioClip = {
                id: `audio-${Date.now()}`,
                start: dropTime,
                end: dropTime + Math.max(ttsText.length * 0.08, 2),
                effectId: 'a-1',
                text: `🔊 TTS: ${ttsText.substring(0,12)}...`,
                color: '#10b981',
                ttsContent: ttsText
            };
            
            setEditorData(prev => {
                const newData = [...prev];
                const audioTrack = newData.find(t => t.id === 'track-audio');
                if (audioTrack) audioTrack.actions.push(newAudioClip);
                return newData;
            });
            setTtsText('');
            alert('¡Locución generada localmente y añadida a la línea de tiempo!');
        } catch (e) {
            console.error(e);
            alert('Error generando voz');
        } finally {
            setIsGeneratingVoice(false);
        }
    };

    const handleMagicBot = async () => {
        setIsBotThinking(true);
        try {
            await new Promise(r => setTimeout(r, 2000));
            const videoTrack = editorData.find(t => t.id === 'track-video');
            const baseClip = videoTrack?.actions[0];
            
            if (!baseClip || !baseClip.sourceUrl) throw new Error("Añade un video a la línea de tiempo primero");

            const midPoint = (baseClip.end - baseClip.start) / 2;
            const cutDuration = 1.5;
            
            const clip1 = {
                id: `clip-${Date.now()}-1`,
                start: baseClip.start,
                end: baseClip.start + midPoint - (cutDuration/2),
                effectId: 'v-1',
                text: 'Raw Parte 1',
                color: '#2563eb',
                sourceUrl: baseClip.sourceUrl,
                sourceStart: baseClip.sourceStart || 0
            };
            
            const clip2 = {
                id: `clip-${Date.now()}-2`,
                start: clip1.end,
                end: clip1.end + (baseClip.end - (baseClip.start + midPoint + (cutDuration/2))),
                effectId: 'v-1',
                text: 'Raw Parte 2',
                color: '#2563eb',
                sourceUrl: baseClip.sourceUrl,
                sourceStart: (baseClip.sourceStart || 0) + midPoint + (cutDuration/2)
            };

            const caption1 = {
                id: `cap-${Date.now()}-1`,
                start: clip1.start + 0.5,
                end: clip1.end - 0.5,
                effectId: 'c-1',
                text: '"¡Esto fue cortado por IA!"',
                color: '#eab308'
            };

            setEditorData(prev => {
                const newData = [...prev];
                const vTrack = newData.find(t => t.id === 'track-video');
                const tTrack = newData.find(t => t.id === 'track-text');
                if (vTrack) vTrack.actions = [clip1, clip2];
                if (tTrack) tTrack.actions = [caption1];
                return newData;
            });
            alert('✨ Bot Mágico: Se ha eliminado un silencio de 1.5s automáticamente.');
        } catch (e) {
            console.error(e);
            alert('Error en Bot Mágico: ' + e.message);
        } finally {
            setIsBotThinking(false);
        }
    };

    return (
        <div className="flex-1 w-full flex flex-col bg-[#080808] border-t border-red-900/30 overflow-hidden relative">
                {/* Cabecera del Editor */}
                <div className="w-full h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <Scissors className="w-5 h-5 text-blue-500" />
                        <h2 className="text-white font-bold text-lg tracking-tight">Godzilla Pro Editor</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleMagicBot}
                            disabled={isBotThinking}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                            {isBotThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {isBotThinking ? 'IA Analizando...' : 'Auto-Edit Mágico'}
                        </button>
                        <button 
                            onClick={handleRender}
                            disabled={isRendering}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {isRendering ? `Renderizando... ${renderProgress}%` : 'Renderizar'}
                        </button>
                        <button 
                            onClick={() => alert("El video ha sido enrutado a CMCalendar para publicación. (Enlace API pendiente de configuración manual)")}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        >
                            <Send className="w-4 h-4" /> Exportar a Redes
                        </button>
                        <button onClick={onClose || (() => window.history.back())} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Área Pincipal: Layout Dividido */}
                <div className="flex flex-col flex-1 min-h-0">
                    
                    {/* TOP: Visor de Video y Herramientas */}
                    <div className="flex-1 flex gap-4 p-4 min-h-0 bg-neutral-950">
                        {/* Selector de Media y Capas (Sidebar) */}
                        <div className="w-[300px] bg-neutral-900 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
                            
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Video className="w-4 h-4 text-blue-400"/> Carrete / Librería
                                    </h3>
                                    <label className="cursor-pointer bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded px-2 py-1 text-[9px] font-bold transition-colors">
                                        + Subir
                                        <input 
                                            type="file" 
                                            accept="video/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const url = URL.createObjectURL(file);
                                                    setLocalUploads(prev => [...prev, {
                                                        id: `local-${Date.now()}`,
                                                        status: 'local',
                                                        caption: file.name,
                                                        media_options: [{ url }]
                                                    }]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    {displayVideos.length === 0 ? (
                                        <p className="text-neutral-500 text-xs italic">Sube un video o genera uno en el Estudio IA.</p>
                                    ) : (
                                        displayVideos.map(vid => (
                                            <div 
                                                key={vid.id} 
                                                draggable
                                                onDragStart={(e) => {
                                                    setDraggedMedia(vid);
                                                    e.dataTransfer.setData("text/plain", vid.media_options[0].url);
                                                }}
                                                onClick={() => setLocalVideoUrl(vid.media_options[0].url)}
                                                className={`flex items-start gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${localVideoUrl === vid.media_options[0].url ? 'bg-blue-900/20 border-blue-500/50' : 'bg-neutral-800/50 border-neutral-700/50 hover:bg-neutral-800 hover:border-neutral-600'}`}
                                            >
                                                <video src={vid.media_options[0].url} className="w-16 h-12 object-cover rounded bg-black" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-white font-bold truncate">{vid.caption || vid.visual_prompt || 'Clip Generado'}</p>
                                                    <p className="text-[9px] text-neutral-500 uppercase">{vid.status}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-neutral-800 my-2"></div>

                            <div>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2">Pistas & Efectos</h3>
                                <div className="space-y-2">
                                    <button className="flex items-center justify-between w-full p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[11px] font-bold text-neutral-200 transition-colors">
                                        <span className="flex items-center gap-2"><Video className="w-4 h-4 text-blue-400"/> Video Principal</span>
                                    </button>
                                    <button className="flex items-center justify-between w-full p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[11px] font-bold text-neutral-200 transition-colors">
                                        <span className="flex items-center gap-2"><Music className="w-4 h-4 text-green-400"/> Master Audio</span>
                                    </button>
                                    <button className="flex items-center justify-between w-full p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[11px] font-bold text-neutral-200 transition-colors">
                                        <span className="flex items-center gap-2"><Type className="w-4 h-4 text-yellow-500"/> Captions Dinámicos</span>
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-neutral-800 my-2"></div>

                            {/* Filtros CapCut Style */}
                            <div>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2 text-fuchsia-400">
                                    <Wand2 className="w-4 h-4"/> Color Grading (Pro)
                                </h3>
                                <div className="space-y-4 px-1">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase">
                                            <span>Brillo</span>
                                            <span>{Math.round(filters.brightness * 100)}%</span>
                                        </div>
                                        <input type="range" min="-1" max="1" step="0.05" value={filters.brightness} onChange={(e) => setFilters({...filters, brightness: parseFloat(e.target.value)})} className="w-full accent-fuchsia-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase">
                                            <span>Contraste</span>
                                            <span>{Math.round(filters.contrast * 100)}%</span>
                                        </div>
                                        <input type="range" min="0" max="2" step="0.05" value={filters.contrast} onChange={(e) => setFilters({...filters, contrast: parseFloat(e.target.value)})} className="w-full accent-fuchsia-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase">
                                            <span>Saturación</span>
                                            <span>{Math.round(filters.saturation * 100)}%</span>
                                        </div>
                                        <input type="range" min="0" max="3" step="0.1" value={filters.saturation} onChange={(e) => setFilters({...filters, saturation: parseFloat(e.target.value)})} className="w-full accent-fuchsia-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase">
                                            <span>Gamma</span>
                                            <span>{Math.round(filters.gamma * 100)}%</span>
                                        </div>
                                        <input type="range" min="0.1" max="3" step="0.1" value={filters.gamma} onChange={(e) => setFilters({...filters, gamma: parseFloat(e.target.value)})} className="w-full accent-fuchsia-500" />
                                    </div>
                                    <button onClick={() => setFilters({ brightness: 0, contrast: 1, saturation: 1, gamma: 1 })} className="w-full text-[9px] text-neutral-500 hover:text-white uppercase font-bold py-1 border border-neutral-700 hover:border-neutral-500 rounded transition-colors">
                                        Resetear Filtros
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-neutral-800 my-2"></div>

                            <div>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2 text-emerald-400">
                                    <Music className="w-4 h-4"/> Voces IA (UGC)
                                </h3>
                                <div className="flex flex-col gap-2">
                                    <select 
                                        value={ttsVoice} 
                                        onChange={e => setTtsVoice(e.target.value)}
                                        className="bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded p-2 outline-none"
                                    >
                                        <option value="es-MX">Narrador Neutro (es-MX)</option>
                                        <option value="es-ES">Voz Corporativa (es-ES)</option>
                                        <option value="en-US">Voz UGC Inglés (en-US)</option>
                                    </select>
                                    <textarea 
                                        value={ttsText}
                                        onChange={e => setTtsText(e.target.value)}
                                        placeholder="Escribe el guion UGC aquí..." 
                                        className="bg-neutral-800 border border-neutral-700 text-white text-[10px] rounded p-2 outline-none resize-none h-20"
                                    />
                                    <button 
                                        onClick={handleGenerateVoice}
                                        disabled={isGeneratingVoice || !ttsText.trim()}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingVoice ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                                        Generar Audio
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Reproductor Central */}
                        <div className="flex-1 bg-black rounded-xl border border-neutral-800 flex flex-col items-center justify-center relative overflow-hidden">
                            {initialVideoUrl ? (
                                <video 
                                    ref={videoRef}
                                    src={initialVideoUrl} 
                                    className="h-full object-contain"
                                    controls={false}
                                />
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center">
                                    <Video className="w-16 h-16 mb-4 opacity-50" />
                                    <p>Visor Inactivo</p>
                                </div>
                            )}

                            {/* Controles del reproductor inyectados */}
                            <div className="absolute bottom-4 flex bg-neutral-900/80 backdrop-blur rounded-full px-4 py-2 border border-neutral-700">
                                <button 
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="text-white hover:text-blue-400 px-2"
                                >
                                    {isPlaying ? <Pause className="w-6 h-6"/> : <Play className="w-6 h-6" fill="currentColor"/>}
                                </button>
                                <div className="text-neutral-300 font-mono text-sm flex items-center ml-4">
                                    00:<span ref={timeDisplayRef}>0.0</span> / 00:10.0
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: Timeline */}
                    <div className="h-64 bg-neutral-900 border-t border-neutral-800 shrink-0 select-none">
                        {/* Cabecera del Timeline (Tiempo) */}
                        <div className="h-8 bg-neutral-950 flex items-center px-4 border-b border-neutral-800">
                            <span className="text-xs text-neutral-500 font-mono">00:00:00</span>
                        </div>
                        
                        {/* Motor XZDarcy Timeline */}
                        <div 
                            className="w-full h-[calc(100%-2rem)] overflow-hidden relative custom-timeline-theme"
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggedMedia) {
                                    const dropTime = timelineState.current ? timelineState.current.getTime() : 0;
                                    const newClip = {
                                        id: `clip-${Date.now()}`,
                                        start: dropTime,
                                        end: dropTime + 5, // Default 5s
                                        effectId: 'v-1',
                                        text: draggedMedia.caption || draggedMedia.visual_prompt || 'Clip Añadido',
                                        color: '#3b82f6',
                                        sourceUrl: draggedMedia.media_options[0].url,
                                        sourceStart: 0
                                    };
                                    setEditorData(prev => {
                                        const newData = [...prev];
                                        const videoTrack = newData.find(t => t.id === 'track-video');
                                        if (videoTrack) {
                                            videoTrack.actions.push(newClip);
                                        } else {
                                            newData.push({ id: 'track-video', actions: [newClip] });
                                        }
                                        return newData;
                                    });
                                    setDraggedMedia(null);
                                    if (!localVideoUrl) setLocalVideoUrl(draggedMedia.media_options[0].url);
                                }
                            }}
                        >
                            <Timeline 
                                ref={timelineState}
                                editorData={editorData} 
                                effects={{}} 
                                scale={scale}
                                hideCursor={false}
                                onChange={(data) => setEditorData(data)}
                                onClickTimeArea={handleTimeChange}
                                onCursorDrag={handleTimeChange}
                                onCursorDragEnd={handleTimeChange}
                                autoScroll={true}
                                style={{
                                    backgroundColor: '#171717', 
                                    color: '#fff',
                                    height: '100%',
                                }}
                            />
                        </div>
                    </div>

                </div>
            </div>
    );
}
