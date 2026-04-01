import React, { useState, useEffect } from 'react';
import MediaPicker from './MediaPicker';

export default function CockersStudio() {
    const [queue, setQueue] = useState([]);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [renderingAI, setRenderingAI] = useState(false);
    const [manualUrl, setManualUrl] = useState('');
    const [showPromptBuilder, setShowPromptBuilder] = useState(false);
    const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '¡Modo Creador Libre! Cuéntame tu idea cruda (ej. "Un monstruo tecnológico haciendo home office") y yo le agregaré vocabulario cinemático. ¡También puedes subir tu foto de referencia a la derecha y escribir el prompt por ti mismo!' }]);
    const [chatInput, setChatInput] = useState('');
    const [finalPrompt, setFinalPrompt] = useState('');
    const [refImage, setRefImage] = useState('');
    const [builderData, setBuilderData] = useState({ tema: '', estilo: '', luces: '' });

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

    const simulateAIGeneration = () => {
        setRenderingAI(true);
        // Simulando que Nano Banana y Kling devuelven resultados en 3 segundos
        setTimeout(() => {
            setQueue(q => q.map(post => {
                if(post.id === selectedDraft.id) {
                    return {
                        ...post,
                        media_options: [
                            { provider: 'Nano Banana (Google)', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80', isVideo: false },
                            { provider: 'Kling AI (Video)', url: 'https://www.w3schools.com/html/mov_bbb.mp4', isVideo: true }
                        ]
                    };
                }
                return post;
            }));
            setSelectedDraft(prev => ({
                ...prev,
                media_options: [
                    { provider: 'Nano Banana (Google)', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600', isVideo: false },
                    { provider: 'Kling AI (Video)', url: 'https://www.w3schools.com/html/mov_bbb.mp4', isVideo: true }
                ]
            }));
            setRenderingAI(false);
        }, 3000);
    };

    if (isLoading) return <div className="p-10 text-center text-sky-800/80 font-bold">Iniciando Estudio...</div>;

    if (!selectedDraft && !showPromptBuilder) {
        return (
            <div className="p-8 h-full bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-200 overflow-y-auto relative">
                {/* Aero Glare */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/60 blur-[100px] pointer-events-none"></div>

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                        <h2 className="text-4xl font-black text-sky-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] tracking-widest uppercase">Estudio Óptico</h2>
                        <p className="text-sky-900 font-bold text-sm mt-1 drop-shadow-sm">Duelo de Renderizados para Cockers (Diseño Final)</p>
                    </div>
                    <div className="text-right">
                        <span className="bg-white/30 text-sky-900 border border-white/50 backdrop-blur-md px-4 py-2 font-black rounded-xl shadow-lg text-xs">
                            Pendientes de Revisión: {queue.length}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {queue.map(post => (
                        <div key={post.id} className="bg-white/20 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-white/30 hover:scale-105 transition-all cursor-pointer" onClick={() => setSelectedDraft(post)}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-sky-900 text-xs font-black uppercase tracking-widest drop-shadow-sm">Post Generado por Gemini</h3>
                                <div className="h-3 w-3 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></div>
                            </div>
                            <p className="text-neutral-800 font-medium text-sm italic line-clamp-3 mb-6 bg-white/40 p-4 rounded-xl border border-white/30 shadow-inner">"{post.caption}"</p>
                            
                            <div className="w-full bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-sky-900 font-black py-3 px-4 rounded-2xl text-xs text-center transition-all shadow-[0_4px_15px_rgba(14,165,233,0.4)] border border-white/40">
                                Iniciar Duelo de Renderizado 🥊
                            </div>
                        </div>
                    ))}
                    {queue.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/50 bg-white/10 rounded-3xl backdrop-blur-sm">
                            <p className="text-sky-900 font-black text-sm drop-shadow-sm">No hay guiones nuevos del Cerebro hoy.</p>
                        </div>
                    )}
                    <div className="col-span-full mt-6 bg-white/20 backdrop-blur-2xl border border-white/60 p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] relative overflow-hidden">
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-cyan-300/40 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-sky-900 uppercase tracking-wider mb-2 drop-shadow-sm">Pausa Comercial: Modo Director de Arte</h3>
                                <p className="text-neutral-700 font-medium text-sm max-w-xl">La automatización la pusimos en pausa. Ahora puedes construir los Prompts manualmente respondiendo un par de preguntas y dándole imágenes de referencia a las IAs para que copien el estilo.</p>
                            </div>
                            <button onClick={() => setShowPromptBuilder(true)} className="mt-4 md:mt-0 bg-white/70 hover:bg-white text-sky-600 border border-white shadow-[0_8px_20px_rgba(255,255,255,0.5)] px-8 py-4 rounded-2xl font-black uppercase text-sm transition-all">
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
            <div className="p-8 h-full bg-gradient-to-br from-sky-300 via-cyan-100 to-emerald-200 relative overflow-y-auto flex flex-col items-center">
                <div className="w-full max-w-6xl flex flex-col min-h-[900px]">
                    <button onClick={() => setShowPromptBuilder(false)} className="text-sky-700 hover:text-sky-900 font-bold mb-4 self-start transition-colors">← Volver al Menú</button>
                    <h2 className="text-3xl font-black text-sky-900 uppercase tracking-widest mb-4">Chat Copiloto & Libertad Creativa</h2>
                    
                    <div className="flex-1 flex flex-col md:flex-row gap-6">
                        {/* Panel Izquierdo: Chat Integrado para mejorar ideas */}
                        <div className="w-full md:w-1/2 flex flex-col bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg border border-white/50 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="bg-white/60 backdrop-blur-md shadow-md hover:bg-white/80 border-b border-white/50 p-4">
                                <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest flex items-center gap-2">🤖 Asistente de Prompting</h3>
                                <p className="text-xs text-sky-800/80 font-bold mt-1">Chatea conmigo si tu idea está bloqueada. Yo te hago preguntas de color e iluminación para lograr renders perfectos en Nano/Kling.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-bold shadow-lg ${msg.role === 'ai' ? 'bg-neutral-800 text-sky-900 rounded-tl-sm' : 'bg-gradient-to-r from-sky-400 to-cyan-400/20 border border-[#CC0000]/50 text-sky-900 rounded-tr-sm'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-white/40 backdrop-blur border border-white/50 border-t border-white/50 flex gap-2">
                                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} 
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && chatInput.trim() !== '') {
                                            const val = chatInput; setChatInput('');
                                            setChatHistory(h => [...h, {role:'user', text:val}]);
                                            setTimeout(() => {
                                                setChatHistory(h => [...h, {role:'ai', text: `Entendido. "${val}" suena épico. ¿Te gustaría mantenerlo fotorealista (35mm), o buscamos algo más cyberpunk/abstracto con neones azules?` }]);
                                                setFinalPrompt(prev => prev ? prev + ', ' + val : val); // Auto append to prompt
                                            }, 800);
                                        }
                                    }} 
                                    placeholder="Habla con la IA aquí o arroja tu idea cruda..." className="flex-1 bg-white/60 backdrop-blur-md shadow-md hover:bg-white/80 rounded-xl px-4 py-3 text-sm text-sky-900 focus:outline-none focus:border-[#CC0000] border border-white/50" />
                                <button onClick={() => {
                                    if(chatInput.trim() !== '') {
                                        const val = chatInput; setChatInput('');
                                        setChatHistory(h => [...h, {role:'user', text:val}]);
                                        setTimeout(() => { setChatHistory(h => [...h, {role:'ai', text: `¡Genial! Lo he integrado a tu caja de Prompt a la derecha. ¿Qué lente de cámara le ponemos?`}]); setFinalPrompt(prev => prev ? prev + ', ' + val : val); }, 800);
                                    }
                                }} className="bg-neutral-800 hover:bg-gradient-to-r from-sky-400 to-cyan-400 text-sky-900 font-black uppercase px-6 rounded-xl text-xs transition-colors shadow-lg">Enviar</button>
                            </div>
                        </div>

                        {/* Panel Derecho: Total Control Manual & Ref Image */}
                        <div className="w-full md:w-1/2 flex flex-col space-y-4">
                            
                            {/* Filtros Estructurales */}
                            <div className="bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg p-5 rounded-2xl border border-white/50 shadow-2xl">
                                <h3 className="text-sky-900 font-black uppercase text-xs tracking-widest mb-3">🎛️ Filtros Clásicos (Estructurador)</h3>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <input placeholder="Tema..." value={builderData.tema} onChange={(e)=>setBuilderData({...builderData, tema:e.target.value})} className="bg-white/50 backdrop-blur-md border border-white/60 shadow-inner text-sky-900 focus:bg-white rounded-lg p-2 text-xs text-sky-900 focus:border-[#CC0000] outline-none" />
                                    <input placeholder="Estilo (Ej: 35mm)" value={builderData.estilo} onChange={(e)=>setBuilderData({...builderData, estilo:e.target.value})} className="bg-white/50 backdrop-blur-md border border-white/60 shadow-inner text-sky-900 focus:bg-white rounded-lg p-2 text-xs text-sky-900 focus:border-[#CC0000] outline-none" />
                                    <input placeholder="Luces (Ej: Neón)" value={builderData.luces} onChange={(e)=>setBuilderData({...builderData, luces:e.target.value})} className="bg-white/50 backdrop-blur-md border border-white/60 shadow-inner text-sky-900 focus:bg-white rounded-lg p-2 text-xs text-sky-900 focus:border-[#CC0000] outline-none" />
                                </div>
                                <button onClick={() => {
                                    const combined = `[Theme: ${builderData.tema}] [Style: ${builderData.estilo}] [Lighting: ${builderData.luces}]`.trim();
                                    setFinalPrompt(prev => prev ? prev + ', ' + combined : combined);
                                }} className="w-full bg-white/60 backdrop-blur-md shadow-md hover:bg-white/80 hover:bg-gradient-to-r from-sky-400 to-cyan-400 text-sky-700 hover:text-sky-900 font-black text-[10px] uppercase py-3 rounded-lg transition-colors border border-white/50 hover:border-[#CC0000] shadow-sm">
                                    Inyectar a la caja de Prompt Definitivo ↓
                                </button>
                            </div>

                            <div className="bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg p-6 rounded-2xl border border-white/50 shadow-2xl flex-1 flex flex-col min-h-[300px]">
                                <div className="flex justify-between items-end mb-2">
                                    <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest flex items-center gap-2">📝 1. Tu Prompt Definitivo</h3>
                                </div>
                                <p className="text-sky-800/80 text-[10px] uppercase font-bold mb-4">Ingresa el código en inglés exacto que irá a los servidores Nano y Kling.</p>
                                
                                <div className="mb-4">
                                    <h4 className="text-[10px] text-sky-900 font-black uppercase tracking-widest bg-gradient-to-r from-sky-400 to-cyan-400 inline-block px-2 py-0.5 rounded mb-2">🔥 Trends del Día en la Red</h4>
                                    <div className="flex flex-col gap-2">
                                        {dailyTrendingPrompts.map((p, i) => (
                                            <button key={i} onClick={() => setFinalPrompt(p)} className="text-left text-[10px] bg-white/60 backdrop-blur-md shadow-md hover:bg-white/80 border border-white/50 hover:border-[#CC0000] text-sky-700 hover:text-sky-900 p-2 text-ellipsis overflow-hidden whitespace-nowrap rounded font-mono transition-colors">
                                                {p.substring(0, 70)}...
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea value={finalPrompt} onChange={e=>setFinalPrompt(e.target.value)} placeholder="Escribe tu prompt director's cut... o clic a un Trend arriba para inyectarlo." className="w-full flex-1 bg-white/50 backdrop-blur-md border border-white/60 shadow-inner text-sky-900 focus:bg-white rounded-xl p-4 text-sky-900 text-sm focus:border-[#CC0000] outline-none resize-none shadow-inner leading-relaxed" />
                            </div>

                            <div className="bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg p-6 rounded-2xl border border-white/50 shadow-2xl">
                                <h3 className="text-sky-900 font-black uppercase text-sm tracking-widest mb-2 flex items-center gap-2">🖼️ 2. Foto de Referencia (Upload Libre)</h3>
                                <p className="text-sky-800/80 text-[10px] uppercase font-bold mb-4">Kling y Nano usarán la silueta e iluminación de esta imagen. Opcional.</p>
                                <div className="border border-dashed border-neutral-700 bg-white/40 backdrop-blur border border-white/50 p-4 rounded-xl hover:border-[#CC0000]/50 transition-colors">
                                    <MediaPicker label="Adjuntar Base Visual (Style Match)" value={refImage} onChange={setRefImage} accept="image/*,video/*" />
                                </div>
                            </div>

                            <button onClick={() => {
                                const newPost = { id: Date.now(), status: 'cockers_review', scheduled_for: new Date(Date.now() + 86400000).toISOString(), caption: '🔥🔥 [Borrador AI Autónomo]\\n\\n(Este post nació de una intervención manual y creativa de Cockers en el Asistente)', visual_prompt: finalPrompt || 'Cinematic corporate scene', reference_image: refImage, media_options: [] };
                                setSelectedDraft(newPost);
                                setShowPromptBuilder(false);
                            }} className="w-full bg-gradient-to-r from-sky-400 to-cyan-400 text-sky-900 hover:bg-red-600 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(204,0,0,0.3)] mt-auto hover:scale-[1.02]">
                                Enviar a Renderizar ➔
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gradient-to-br from-sky-300 via-cyan-100 to-emerald-200 relative overflow-hidden flex flex-col">
            {/* Cabecera del Editor */}
            <div className="px-6 py-4 bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg border-b border-white/50 flex justify-between items-center shrink-0">
                <button onClick={() => setSelectedDraft(null)} className="text-sky-700 hover:text-sky-900 font-bold px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors">
                    ← Volver a Bandeja
                </button>
                <div className="text-right">
                    <p className="text-[#CC0000] font-black text-sm uppercase tracking-widest">Estudio de Refinamiento</p>
                    <p className="text-sky-800/80 font-bold text-[10px] uppercase">Control Manual de Cockers</p>
                </div>
            </div>

            {/* Layout de Trabajo */}
            <div className="flex-1 flex overflow-hidden">
                {/* Panel Izquierdo: Copy & Prompt */}
                <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-white/50 bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg p-6 overflow-y-auto space-y-6">
                    <div>
                        <h4 className="text-xs font-black text-sky-800/80 uppercase tracking-widest mb-2">1. Guión Creado (Copy)</h4>
                        <div className="bg-white/50 backdrop-blur-md border border-white/60 shadow-inner text-sky-900 focus:bg-white p-4 rounded-xl text-sm text-sky-900 whitespace-pre-line leading-relaxed">
                            {selectedDraft.caption}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-sky-800 uppercase tracking-widest mb-2 drop-shadow-sm">2. Instrucción a Visuales</h4>
                        <div className="bg-white/60 backdrop-blur-md border border-white/60 p-3 rounded-2xl text-[11px] font-mono text-cyan-800 font-bold break-words leading-tight shadow-inner">
                            {selectedDraft.visual_prompt}
                        </div>
                    </div>

                    {selectedDraft.reference_image && (
                        <div>
                            <h4 className="text-xs font-black text-sky-800 uppercase tracking-widest mb-2 drop-shadow-sm">📂 Imagen de Referencia Atada</h4>
                            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-2 rounded-2xl shadow-inner">
                                <img src={selectedDraft.reference_image} alt="Referencia" className="w-full h-32 object-cover rounded-xl" />
                            </div>
                        </div>
                    )}

                    {!selectedDraft.media_options?.length && !renderingAI && (
                        <button onClick={simulateAIGeneration} className="w-full bg-gradient-to-r from-sky-400 to-blue-400 hover:from-sky-300 hover:to-blue-300 border border-white text-sky-900 font-black py-4 rounded-2xl shadow-[0_4px_20px_rgba(56,189,248,0.5)] transition-all">
                            💥 Lanzar Prompt a Nano Banana & Kling
                        </button>
                    )}

                    {renderingAI && (
                        <div className="text-center py-6 border-2 border-dashed border-white/60 rounded-2xl bg-white/30 backdrop-blur-sm">
                            <div className="animate-spin h-6 w-6 border-4 border-sky-400 border-t-white rounded-full mx-auto mb-3 shadow-md"></div>
                            <p className="text-xs font-black text-sky-700 animate-pulse drop-shadow-sm">Mandando Prompt a Nano Banana & Kling...</p>
                        </div>
                    )}
                </div>

                {/* Panel Derecho: Área de A/B Testing & Bypass Manual */}
                <div className="flex-1 bg-white/10 backdrop-blur-sm p-6 overflow-y-auto">
                    <h3 className="text-sm font-black text-sky-900 tracking-widest uppercase mb-6 flex items-center gap-2">
                        <span>3. Resultados Multimodales</span> 
                        <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-sky-700">Elige 1 para enviar a Judith</span>
                    </h3>

                    {/* Las Dos Opciones IAs */}
                    {selectedDraft.media_options?.length > 0 && (
                        <div className="grid grid-cols-2 gap-6 mb-10">
                            {selectedDraft.media_options.map((opt, i) => (
                                <div key={i} className="bg-white/30 backdrop-blur-xl border border-white/50 shadow-lg border border-white/50 rounded-2xl p-4 flex flex-col group hover:border-[#CC0000]/50 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs font-black text-sky-900 uppercase tracking-wider">Opción {i+1}</p>
                                        <span className="text-[10px] bg-neutral-800 text-sky-700 px-2 py-1 rounded font-bold">{opt.provider}</span>
                                    </div>
                                    <div className="flex-1 bg-white/40 backdrop-blur border border-white/50 rounded-xl overflow-hidden border border-neutral-900 min-h-[250px] relative group-hover:border-[#CC0000]/30 transition-colors">
                                        {opt.isVideo ? (
                                            <video src={opt.url} autoPlay loop muted controls playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <img src={opt.url} alt="opción" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                    <button onClick={() => handleSelectOption(opt.url, opt.provider)} className="mt-4 w-full bg-neutral-800 hover:bg-gradient-to-r from-sky-400 to-cyan-400 text-sky-900 text-xs font-black py-3 rounded-xl transition-all hov">
                                        Aprobar y Mandar al Calendario ➔
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedDraft.media_options?.length > 0 && (
                        <div className="mb-10 bg-white/60 backdrop-blur-md shadow-md hover:bg-white/80 border border-white/50 rounded-2xl p-5">
                            <p className="text-xs font-bold text-sky-700 mb-2">💬 ¿No te gusta ninguna? Refínalas con orden jerárquica:</p>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Ej: Haz que la luz sea más roja estilo Godzilla..." className="flex-1 bg-white/40 backdrop-blur border border-white/50 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-sky-900 focus:border-red-500 outline-none" />
                                <button className="bg-blue-600 hover:bg-blue-500 text-sky-900 font-bold px-6 rounded-xl text-xs transition-colors">Mejorar Prompt ↻</button>
                            </div>
                        </div>
                    )}

                    {/* El Escape Manual */}
                    <div className="border-t border-white/50 pt-8 mt-auto">
                        <div className="bg-gradient-to-r from-sky-400 to-cyan-400/5 border border-[#CC0000]/20 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-sky-400 to-cyan-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <h4 className="text-[#CC0000] text-sm font-black uppercase tracking-widest mb-1">BYPASS MANUAL (Override de IA)</h4>
                            <p className="text-sky-800/80 text-xs font-bold mb-5">Si las IAs no captaron la visión de Godzilla, sube tu propio montaje magistral desde Premiere o Figma. Reemplazará los motores visuales automáticamente abajo el mismo Guión.</p>
                            
                            <MediaPicker 
                                label="Subir Variante Maestra Definitiva" 
                                value={manualUrl} 
                                onChange={(url) => setManualUrl(url)} 
                                accept="all" 
                            />

                            {manualUrl && (
                                <button onClick={() => handleSelectOption(manualUrl, 'Cockers Human Override')} className="mt-5 w-full bg-gradient-to-r from-sky-400 to-cyan-400 hover:bg-red-600 text-sky-900 font-black py-4 rounded-xl shadow-[0_5px_20px_rgba(204,0,0,0.4)] transition-all">
                                    APROBAR MI VERSIÓN Y MANDARLA A LA CM ➔
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
