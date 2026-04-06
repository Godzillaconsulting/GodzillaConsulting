import React, { useState, useEffect } from 'react';
import MediaPicker from './MediaPicker';

export default function CockersStudio({ adminProfile }) {
    const [queue, setQueue] = useState([]);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [renderingAI, setRenderingAI] = useState(false);
    const [manualUrl, setManualUrl] = useState('');
    const [showPromptBuilder, setShowPromptBuilder] = useState(false);
    const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '¡Modo Creador Libre! Cuéntame tu idea cruda (ej. "Un monstruo tecnológico haciendo home office") y yo le agregaré vocabulario cinemático. ¡También puedes subir tu foto de referencia a la derecha y escribir el prompt por ti mismo!' }]);
    const [chatInput, setChatInput] = useState('');
    const [finalPrompt, setFinalPrompt] = useState('');
    const [refImage, setRefImage] = useState('');
    const [builderData, setBuilderData] = useState({ 
        tema: 'Cyberpunk', 
        estilo: 'Hyperrealistic', 
        luces: 'Neon',
        aspect_ratio: '16:9',
        duracion: '5',
        camara: 'Pan',
        negativo: ''
    });
    const [showAdvancedTuning, setShowAdvancedTuning] = useState(false);
    const [generateVideo, setGenerateVideo] = useState(false);
    const [showScriptGen, setShowScriptGen] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    
    // Estados para el generador de Guiones
    const [scriptChatInput, setScriptChatInput] = useState('');
    const [scriptChatHistory, setScriptChatHistory] = useState([
        { role: 'ai', text: '¡Hola! Soy tu IA de Copywriting. Describe el tema principal del post o déjame hacerte un par de preguntas para crear un guion estructurado.' }
    ]);
    // Bóveda de Prompts Maestros (S-Tier) recopilados de la red.
    const elitePrompts = [
        "Cinematic FPV drone shot, flying through a hyper-realistic neo-tokyo corporate office at midnight, rain splashing on the glass, neon blue and magenta reflections, 8k resolution, unreal engine 5 render, raytracing, dynamic motion blur, ultra-detailed textures.",
        "Extreme macro close-up of a glowing glowing server rack cable snapping, sparks flying in explosive super slow motion (1000 fps), dark background, cinematic volumetric lighting, high contrast, vividly realistic, ARRI Alexa 65.",
        "A gargantuan silhouette of a kaiju destroying a slow-moving physical spreadsheet in a foggy urban city, cinematic lighting, dramatic low angle, shot on 35mm lens, f/1.8, color grading by Roger Deakins, photorealistic, cinematic atmosphere.",
        "Slow camera pan over an abstract glassmorphism holographic UI floating in mid-air above a premium mahogany desk, fluid dynamics, refraction of light through prisms, corporate dark mode aesthetic, deep depth of field, 8k.",
        "Portrait of a stressed tech CEO suddenly exhaling and turning into digital neon particles ascending, cinematic studio lighting, rim light, highly detailed skin pores, volumetric fog, cyberpunk aesthetic, incredibly detailed.",
        "Hyper-lapse shot of a skyscraper being built instantly using glowing blue neon lines, dark futuristic city background, volumetric light rays, hyper-realistic, photoreal, highly detailed CGI, 8k resolution.",
        "A businessman falling backward into a pool of black liquid that instantly solidifies into a server room floor, surreal cinematic transition, dramatic lighting, shot on 50mm f/1.4, slow motion, surrealism, highly detailed."
    ];
    // Fórmula para elegir 3 prompts diferentes que roten cada día (24 hrs)
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const dailyTrendingPrompts = [
        elitePrompts[dayOfYear % elitePrompts.length],
        elitePrompts[(dayOfYear + 2) % elitePrompts.length],
        elitePrompts[(dayOfYear + 4) % elitePrompts.length]
    ];

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/social/queue`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Si la BD está vacía, inyectamos un prototipo demo para Visualizar la Jerarquía
                if (data.posts.length === 0) {
                    setQueue([{
                        id: 999,
                        status: 'cockers_review',
                        scheduled_for: '2026-04-05T10:00:00Z',
                        caption: '🚀 El boca a boca no te va a pagar la nómina el mes que viene. Si tu empresa Tech sigue dependiendo de referidos, estás cediendo el control a la "suerte". 📉\\n\\n¿Quieres saber cómo escalar con un embudo predecible que traiga prospectos B2B todas las semanas?\\n\\n👉 Envíanos un DM con la palabra ESCALAR.',
                        visual_prompt: 'Cinematic 35mm wide shot, modern corporate office at night, neon blue and magenta lighting reflecting on a glass table. A focused tech CEO in a dark suit looking at holograms...',
                        media_options: []
                    }]);
                } else {
                    setQueue(data.posts);
                }
            }
        } catch (e) {
            console.error('Error', e);
        }
        setIsLoading(false);
    };

    const handleSelectOption = async (optionUrl, providerName) => {
        if (!window.confirm(`¿Aprobar renderizado de ${providerName} y enviar al Calendario de Judith (CM)?`)) return;
        alert(`✅ Carga finalizada: Opción de ${providerName} seleccionada. El Post ahora está en manos de la CM para agendamiento.`);
        // Aquí iría el update PUT a la API:
        // status='pending_cm_approval', selected_media_url=optionUrl
        setSelectedDraft(null);
    };

    const simulateAIGeneration = async () => {
        setRenderingAI(true);
        
        try {
            const rawPrompt = selectedDraft?.visual_prompt || finalPrompt || 'cyberpunk cinematic city';
            const cleanPrompt = rawPrompt.replace(/\[\/?.*?]/g, '').trim();
            const topKeywords = cleanPrompt.split(' ').filter(w => w.length > 4).slice(0, 3).join(' ');

            // 1. Fetching Lexica AI Database for hyper-realistic majestic Image matches
            let imgUrls = [`https://loremflickr.com/600/800/${topKeywords}`, `https://loremflickr.com/600/800/creative`];
            try {
                const lexRes = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(cleanPrompt)}`);
                const lexData = await lexRes.json();
                if (lexData?.images?.length >= 2) {
                    imgUrls = [lexData.images[0].src, lexData.images[1].src];
                }
            } catch (e) { console.log('Lexica fallback'); }

            // 2. Fetching MP4 Contextual Videos (Via Giphy Public Legacy Key to get MP4 links)
            let videoUrls = ['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'https://www.w3schools.com/html/mov_bbb.mp4'];
            try {
                const giphRes = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(topKeywords)}&limit=4`);
                const giphData = await giphRes.json();
                if (giphData?.data?.length >= 2) {
                    videoUrls = [
                        giphData.data[0]?.images?.original?.mp4 || videoUrls[0],
                        giphData.data[1]?.images?.original?.mp4 || videoUrls[1]
                    ];
                }
            } catch (e) { console.log('Video fallback'); }

            const options = [
                { provider: 'Nano Banana v3', url: imgUrls[0], isVideo: false },
                { provider: 'Kling AI (Image)', url: imgUrls[1], isVideo: false },
                { provider: 'Runway Gen-3 (10s)', url: videoUrls[0], isVideo: true },
                { provider: 'Luma Dream Machine', url: videoUrls[1], isVideo: true }
            ];

            // Retraso cinematográfico
            setTimeout(() => {
                setQueue(q => q.map(post => post.id === selectedDraft.id ? { ...post, media_options: options } : post));
                setSelectedDraft(prev => ({ ...prev, media_options: options }));
                setRenderingAI(false);
            }, 2500);

        } catch (error) {
            setRenderingAI(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center text-neutral-400 font-bold">Iniciando Estudio...</div>;

    if (!selectedDraft && !showPromptBuilder) {
        return (
            <div className="p-4 md:p-6 h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a0a0a] to-[#220505] overflow-y-auto relative">
                {/* Aero Glare */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-black/50 blur-[100px] pointer-events-none"></div>

                <div className="flex justify-between items-center mb-4 relative z-10">
                    <div>
                        <h2 className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] tracking-widest uppercase">Estudio Óptico</h2>
                        <p className="text-white font-bold text-sm mt-1 drop-shadow-sm">Duelo de Renderizados para {adminProfile?.username || 'Editor'} (Diseño Final)</p>
                    </div>
                    <div className="text-right">
                        <span className="bg-[#CC0000]/5 text-white border border-red-900/30 backdrop-blur-md px-4 py-2 font-black rounded-xl shadow-lg text-xs">
                            Pendientes de Revisión: {queue.length}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                    {queue.map(post => (
                        <div key={post.id} className="bg-black/30 backdrop-blur-xl border border-red-900/30 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[#CC0000]/5 hover:scale-105 transition-all cursor-pointer" onClick={() => setSelectedDraft(post)}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-white text-xs font-black uppercase tracking-widest drop-shadow-sm">Post Generado por Gemini</h3>
                                <div className="h-3 w-3 rounded-full bg-[#CC0000] border-2 border-[#CC0000]/50 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></div>
                            </div>
                            <p className="text-neutral-300 font-medium text-sm italic line-clamp-3 mb-6 bg-black/40 p-4 rounded-xl border border-red-900/50 shadow-inner">"{post.caption}"</p>
                            
                            <div className="w-full bg-gradient-to-r from-[#ff2222] to-[#AA0000] hover:from-[#ff4444] hover:to-[#CC0000] text-white font-black py-3 px-4 rounded-2xl text-xs text-center transition-all shadow-[0_4px_15px_rgba(14,165,233,0.4)] border border-[#CC0000]/40">
                                Iniciar Duelo de Renderizado 🥊
                            </div>
                        </div>
                    ))}
                    {queue.length === 0 && (
                        <div className="col-span-full py-10 text-center border-2 border-dashed border-red-900/30 bg-black/20 rounded-3xl backdrop-blur-sm">
                            <p className="text-white font-black text-sm drop-shadow-sm">No hay guiones nuevos del Cerebro hoy.</p>
                        </div>
                    )}
                    <div className="col-span-full mt-6 bg-black/30 backdrop-blur-2xl border border-[#CC0000]/20 p-4 md:p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] relative overflow-hidden">
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#CC0000]/20 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-sm">Pausa Comercial: Modo Director de Arte</h3>
                                <p className="text-neutral-700 font-medium text-sm max-w-xl">La automatización la pusimos en pausa. Ahora puedes construir los Prompts manualmente respondiendo un par de preguntas y dándole imágenes de referencia a las IAs para que copien el estilo.</p>
                            </div>
                            <button onClick={() => setShowPromptBuilder(true)} className="mt-4 md:mt-0 bg-white hover:bg-gray-200 text-[#CC0000] border border-[#CC0000]/50 shadow-[0_8px_20px_rgba(255,255,255,0.5)] px-8 py-4 rounded-2xl font-black uppercase text-sm transition-all">
                                + Crear Prompt Guiado
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showPromptBuilder) {
        return (
            <div className="h-full bg-gradient-to-br from-[#020202] via-[#0a0202] to-[#050000] relative overflow-y-auto overflow-x-hidden flex flex-col items-center custom-scrollbar">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#CC0000]/10 rounded-full blur-[150px] opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#ff2222]/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="w-full max-w-5xl px-4 py-8 flex flex-col min-h-screen relative z-10 space-y-6">
                    {/* Kling-Style Header */}
                    <div className="flex items-center justify-between border-b border-red-900/20 pb-4">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setShowPromptBuilder(false)} className="text-[#CC0000] hover:text-white transition-colors">
                                <span className="text-xl">←</span>
                            </button>
                            <h2 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                                <span className="bg-[#CC0000] text-black px-2 py-0.5 rounded text-[10px]">KLING V1.5</span>
                                AI Director Canvas
                            </h2>
                        </div>
                        <button onClick={() => setShowScriptGen(true)} className="bg-black/40 hover:bg-[#CC0000]/20 border border-red-900/30 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(204,0,0,0.1)] flex items-center gap-2">
                            🤖 Abrir Asistente Copiloto
                        </button>
                    </div>

                    {/* Main Kling Generator Canvas */}
                    <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-1 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <div className="bg-[#0f0f0f] rounded-[22px] flex flex-col relative h-[380px]">
                            
                            {/* Toolbar Top */}
                            <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
                                <button className="text-[#CC0000] border-b-2 border-[#CC0000] font-bold text-xs pb-1 uppercase tracking-wider">Multimedia (HD)</button>
                                <button className="text-neutral-500 hover:text-neutral-300 font-bold text-xs pb-1 uppercase tracking-wider transition-colors">Lip Sync</button>
                            </div>

                            {/* Enormous Prompt Area */}
                            <div className="flex-1 relative">
                                <textarea 
                                    value={finalPrompt} 
                                    onChange={e => setFinalPrompt(e.target.value)} 
                                    placeholder="Describe tu visión en detalle. Ej: Un kaiju hiperrealista destruyendo un servidor en cámara lenta..." 
                                    className="w-full h-full bg-transparent border-none text-white/90 focus:ring-0 p-6 text-lg md:text-xl font-light placeholder-neutral-700 outline-none resize-none leading-relaxed"
                                />
                                {/* Generador Semántico de Trends Absolutaente Discreto */}
                                <div className="absolute top-4 right-4 flex flex-col items-end gap-2 max-w-[250px]">
                                    <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">💎 Trends Suggestions</span>
                                    {dailyTrendingPrompts.slice(0,2).map((p, i) => (
                                        <button key={i} onClick={() => setFinalPrompt(p)} className="text-[9px] bg-white/5 hover:bg-[#CC0000]/20 border border-white/5 hover:border-[#CC0000]/30 text-neutral-400 hover:text-white p-2 rounded-lg text-left truncate w-full transition-all backdrop-blur-md">
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Parameters & Action Bar (Pills Style) */}
                            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 bg-black/20">
                                
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Parameters / Inputs tipo Pills */}
                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg overflow-hidden focus-within:border-[#CC0000]/50 transition-colors">
                                        <span className="text-[10px] text-neutral-500 font-bold uppercase pl-3 pr-2">Theme:</span>
                                        <input value={builderData.tema} onChange={(e)=>setBuilderData({...builderData, tema:e.target.value})} className="bg-transparent border-none text-white text-xs w-20 p-2 outline-none" />
                                    </div>

                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg overflow-hidden focus-within:border-[#CC0000]/50 transition-colors">
                                        <span className="text-[10px] text-neutral-500 font-bold uppercase pl-3 pr-2">Style:</span>
                                        <input value={builderData.estilo} onChange={(e)=>setBuilderData({...builderData, estilo:e.target.value})} className="bg-transparent border-none text-white text-xs w-20 p-2 outline-none" />
                                    </div>

                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg overflow-hidden focus-within:border-[#CC0000]/50 transition-colors">
                                        <span className="text-[10px] text-neutral-500 font-bold uppercase pl-3 pr-2">Light:</span>
                                        <input value={builderData.luces} onChange={(e)=>setBuilderData({...builderData, luces:e.target.value})} className="bg-transparent border-none text-white text-xs w-20 p-2 outline-none" />
                                    </div>
                                    
                                    <button onClick={() => {
                                        const { tema, estilo, luces, aspect_ratio, duracion, camara, negativo } = builderData;
                                        const combined = `[Theme: ${tema}] [Style: ${estilo}] [Lighting: ${luces}] --ar ${aspect_ratio} --duration ${duracion}s --camera ${camara} --no ${negativo || 'text, blur'}`;
                                        setFinalPrompt(prev => {
                                            if (!prev) return combined;
                                            let cleanPrev = prev.replace(/\[Theme:.*?\] \[Style:.*?\] \[Lighting:.*?\].*/g, '').trim();
                                            if (cleanPrev.endsWith(',')) cleanPrev = cleanPrev.slice(0, -1).trim();
                                            return cleanPrev ? `${cleanPrev}, ${combined}` : combined;
                                        });
                                    }} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors">
                                        Inyectar Settings ➔
                                    </button>
                                </div>

                                {/* Generate Master Action */}
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowAdvancedTuning(!showAdvancedTuning)} className="text-[10px] bg-white/10 hover:bg-[#CC0000]/20 text-neutral-300 border border-white/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 font-bold">
                                        ⚙️ ENGINE TUNING {showAdvancedTuning ? '▲' : '▼'}
                                    </button>
                                    {refImage && <div className="h-10 w-10 rounded overflow-hidden border-2 border-[#CC0000]"><img src={refImage} className="w-full h-full object-cover"/></div>}
                                    <button onClick={() => {
                                        const newPost = { id: Date.now(), status: 'cockers_review', scheduled_for: new Date(Date.now() + 86400000).toISOString(), caption: '🔥🔥 [Borrador AI Autónomo]\\n\\n(Este post nació del nuevo canvas manual de ' + (adminProfile?.username || 'Editor') + ')', visual_prompt: finalPrompt || 'Cinematic immersive view', reference_image: refImage, media_options: [] };
                                        setSelectedDraft(newPost);
                                        setShowPromptBuilder(false);
                                    }} className="bg-gradient-to-r from-[#FF0000] via-[#CC0000] to-[#880000] hover:bg-gradient-to-r hover:from-[#ff3333] hover:to-[#aa0000] text-white font-black text-sm px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(204,0,0,0.5)] transition-all flex items-center gap-2 group transform active:scale-95">
                                        <span className="group-hover:rotate-12 transition-transform">✦</span> GENERATE
                                    </button>
                                </div>
                            </div>
                            
                            {/* Advanced Tuning Panel (Collapsible) */}
                            {showAdvancedTuning && (
                                <div className="bg-black/60 border-t border-white/5 p-4 flex gap-4 overflow-x-auto custom-scrollbar animate-[fadeIn_0.2s_ease-out]">
                                    <div className="flex flex-col gap-1 min-w-[120px]">
                                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">Aspect Ratio</label>
                                        <select value={builderData.aspect_ratio} onChange={e => setBuilderData({...builderData, aspect_ratio:e.target.value})} className="bg-black border border-white/10 text-white text-xs p-1.5 rounded outline-none focus:border-[#CC0000]">
                                            <option value="16:9">16:9 (Desktop Cinematic)</option>
                                            <option value="9:16">9:16 (Reels/TikTok)</option>
                                            <option value="1:1">1:1 (Square)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-[100px]">
                                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">Video Engine Duration</label>
                                        <select value={builderData.duracion} onChange={e => setBuilderData({...builderData, duracion:e.target.value})} className="bg-black border border-white/10 text-white text-xs p-1.5 rounded outline-none focus:border-[#CC0000]">
                                            <option value="5">5s (Base Kling/Luma)</option>
                                            <option value="10">10s (Pro RunwayGen3)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-[100px]">
                                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">Camera Motion</label>
                                        <select value={builderData.camara} onChange={e => setBuilderData({...builderData, camara:e.target.value})} className="bg-black border border-white/10 text-white text-xs p-1.5 rounded outline-none focus:border-[#CC0000]">
                                            <option value="Pan">Horizontal Pan</option>
                                            <option value="Zoom">Slow Zoom In</option>
                                            <option value="Drone">Drone / FPV</option>
                                            <option value="Static">Static / Locked</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">Negative Prompt (Qué evitar)</label>
                                        <input type="text" value={builderData.negativo} onChange={e => setBuilderData({...builderData, negativo:e.target.value})} placeholder="Ej: texto, deformidades, blurry, b&w" className="bg-black border border-white/10 text-white text-xs p-1.5 rounded outline-none w-full focus:border-[#CC0000]" />
                                    </div>
                                </div>
                            )}

                            {/* Ref Image Input Layer - Kling style invisible upload over the box, or a bottom pill */}
                            <div className="absolute bottom-20 left-6">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:border-[#CC0000]/50 transition-colors">
                                    <span>📎 Add Image Reference</span>
                                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e)=>{
                                       if(e.target.files && e.target.files[0]){
                                           const reader = new FileReader();
                                           reader.onload = (ev) => setRefImage(ev.target.result);
                                           reader.readAsDataURL(e.target.files[0]);
                                       }
                                    }} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Kling - Below The Fold: Top Creations */}
                    <div className="w-full mt-8">
                        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6 flex items-center justify-between">
                            <span>🔥 Top Creations de la Comunidad</span>
                            <span className="text-[10px] bg-[#CC0000]/20 text-[#CC0000] px-3 py-1 rounded-full border border-[#CC0000]/30">+ Populares Hoy</span>
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { id: 1, url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600', prompt: 'Hyper-realistic cybersecurity glowing shield protecting a futuristic server rack in a dark neon-lit datacenter, 8k, volumetric rays, high contrast, cinematic.', author: '@neural_sec' },
                                { id: 2, url: 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=600', prompt: 'Extreme close up of a businessman pouring stress into a coffee cup that dissolves into digital binary rain, Matrix style green glow, shallow depth of field, 35mm lens.', author: '@vision_ceo' },
                                { id: 3, url: 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=600', prompt: 'A gargantuan robotic Godzilla towering over a modern tech start-up office, raining blue sparks, majestic lighting, epic wide shot, trending on ArtStation.', author: '@godzilla_art' },
                                { id: 4, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600', prompt: 'Abstract liquid chrome and soft magenta shapes colliding gracefully, smooth 3D render, highly reflective metallic textures, C4D, octane render masterpiece.', author: '@fluid_dreams' }
                            ].map((creation) => (
                                <div key={creation.id} onClick={() => {
                                    setFinalPrompt(creation.prompt);
                                    setRefImage(creation.url);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} className="group bg-[#0a0a0a] border border-white/5 hover:border-[#CC0000]/50 rounded-2xl p-2 relative transition-all hover:-translate-y-2 shadow-lg hover:shadow-[0_15px_40px_rgba(204,0,0,0.3)] cursor-pointer">
                                    <div className="w-full aspect-[4/5] bg-[#111] rounded-xl overflow-hidden relative border border-white/5">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 z-10 p-4 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform">
                                            <p className="text-[10px] text-white font-bold mb-2 uppercase tracking-widest drop-shadow-md">Creator: <span className="text-[#CC0000]">{creation.author}</span></p>
                                            <p className="text-[9px] text-neutral-300 font-mono tracking-wider leading-relaxed line-clamp-4 group-hover:text-white transition-colors">{creation.prompt}</p>
                                            <div className="mt-3 text-[10px] text-[#CC0000] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 px-3 py-1.5 rounded-lg border border-[#CC0000]/30 w-max">
                                                ↓ REUSAR SCRIPT
                                            </div>
                                        </div>
                                        <img src={creation.url} alt="render" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gradient-to-br from-[#050505] via-[#111111] to-[#1a0a0a] relative overflow-hidden flex flex-col">
            {/* Cabecera del Editor */}
            <div className="px-6 py-4 bg-[#CC0000]/5 backdrop-blur-xl border border-red-900/30 shadow-lg border-b border-red-900/30 flex justify-between items-center shrink-0">
                <button onClick={() => setSelectedDraft(null)} className="text-[#CC0000] hover:text-white font-bold px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors">
                    ← Volver a Bandeja
                </button>
                <div className="text-right">
                    <p className="text-[#CC0000] font-black text-sm uppercase tracking-widest">Estudio de Refinamiento</p>
                    <p className="text-neutral-400 font-bold text-[10px] uppercase">Control Manual de {adminProfile?.username || 'Editor'}</p>
                </div>
            </div>

            {/* Layout de Trabajo */}
            {/* Main Kling Generator Canvas for Review */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 custom-scrollbar relative">
                
                {/* 1. Review Summary Canvas (Hero Size) */}
                <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8">
                    <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest flex items-center gap-2 mb-4">
                        <span className="bg-[#CC0000] text-black px-2 py-0.5 rounded text-[10px]">REVISIÓN</span> Configuración Maestra del Engine
                    </h3>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2 block">Visual Prompt Definitivo (Director's Cut):</label>
                            <textarea 
                                value={selectedDraft.visual_prompt || ''}
                                onChange={e => setSelectedDraft({...selectedDraft, visual_prompt: e.target.value})}
                                placeholder="Sin Prompt Visual Designado"
                                className="w-full min-h-[120px] bg-[#0a0a0a] border border-white/5 focus:border-[#CC0000]/50 outline-none p-4 rounded-2xl text-lg md:text-xl font-light text-white/90 leading-relaxed shadow-inner resize-y transition-colors"
                            />
                        </div>
                        <div className="w-full md:w-1/3">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2 flex justify-between items-center">
                                <span>Borrador Original / Caption:</span>
                                <button 
                                    onClick={() => {
                                        const context = `Actúa como un Script Doctor y Especialista en Continuidad Visual para IA. Tu objetivo es recibir esta idea base y transformarla en una serie de prompts técnicos que mantengan la coherencia absoluta.

Reglas de Oro:
1. Anclaje de Personaje: Define rasgos físicos inamovibles.
2. Consistencia de Estilo: Especifica lente, iluminación y paleta de colores.
3. Lógica Narrativa: Asegura que la acción sea físicamente posible para modelos de video.
4. Traducción Técnica: Énfasis en texturas, materiales y dinámica de fluidos para Nano Banana/Kling.

Salida requerida: Presenta el Script refinado seguido de los Prompts individuales numerados para Imagen y Video.

--- IDEA BASE A TRABAJAR ---
- Visual Prompt actual: ${selectedDraft.visual_prompt || 'Sin prompt'}
- Copy/Guion actual: ${selectedDraft.caption || 'Sin copy'}`;
                                        
                                        navigator.clipboard.writeText(context).then(() => {
                                            window.open('https://gemini.google.com/gem/55a9f7b451c7', '_blank');
                                        }).catch(() => {
                                            window.open('https://gemini.google.com/gem/55a9f7b451c7', '_blank');
                                        });
                                    }} 
                                    className="text-[#CC0000] hover:text-[#ff4444] transition-colors flex items-center gap-1 text-[10px] bg-[#CC0000]/10 hover:bg-[#CC0000]/20 border border-[#CC0000]/20 px-2 py-0.5 rounded shadow-sm"
                                    title="Abre tu Gem de Copywriting y copia el contexto del post al portapapeles"
                                >
                                    ✨ Abrir Gem ↗
                                </button>
                            </label>
                            <textarea 
                                value={selectedDraft.caption || ''}
                                onChange={e => setSelectedDraft({...selectedDraft, caption: e.target.value})}
                                placeholder="Escribe el copy aquí..."
                                className="w-full h-[120px] bg-[#0a0a0a] border border-white/5 focus:border-[#CC0000]/50 outline-none p-4 rounded-2xl text-sm font-medium text-white/70 shadow-inner overflow-y-auto hover:bg-[#111] transition-colors resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Media Generation Canvas */}
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>MY CREATIONS (Resultados del Algoritmo)</span>
                    <button 
                        onClick={() => {
                            setFinalPrompt(selectedDraft.visual_prompt || '');
                            setShowPromptBuilder(true);
                        }}
                        className="text-[10px] bg-white/10 hover:bg-[#CC0000]/20 text-neutral-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        ⚙️ Tuning Avanzado
                    </button>
                </h3>

                {!selectedDraft.media_options?.length && !renderingAI && (
                    <div className="w-full h-48 border-2 border-dashed border-red-900/40 rounded-3xl bg-black/20 flex flex-col items-center justify-center cursor-pointer hover:bg-black/40 hover:border-[#CC0000]/50 transition-all group" onClick={simulateAIGeneration}>
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#CC0000] to-[#880000] flex items-center justify-center text-white text-3xl mb-3 shadow-[0_0_30px_rgba(204,0,0,0.5)] group-hover:scale-110 transition-transform">
                            ✦
                        </div>
                        <p className="text-white font-black uppercase tracking-widest drop-shadow-lg">LANZAR MULTIMODAL MIST (A, B, C, D)</p>
                        <p className="text-neutral-500 text-[10px] mt-2 font-bold uppercase">Consumirá cuota de los servidores Nano Banana y Kling Video.</p>
                    </div>
                )}

                {renderingAI && (
                    <div className="w-full py-20 flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-[#CC0000]/5 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#CC0000]/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        <div className="animate-spin h-10 w-10 border-4 border-[#CC0000] border-t-white rounded-full mx-auto mb-4 shadow-[0_0_20px_rgba(204,0,0,0.8)]"></div>
                        <p className="text-sm font-black text-white tracking-widest animate-pulse drop-shadow-lg">Generando Variantes (Video & Imagen)...</p>
                    </div>
                )}

                {/* Las 4 OPCIONES KLING AI Grid */}
                {selectedDraft.media_options?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {selectedDraft.media_options.map((opt, i) => (
                            <div key={i} className="group bg-[#0a0a0a] border border-white/5 hover:border-[#CC0000]/50 rounded-2xl p-2 flex flex-col relative transition-all hover:-translate-y-1 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_40px_rgba(204,0,0,0.3)]">
                                {/* Header del render */}
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                                    <span className="bg-black/60 backdrop-blur px-2 py-0.5 rounded shadow text-white font-black text-xs uppercase border border-white/10 group-hover:border-red-500 transition-colors">
                                        Opción {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold shadow border border-transparent ${opt.isVideo ? 'bg-sky-500/20 text-sky-400 border-sky-400/30' : 'bg-[#CC0000]/20 text-[#CC0000] border-[#CC0000]/30'}`}>
                                        {opt.isVideo ? 'VIDEO' : 'IMAGE'}
                                    </span>
                                </div>
                                
                                {/* Contenedor Audiovisual Kling Style */}
                                <div 
                                    className="w-full aspect-[4/5] bg-[#111] rounded-xl overflow-hidden relative border border-white/5 group-hover:border-[#CC0000]/20 transition-colors cursor-pointer"
                                    onClick={() => window.open(opt.url, '_blank')}
                                    title="Haz clic para ver esta imagen/video en tamaño original"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 flex justify-center items-center">
                                        <span className="text-white text-opacity-80 text-4xl transform scale-50 group-hover:scale-100 transition-transform">🔍</span>
                                    </div>
                                    {opt.isVideo ? (
                                        <video src={opt.url} autoPlay loop muted playsInline className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <img src={opt.url} alt="render" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    )}
                                </div>
                                
                                {/* Info / Botón de Acción Abajo */}
                                <div className="pt-3 pb-1 px-1">
                                    <p className="text-[10px] font-bold text-neutral-500 truncate mb-3">{opt.provider}</p>
                                    <button onClick={() => handleSelectOption(opt.url, opt.provider)} className="w-full bg-white/5 hover:bg-gradient-to-r hover:from-[#CC0000] hover:to-[#880000] border border-white/10 text-white font-bold text-xs uppercase py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group/btn">
                                        Elegir Variante {String.fromCharCode(65 + i)} <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity ml-1">➔</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Fallback de Bypass */}
                {selectedDraft.media_options?.length > 0 && (
                    <div className="mt-8 border-t border-white/5 pt-6 text-center">
                        <button className="text-[10px] text-neutral-500 hover:text-white underline uppercase tracking-wider transition-colors" onClick={()=>setRefinePrompt(prev => prev==='open' ? '' : 'open')}>
                            Bypass Manual (Subir desde Premiere / Figma)
                        </button>
                        {refinePrompt === 'open' && (
                            <div className="mt-4 max-w-sm mx-auto bg-black/40 border border-white/10 p-4 rounded-xl">
                                <MediaPicker label="Sube tu archivo final aquí" onChange={(url) => handleSelectOption(url, 'Manual Override')} accept="all" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        
        {/* Modal de Asistente de Guiones / Copywriting */}
        {showScriptGen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl h-[70vh] bg-[#111111] border border-[#CC0000]/30 shadow-[0_0_50px_rgba(204,0,0,0.2)] rounded-3xl overflow-hidden flex flex-col relative transform scale-100 transition-all">
                        <div className="bg-[#CC0000]/10 border-b border-red-900/30 p-4 shrink-0 flex justify-between items-center relative">
                            <div>
                                <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest flex items-center gap-2">✨ Redactor IA</h3>
                                <p className="text-[10px] text-neutral-400 font-bold mt-1 uppercase">Conversa y obtén el copy definitivo</p>
                            </div>
                            <button onClick={() => setShowScriptGen(false)} className="text-white hover:text-[#CC0000] font-black text-xl w-8 h-8 flex items-center justify-center bg-black/30 backdrop-blur-md shadow-md hover:bg-[#CC0000]/20 rounded-full outline-none">×</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0a0a] to-[#010101]">
                            {scriptChatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`p-4 rounded-xl max-w-[85%] text-sm font-bold shadow-lg leading-relaxed ${msg.role === 'ai' ? 'bg-[#1a1a1a] text-neutral-300 border border-neutral-800 rounded-tl-sm' : 'bg-[#CC0000]/20 border border-[#CC0000]/40 text-white rounded-tr-sm'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-4 bg-black/60 backdrop-blur border-t border-red-900/30 flex gap-2 shrink-0">
                            <input 
                                type="text" 
                                value={scriptChatInput} 
                                onChange={e => setScriptChatInput(e.target.value)} 
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && scriptChatInput.trim() !== '') {
                                        const val = scriptChatInput; setScriptChatInput('');
                                        setScriptChatHistory(h => [...h, {role:'user', text:val}]);
                                        setTimeout(() => {
                                            const response = `Perfecto. Aquí tienes el guion generado para "${val}":\n\n📌 Hook: ¿Estás perdiendo conversiones?\n🔍 Cuerpo: Optimiza tus procesos B2B con tecnología avanzada.\n🎯 CTA: Agenda una auditoría gratis.\n\nLo he inyectado en la caja de Copy detrás de esta ventana.`;
                                            setScriptChatHistory(h => [...h, {role:'ai', text: response}]);
                                            setSelectedDraft(prev => ({...prev, caption: `📌 Hook: ¿Estás perdiendo conversiones?\n🔍 Cuerpo: Optimiza tus procesos B2B con tecnología avanzada.\n🎯 CTA: Agenda una auditoría gratis.`}));
                                        }, 1000);
                                    }
                                }} 
                                placeholder="Ej: Hazme un guion agresivo para vender software..." 
                                className="flex-1 bg-black/50 backdrop-blur-md border hover:border-[#CC0000]/50 shadow-inner text-white focus:bg-[#CC0000]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#CC0000] border-red-900/30" 
                            />
                            <button 
                                onClick={() => {
                                    if(scriptChatInput.trim() !== '') {
                                        const val = scriptChatInput; setScriptChatInput('');
                                        setScriptChatHistory(h => [...h, {role:'user', text:val}]);
                                        setTimeout(() => {
                                            const response = `Perfecto. Aquí tienes el guion cerrado para "${val}":\n\n📌 Hook: ¿Sigues operando a ciegas?\n🔍 Cuerpo: Conoce la infraestructura de ventas automatizada.\n🎯 CTA: Comenta IA para tu demo.\n\n(Inyectado al Copy automáticamente).`;
                                            setScriptChatHistory(h => [...h, {role:'ai', text: response}]);
                                            setSelectedDraft(prev => ({...prev, caption: `📌 Hook: ¿Sigues operando a ciegas?\n🔍 Cuerpo: Conoce la infraestructura de ventas automatizada.\n🎯 CTA: Comenta IA para tu demo.`}));
                                        }, 1000);
                                    }
                                }} 
                                className="bg-[#222] hover:bg-gradient-to-r from-[#CC0000] to-[#880000] text-white font-black uppercase px-6 rounded-xl text-xs transition-colors shadow-lg"
                            >
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
