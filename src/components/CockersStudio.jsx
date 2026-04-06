import React, { useState, useEffect } from 'react';
import MediaPicker from './MediaPicker';

export default function CockersStudio({ adminProfile }) {
    const [queue, setQueue] = useState([]);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [renderingAI, setRenderingAI] = useState(false);
    
    // UI States para el Generador Profesional
    const [credits, setCredits] = useState(250); // Saldo Ficticio Inicial Cuentas Plus
    const [genMode, setGenMode] = useState('video'); // 'imagen' | 'video'
    const [activeTab, setActiveTab] = useState('Fotogramas'); // 'Fotogramas' | 'Ingredientes'
    
    // Auth & Roles
    const isCockers = adminProfile?.role === 'cockers' || adminProfile?.username?.toLowerCase() === 'alex' || adminProfile?.username?.toLowerCase() === 'cockers';
    
    // States del Redactor IA (Asistente Copywriting)
    const [showScriptGen, setShowScriptGen] = useState(false);
    const [scriptChatHistory, setScriptChatHistory] = useState([
        { role: 'ai', text: '¡Hola Director! ¿Qué necesitas que escriba o corrija de este post?' }
    ]);
    const [scriptChatInput, setScriptChatInput] = useState('');
    
    // Configuración AI
    const [finalPrompt, setFinalPrompt] = useState('');
    const [refImage, setRefImage] = useState('');
    const [builderData, setBuilderData] = useState({ 
        model: 'Veo 3.1 - Fast',
        aspect_ratio: '16:9',
        duracion: 'x1',
        negativo: ''
    });

    const elitePrompts = [
        "Cinematic FPV drone shot, flying through a hyper-realistic neo-tokyo corporate office at midnight...",
        "Extreme macro close-up of a glowing glowing server rack cable snapping, sparks flying in explosive super slow motion..."
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
                if (data.posts.length === 0) {
                    setQueue([{
                        id: 999,
                        status: 'cockers_review',
                        scheduled_for: '2026-04-05T10:00:00Z',
                        caption: '🚀 El boca a boca no te va a pagar la nómina...',
                        visual_prompt: 'Cinematic 35mm wide shot, modern corporate office...',
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

    const handleAction = async (opt, actionType) => {
        let msg = '';
        let newStatus = '';
        if (actionType === 'review') {
            msg = `¿Enviar ${opt.provider} a revisión al Jefe/CM?`;
            newStatus = 'pending_cm_approval';
        } else if (actionType === 'approve') {
            msg = `¿Aprobar renderizado de ${opt.provider} y enviarlo al Calendario?`;
            newStatus = 'approved';
        } else if (actionType === 'reject') {
            msg = `¿Devolver este contenido a Cockers (Alex) para corrección?`;
            newStatus = 'rejected';
        }

        if (!window.confirm(msg)) return;
        
        try {
            const token = localStorage.getItem('adminToken');
            if (selectedDraft.id === 999) {
                // Modo prototipo
                alert(`✅ Acción simulada: Contenido marcado como ${newStatus}.`);
                setQueue(q => q.filter(p => p.id !== selectedDraft.id));
                setSelectedDraft(null);
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/social/approve-media`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    id: selectedDraft.id,
                    selected_media_url: opt.url,
                    status: newStatus
                })
            });
            
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Fallo API');

            alert(`✅ Exito: El contenido se movió a estado: ${newStatus}.`);
            setQueue(q => q.filter(p => p.id !== selectedDraft.id));
            setSelectedDraft(null);
        } catch (error) {
            console.error(error);
            alert(`⚠️ Error al procesar: ${error.message}`);
        }
    };

    const simulateAIGeneration = async () => {
        setRenderingAI(true);
        try {
            const rawPrompt = finalPrompt || selectedDraft?.visual_prompt || 'cyberpunk cinematic city';
            const cleanPrompt = rawPrompt.replace(/\[\/?.*?]/g, '').trim();
            const token = localStorage.getItem('adminToken');

            const response = await fetch('/api/studio/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ prompt: cleanPrompt, config: builderData, engine: builderData.model })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al lanzar Job a Kling API');

            if (data.status === 'processing' && data.job_id) {
                let attempts = 0;
                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const statusRes = await fetch(`/api/studio/status/${data.job_id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const statusData = await statusRes.json();
                        
                        if (statusData.status === 'succeed') {
                            clearInterval(pollInterval);
                            let options = [];
                            if (genMode === 'imagen') {
                                options = [
                                    { provider: 'Nano Banana 2 (Mejor Opción)', url: statusData.result_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80', isVideo: false },
                                    { provider: 'Kling 3.0 HD (Contrapropuesta)', url: statusData.result_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80', isVideo: false },
                                ];
                            } else {
                                options = [
                                    { provider: 'Kling 3.0 HD (Motor Principal)', url: statusData.result_url || 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc', isVideo: true },
                                    { provider: 'Luma Flow (Alternativa)', url: statusData.result_url || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80', isVideo: true },
                                ];
                            }
                            if (selectedDraft) {
                                setQueue(q => q.map(post => post.id === selectedDraft.id ? { ...post, media_options: options } : post));
                                setSelectedDraft(prev => ({ ...prev, media_options: options }));
                            }
                            setRenderingAI(false);
                        } else if (statusData.status === 'failed' || attempts > 30) {
                            clearInterval(pollInterval);
                            throw new Error('API Task Failed o Timeout');
                        }
                    } catch (pollErr) {
                        clearInterval(pollInterval);
                        console.error(pollErr);
                        alert(`Error en Polling: ${pollErr.message}`);
                        setRenderingAI(false);
                    }
                }, 10000); 
            } else {
                setRenderingAI(false);
            }
        } catch (error) {
            console.error('Error Live Gen', error);
            alert(`Error de Live Mode: ${error.message}`);
            setRenderingAI(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center text-neutral-400 font-bold flex items-center justify-center h-full">Iniciando Estudio IA...</div>;

    // Componente de Botón de Aspect Ratio (inspirado en la referencia)
    const AspectRatioButton = ({ ratio, label, active }) => (
        <button 
            onClick={() => setBuilderData({...builderData, aspect_ratio: label})}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-[60px] h-[60px] ${active ? 'bg-neutral-800 border-neutral-600' : 'bg-transparent hover:bg-neutral-900 border-transparent text-neutral-400'} border`}
        >
            <div className={`mb-1 border-2 border-current rounded-sm ${label === '16:9' ? 'w-6 h-3.5' : label === '9:16' ? 'w-3.5 h-6' : label === '1:1' ? 'w-5 h-5' : label === '4:3' ? 'w-5 h-4' : 'w-4 h-5'}`}></div>
            <span className="text-[10px] font-bold mt-1">{label}</span>
        </button>
    );

    const MultiplierButton = ({ label, active }) => (
        <button 
            onClick={() => setBuilderData({...builderData, duracion: label})}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${active ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex h-full bg-[#0a0a09] text-white overflow-hidden relative">
            
            {/* LEFT SIDEBAR: Panel de Parámetros (Estilo Kling / Flow) */}
            <div className="w-[380px] bg-[#0f0f0e] border-r border-[#222] flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar z-20">
                
                {/* Header Toggle (Imagen | Video) */}
                <div className="p-4 pt-6 shrink-0 flex items-center justify-center">
                    <div className="bg-[#1a1a19] p-1 rounded-[20px] flex items-center gap-1 w-full relative">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#2a2a29] rounded-[16px] transition-all duration-300 ease-in-out ${genMode === 'video' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} 
                        />
                        <button 
                            onClick={() => setGenMode('imagen')} 
                            className={`flex-1 py-2.5 text-sm font-bold relative z-10 flex items-center justify-center gap-2 transition-colors ${genMode === 'imagen' ? 'text-white' : 'text-neutral-400'}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            Imagen
                        </button>
                        <button 
                            onClick={() => setGenMode('video')} 
                            className={`flex-1 py-2.5 text-sm font-bold relative z-10 flex items-center justify-center gap-2 transition-colors ${genMode === 'video' ? 'text-white' : 'text-neutral-400'}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                            Video
                        </button>
                    </div>
                </div>

                {/* Área de Prompt */}
                <div className="px-5 py-2 flex flex-col flex-1 shrink-0">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2">Prompt</p>
                    <textarea 
                        value={finalPrompt} 
                        onChange={e => setFinalPrompt(e.target.value)} 
                        placeholder={genMode === 'video' ? "¿Qué quieres animar o crear hoy?" : "Describe la imagen perfecta..."}
                        className="w-full h-[140px] bg-transparent border-none text-white/90 focus:ring-0 p-0 text-md font-light placeholder-neutral-600 outline-none resize-none leading-relaxed"
                    />
                    
                    {/* Floating Settings Widget (Estilo Luma Dream Machine) */}
                    <div className="bg-[#141413] border border-neutral-800 rounded-3xl p-4 mt-4 shadow-2xl relative overflow-hidden group">
                        
                        {/* Selector Interno (Fotogramas vs Ingredientes) */}
                        <div className="flex bg-[#222221] rounded-full p-1 mb-4">
                            <button onClick={()=>setActiveTab('Fotogramas')} className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-colors ${activeTab==='Fotogramas' ? 'bg-[#3a3a39] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
                                🖼 Fotogramas
                            </button>
                            <button onClick={()=>setActiveTab('Ingredientes')} className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-colors ${activeTab==='Ingredientes' ? 'bg-[#3a3a39] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
                                🧩 Ingredientes
                            </button>
                        </div>

                        {/* Aspect Ratios & Durations */}
                        {activeTab === 'Fotogramas' ? (
                            <>
                                <div className="flex items-center justify-between gap-1 mb-4">
                                    <AspectRatioButton label="16:9" active={builderData.aspect_ratio === '16:9'} />
                                    <AspectRatioButton label="4:3" active={builderData.aspect_ratio === '4:3'} />
                                    <AspectRatioButton label="1:1" active={builderData.aspect_ratio === '1:1'} />
                                    <AspectRatioButton label="3:4" active={builderData.aspect_ratio === '3:4'} />
                                    <AspectRatioButton label="9:16" active={builderData.aspect_ratio === '9:16'} />
                                </div>
                                
                                {genMode === 'video' && (
                                    <div className="flex bg-[#1a1a19] rounded-full p-1 mb-4">
                                        <MultiplierButton label="x1" active={builderData.duracion === 'x1'} />
                                        <MultiplierButton label="x2" active={builderData.duracion === 'x2'} />
                                        <MultiplierButton label="x3" active={builderData.duracion === 'x3'} />
                                        <MultiplierButton label="x4" active={builderData.duracion === 'x4'} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center flex-col justify-center h-[120px] mb-4 border-2 border-dashed border-neutral-800 rounded-2xl hover:border-neutral-600 transition-colors cursor-pointer relative">
                                <span className="text-2xl mb-1">Upload</span>
                                <span className="text-xs text-neutral-500 font-bold uppercase">Sube una imagen de referencia</span>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,video/*" onChange={(e)=>{
                                       if(e.target.files && e.target.files[0]){
                                           const reader = new FileReader();
                                           reader.onload = (ev) => setRefImage(ev.target.result);
                                           reader.readAsDataURL(e.target.files[0]);
                                           setActiveTab('Fotogramas');
                                       }
                                }}/>
                            </div>
                        )}

                        {/* Dropdown de Modelo */}
                        <div className="relative group/model">
                            <select 
                                value={builderData.model} 
                                onChange={e => setBuilderData({...builderData, model: e.target.value})}
                                className="w-full appearance-none bg-[#111110] border border-neutral-800 hover:border-neutral-600 outline-none text-sm font-bold text-white rounded-2xl p-4 pr-10 cursor-pointer shadow-inner transition-colors"
                            >
                                <option value="Gemini Advanced">✨ Gemini Advanced (Cuenta Plus)</option>
                                <option value="Nano Banana 2">🍌 Nano Banana 2 (0 CR)</option>
                                <option value="Veo 3.1 - Fast">🚀 Veo 3.1 - Fast (5 CR)</option>
                                <option value="Kling 3.0">🎬 Kling 3.0 HD (20 CR)</option>
                                <option value="Midjourney V6">🌌 Midjourney V6 (8 CR)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
                        </div>
                        
                        {/* Cost Indicator && Balance */}
                        <div className="text-center mt-5 mb-1 flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-neutral-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-bold text-neutral-300">Wallet: <span className="text-white">{credits}</span> CR</span>
                            </div>
                            <span className="text-[10px] font-bold text-neutral-600">
                                Consumo: <span className={builderData.model.includes('Nano') ? "text-sky-400" : "text-[#CC0000]"}>
                                    {builderData.model.includes('Nano') ? 'Gratis' : builderData.model.includes('Kling') ? '-20 CR' : builderData.model.includes('Veo') ? '-5 CR' : '-8 CR'}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer del Sidebar (Boton Prominente e Info) */}
                <div className="p-4 border-t border-[#222] bg-[#0a0a09] shrink-0">
                    <button 
                        onClick={() => {
                            const cost = builderData.model.includes('Nano') ? 0 : builderData.model.includes('Kling') ? 20 : builderData.model.includes('Veo') ? 5 : 8;
                            if (credits < cost) {
                                alert('⚠️ Saldo insuficiente para ejecutar la generacion en los servidores elegidos.');
                                return;
                            }
                            setCredits(prev => prev - cost);
                            simulateAIGeneration();
                        }}
                        disabled={renderingAI || !finalPrompt.trim()}
                        className="w-full bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-widest text-sm py-4 rounded-full flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                    >
                        {renderingAI ? 'PROCESANDO...' : (selectedDraft?.media_options?.length > 0 ? 'RE-GENERAR VARIANTES' : 'GENERAR →')}
                        {selectedDraft?.media_options?.length > 0 && !renderingAI && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#CC0000]/10 backdrop-blur-md p-2 text-[9px] text-[#CC0000] border border-[#CC0000]/50 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                                Tip: Edita el prompt y forzarás la re-creación quemando saldo.
                            </span>
                        )}
                    </button>
                    {refImage && (
                        <div className="mt-4 flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-2 px-3">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase truncate max-w-[200px]">Ref Image attached</span>
                            <img src={refImage} className="w-6 h-6 rounded-md object-cover border border-neutral-700" alt="ref" />
                            <button onClick={()=>setRefImage('')} className="text-neutral-500 hover:text-[#CC0000] text-lg font-black ml-2 mb-1">×</button>
                        </div>
                    )}
                    </div>
                </div>

                {/* Modal de Asistente de Guiones / Copywriting (Shared) */}
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
                                                if(setSelectedDraft) {
                                                    setSelectedDraft(prev => prev ? {...prev, caption: `📌 Hook: ¿Estás perdiendo conversiones?\n🔍 Cuerpo: Optimiza tus procesos B2B con tecnología avanzada.\n🎯 CTA: Agenda una auditoría gratis.`} : prev);
                                                }
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
                                                if(setSelectedDraft) {
                                                    setSelectedDraft(prev => prev ? {...prev, caption: `📌 Hook: ¿Sigues operando a ciegas?\n🔍 Cuerpo: Conoce la infraestructura de ventas automatizada.\n🎯 CTA: Comenta IA para tu demo.`} : prev);
                                                }
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

            {/* RIGHT MAIN CANVAS: Resultados y Feed (Estilo Kling) */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-auto custom-scrollbar">
                
                {/* Cabecera del Lienzo */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-[#000000cc] to-transparent">
                    <h2 className="text-xl font-bold tracking-tight text-neutral-300">
                        {renderingAI ? (
                            <span className="flex items-center gap-2 animate-pulse"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Engine Working</span>
                        ) : 'Lienzo de Creación'}
                    </h2>
                    
                    {/* Boton para abrir la bandeja original (Opcional) */}
                    <button onClick={() => setSelectedDraft(queue[0])} className="text-xs font-bold text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-full transition-colors flex items-center gap-2 bg-[#111]">
                        📋 Scripts Pendientes ({queue.length})
                    </button>
                </div>

                {/* Si no hay drafts ni generación, Mostramos el Splash principal */}
                {!renderingAI && (!selectedDraft || !selectedDraft.media_options?.length) && (
                    <div className="flex flex-col items-center text-center opacity-40">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        <h1 className="text-2xl font-bold tracking-wider mb-2">Awaiting Instructions</h1>
                        <p className="text-sm font-light max-w-sm">Type your prompt on the left or select a pending script to summon the AI engines.</p>
                    </div>
                )}

                {renderingAI && (
                    <div className="flex flex-col items-center justify-center p-12 bg-neutral-900/50 rounded-3xl border border-neutral-800 shadow-2xl backdrop-blur-md">
                        <div className="w-16 h-16 border-4 border-neutral-700 border-t-white rounded-full animate-spin mb-6"></div>
                        <p className="text-lg font-bold text-white tracking-widest">{builderData.model} is rendering...</p>
                        <p className="text-xs text-neutral-500 mt-2">Patience, director.</p>
                    </div>
                )}

                {/* Resultados: Opciones Renderizadas */}
                {selectedDraft && selectedDraft.media_options?.length > 0 && !renderingAI && (
                    <div className="absolute inset-0 p-8 pt-24 overflow-auto custom-scrollbar">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-bold text-lg flex items-center gap-3">
                                    ✨ Generations Ready 
                                    <span className="bg-neutral-800 text-xs px-2 py-0.5 rounded text-neutral-400">{selectedDraft.media_options.length} files</span>
                                </h3>
                                <button 
                                    onClick={() => simulateAIGeneration()}
                                    className="bg-[#CC0000]/20 hover:bg-[#CC0000]/40 text-[#CC0000] border border-[#CC0000]/50 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg hover:shadow-[#CC0000]/20"
                                    title="Modifica el prompt a la izquierda y pulsa aquí para recrear"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                                    Re-crear (Mejorar Prompt)
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {selectedDraft.media_options.map((opt, i) => (
                                    <div key={i} className="group bg-[#0a0a0a] border border-neutral-800 hover:border-neutral-600 rounded-3xl p-3 flex flex-col relative transition-all shadow-xl">
                                        
                                        <div className="absolute top-5 left-5 z-20 flex gap-2">
                                            <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full shadow text-white font-bold text-[10px] tracking-wider uppercase border border-white/10 group-hover:border-white/30 transition-colors">
                                                {opt.isVideo ? 'VIDEO' : 'IMAGE'}
                                            </span>
                                            <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full shadow text-neutral-400 font-bold text-[10px] uppercase border border-white/10">
                                                {builderData.aspect_ratio}
                                            </span>
                                        </div>
                                        
                                        <div 
                                            className="w-full aspect-video bg-[#111] rounded-2xl overflow-hidden relative cursor-pointer"
                                            onClick={() => window.open(opt.url, '_blank')}
                                        >
                                            {opt.isVideo ? (
                                                <div className="w-full h-full relative group/vid overflow-hidden">
                                                    <img src={opt.url} alt="video mock" className="w-full h-full object-cover transform scale-105 group-hover/vid:scale-110 group-hover/vid:-translate-x-2 transition-all duration-[5000ms] ease-in-out" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={opt.url} alt="render" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            )}
                                        </div>
                                        
                                        <div className="mt-4 px-2 flex justify-between items-center bg-[#0a0a0a]">
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-500 mb-1">{opt.provider}</p>
                                                <p className="text-xs text-white truncate max-w-[140px] md:max-w-[180px]">{finalPrompt || selectedDraft.visual_prompt || 'Generación AI'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={opt.url} 
                                                    download={`Media_Export_${i+1}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white transition-colors border border-neutral-600"
                                                    title="Descargar Asset a tu PC"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                </a>
                                                
                                                {isCockers ? (
                                                    <button onClick={() => handleAction(opt, 'review')} className="bg-[#CC0000] hover:bg-red-800 text-white font-bold text-[9px] uppercase tracking-wider px-4 py-2 rounded-full shadow-[0_0_10px_rgba(204,0,0,0.4)] transition-transform active:scale-95">
                                                        Enviar a Revisión
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => handleAction(opt, 'reject')} className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-2 rounded-full transition-colors flex items-center" title="Devolver a Cockers">
                                                            ↩️ 
                                                        </button>
                                                        <button onClick={() => handleAction(opt, 'approve')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-wider px-4 py-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-transform active:scale-95">
                                                            Aprobar ✔️
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Panel: Mejorar y Regenerar (Goyi Learning Flow) */}
                            <div className="mt-8 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-[#CC0000]/20 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                                <label className="text-xs font-bold text-neutral-400 flex items-center gap-2 mb-3 tracking-wide">
                                    <span className="text-yellow-500 text-lg">💡</span> ¿Las IAs no captaron la visión? Mejora el prompt, dale otra oportunidad y alimenta nuestra DB:
                                </label>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Haz que la iluminación sea estilo cyberpunk y elimina el ruido de fondo..." 
                                        className="flex-1 bg-[#161616] border border-neutral-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#CC0000] text-sm transition-colors shadow-inner"
                                    />
                                    <button 
                                        onClick={() => simulateAIGeneration()}
                                        className="bg-[#CC0000] hover:bg-red-800 text-white font-black px-8 py-4 md:py-0 rounded-xl text-xs uppercase tracking-widest transition-transform active:scale-95 flex justify-center items-center gap-3 shadow-[0_0_15px_rgba(204,0,0,0.4)]"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                                        REGENERAR
                                    </button>
                                </div>
                            </div>
                            
                            {/* Copywriting / Info del Draft Ligado */}
                            {selectedDraft.caption && (
                                <div className="mt-10 bg-[#111] border border-neutral-800 rounded-3xl p-6">
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Post Copy asignado</h4>
                                    <p className="text-sm font-light text-neutral-300 whitespace-pre-wrap leading-relaxed">{selectedDraft.caption}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
