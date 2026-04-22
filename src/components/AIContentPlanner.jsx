import React, { useState } from 'react';
import { Calendar as CalendarIcon, Wand2, Loader2, Save, Send } from 'lucide-react';

export default function AIContentPlanner({ adminProfile }) {
    const [niche, setNiche] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [plan, setPlan] = useState(null);

    const username = adminProfile?.username?.toLowerCase() || '';
    const isSuperAdmin = adminProfile?.is_superadmin === true;
    const canEdit = isSuperAdmin || username === 'alex' || username === 'oscar';

    const handleGenerate = async () => {
        if (!niche.trim()) return alert("Por favor ingresa un nicho o producto.");
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${API}/api/studio/generate-monthly-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ niche })
            });
            const data = await res.json();
            if (data.success) {
                setPlan(data.plan);
            } else {
                alert(data.error || 'Error generando plan');
            }
        } catch (error) {
            console.error(error);
            alert('Fallo de conexión');
        }
        setIsGenerating(false);
    };

    return (
        <div className="w-full h-full bg-[#0a0a0a] flex flex-col relative overflow-hidden font-sans">
            <div className="p-6 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-black text-white drop-shadow-md flex items-center gap-3">
                        <CalendarIcon className="w-6 h-6 text-purple-500"/> Planificador IA (Contenido Mensual)
                    </h2>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Generador de 30 días Faceless (Reels/Shorts/TikTok)</p>
                </div>
                {!canEdit && (
                    <span className="text-[10px] bg-red-900/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full font-bold">
                        🔒 MODO LECTURA (Solo Alex/Oscar pueden editar)
                    </span>
                )}
            </div>

            <div className="p-6 flex items-end gap-4 shrink-0 bg-neutral-900/50">
                <div className="flex-1">
                    <label className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block mb-2">Nicho o Producto</label>
                    <input 
                        type="text" 
                        value={niche}
                        onChange={e => setNiche(e.target.value)}
                        disabled={!canEdit || isGenerating}
                        placeholder="Ej: Finanzas Personales para jóvenes, Productos de Skincare..."
                        className="w-full bg-black/50 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                    />
                </div>
                <button 
                    onClick={handleGenerate}
                    disabled={!canEdit || isGenerating || !niche.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest px-8 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    Generar 30 Días
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {!plan ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                        <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm">Ingresa un nicho y genera la estrategia del mes.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {plan.map((day, idx) => (
                            <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-white font-black text-lg">Día {idx + 1}: <span className="text-purple-400">{day.tema}</span></h3>
                                    <button disabled={!canEdit} className="text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded flex items-center gap-1 transition-colors disabled:opacity-50">
                                        <Send className="w-3 h-3"/> Enviar a CMCalendar
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {day.escenas && day.escenas.map((escena, eIdx) => (
                                        <div key={eIdx} className="bg-black/50 rounded-xl p-4 border border-neutral-800/50 flex gap-4">
                                            <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-500 font-bold shrink-0">
                                                E{eIdx + 1}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div>
                                                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Narración (TTS)</span>
                                                    <p className="text-sm text-neutral-200">{escena.narracion}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Visual Prompt</span>
                                                    <p className="text-xs text-neutral-400 font-mono">{escena.visual_prompt}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
