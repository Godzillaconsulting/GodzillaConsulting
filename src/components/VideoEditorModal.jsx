import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Play, Pause, Scissors, AlignCenter, Loader2, Download, Video, Music, Type } from 'lucide-react';
import { Timeline } from '@xzdarcy/react-timeline-editor';

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

export default function VideoEditorModal({ isOpen, onClose, initialVideoUrl }) {
    const [editorData, setEditorData] = useState(initialEditorData);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef(null);

    // Timeline Configuration
    const scale = 5; 
    const timelineState = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        // Cuando se abre con un video de Veo, simulamos que cargó en la línea base
        if (initialVideoUrl) {
            console.log("Cargando video base al editor...", initialVideoUrl);
            setEditorData([
              { id: 'track-video', actions: [{ id: 'main-v', start: 0, end: 10, effectId: 'v-1', text: 'Veo Video', color: '#3b82f6' }] },
              { id: 'track-audio', actions: [{ id: 'main-a', start: 0, end: 10, effectId: 'a-1', text: 'Voz/Sonido Original', color: '#10b981' }] },
              { id: 'track-text', actions: [] }
            ]);
        }
    }, [isOpen, initialVideoUrl]);

    const handleMagicBot = async () => {
        setIsBotThinking(true);
        try {
            // Simulando extracción de audio y llamada al backend
            // const token = localStorage.getItem('adminToken');
            // const res = await fetch('/api/studio/magicedit', { ... }); 
            // const data = await res.json();
            
            // Simulación visual del EDL devuelto por Gemini Flash Audio:
            await new Promise(r => setTimeout(r, 4500));
            
            setEditorData(prev => {
                const newData = [...prev];
                // Simula que cortó del segundo 3 al 4.5
                newData[0].actions = [
                    { id: 'main-v-1', start: 0, end: 3, effectId: 'v-1', text: 'Veo Video (Corte 1)', color: '#2563eb' },
                    { id: 'main-v-2', start: 4.5, end: 10, effectId: 'v-2', text: 'Veo Video (Corte 2)', color: '#2563eb' }
                ];
                newData[1].actions = [
                    { id: 'main-a-1', start: 0, end: 3, effectId: 'a-1', text: 'Audio', color: '#059669' },
                    { id: 'main-a-2', start: 4.5, end: 10, effectId: 'a-2', text: 'Audio', color: '#059669' }
                ];
                // Agrega los captions automáticos
                newData[2].actions = [
                    { id: 'cap-1', start: 0.5, end: 2.5, effectId: 'c-1', text: '"¡El Bot Mágico"', color: '#eab308' },
                    { id: 'cap-2', start: 4.5, end: 7.0, effectId: 'c-2', text: '"cortó todo el silencio!"', color: '#eab308' }
                ];
                return newData;
            });

            alert('✨ Bot Mágico: 1 silencio eliminado, 2 captions generados.');
        } catch (e) {
            console.error(e);
            alert('Error en Bot Mágico');
        } finally {
            setIsBotThinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            >
                {/* Cabecera del Editor */}
                <div className="absolute top-0 w-full h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6">
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
                        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                            <Download className="w-4 h-4" />
                            Renderizar
                        </button>
                        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Área Pincipal: Layout Dividido */}
                <div className="flex flex-col w-full h-full pt-16">
                    
                    {/* TOP: Visor de Video y Herramientas */}
                    <div className="flex-1 flex gap-4 p-4 min-h-0 bg-neutral-950">
                        {/* Selector de Efectos / Media (Sidebar) */}
                        <div className="w-64 bg-neutral-900 rounded-xl border border-neutral-800 p-4 flex flex-col gap-2">
                            <h3 className="text-white font-bold mb-2">Pistas & Capas</h3>
                            <button className="flex items-center justify-between w-full p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors">
                                <span className="flex items-center gap-2"><Video className="w-4 h-4 text-blue-400"/> Video Track</span>
                            </button>
                            <button className="flex items-center justify-between w-full p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors">
                                <span className="flex items-center gap-2"><Music className="w-4 h-4 text-green-400"/> Audio Track</span>
                            </button>
                            <button className="flex items-center justify-between w-full p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors">
                                <span className="flex items-center gap-2"><Type className="w-4 h-4 text-yellow-500"/> Captions IA</span>
                            </button>
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
                                    00:{currentTime.toFixed(1).padStart(4, '0')} / 00:10.0
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
                        <div className="w-full h-[calc(100%-2rem)] overflow-hidden relative custom-timeline-theme">
                            <Timeline 
                                editorData={editorData} 
                                effects={{}} 
                                scale={scale}
                                hideCursor={false}
                                onChange={(data) => setEditorData(data)}
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
            </motion.div>
        </AnimatePresence>
    );
}
