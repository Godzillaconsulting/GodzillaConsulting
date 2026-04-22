import React, { useState } from 'react';
import { Calendar as CalendarIcon, Wand2, Loader2, Send, Download, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Columnas exactas del Sheets ──────────────────────────────────────────────
const SCENE_COLUMNS = [1, 2, 3, 4, 5];
const COL = (n) => ({
    narracion: n === 5 ? `NARRACION ESCENA 5 (CTA)` : `NARRACION ESCENA ${n}`,
    visual:    `VISUAL ESCENA ${n} (Prompt Imagen Detallado)`,
    video:     `VIDEO ESCENA ${n} (Prompt Movimiento Detallado)`,
});

// ─── Exportar CSV con las columnas exactas del Sheets ─────────────────────────
const exportToCSV = (plan, niche) => {
    const headers = [
        'Día', 'Tema',
        ...SCENE_COLUMNS.flatMap(n => [COL(n).narracion, COL(n).visual, COL(n).video])
    ];

    const rows = plan.map(day => [
        day.dia || '',
        day['Tema'] || '',
        ...SCENE_COLUMNS.flatMap(n => [
            day[COL(n).narracion] || '',
            day[COL(n).visual]    || '',
            day[COL(n).video]     || '',
        ])
    ]);

    const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-contenido-${niche.slice(0, 20).replace(/\s+/g, '-')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Tarjeta de día colapsable ─────────────────────────────────────────────────
function DayCard({ day, idx, canEdit, onSendToCalendar }) {
    const [open, setOpen] = useState(idx === 0);

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Header del día */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex justify-between items-center px-6 py-4 hover:bg-neutral-800/50 transition-colors group"
            >
                <div className="flex items-center gap-4">
                    <span className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-sm">
                        {day.dia || idx + 1}
                    </span>
                    <div className="text-left">
                        <p className="text-white font-black text-sm leading-tight">{day['Tema'] || `Día ${idx + 1}`}</p>
                        <p className="text-[10px] text-neutral-600 font-bold mt-0.5 uppercase tracking-widest">5 escenas · 50 seg</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSendToCalendar(day); }}
                        disabled={!canEdit}
                        className="opacity-0 group-hover:opacity-100 text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded flex items-center gap-1 transition-all disabled:opacity-30 shrink-0"
                    >
                        <Send className="w-3 h-3" /> Enviar a Calendario
                    </button>
                    {open
                        ? <ChevronUp className="w-4 h-4 text-neutral-600" />
                        : <ChevronDown className="w-4 h-4 text-neutral-600" />}
                </div>
            </button>

            {/* Escenas desplegables */}
            {open && (
                <div className="px-6 pb-6 space-y-3 border-t border-neutral-800">
                    {SCENE_COLUMNS.map(n => {
                        const isCTA = n === 5;
                        const narr  = day[COL(n).narracion] || '';
                        const vis   = day[COL(n).visual]    || '';
                        const vid   = day[COL(n).video]     || '';
                        if (!narr && !vis && !vid) return null;
                        return (
                            <div key={n} className={`rounded-xl p-4 border mt-3 ${isCTA ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-black/40 border-neutral-800/50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isCTA ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                                        {isCTA ? '🎯 Escena 5 — CTA' : `Escena ${n}`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Narración */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block">🎙 Narración (TTS)</span>
                                        <p className="text-sm text-neutral-200 leading-relaxed">{narr}</p>
                                    </div>
                                    {/* Visual Prompt */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest block">🖼 Visual Prompt</span>
                                        <p className="text-xs text-neutral-400 font-mono leading-relaxed">{vis}</p>
                                    </div>
                                    {/* Video Motion Prompt */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-widest block">🎬 Video Motion Prompt</span>
                                        <p className="text-xs text-neutral-400 font-mono leading-relaxed">{vid}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AIContentPlanner({ adminProfile }) {
    const [niche, setNiche]           = useState('');
    const [month, setMonth]           = useState(() => {
        const d = new Date(); return d.toLocaleString('es', { month: 'long' });
    });
    const [year, setYear]             = useState(() => new Date().getFullYear());
    const [extraContext, setExtra]    = useState('');
    const [isGenerating, setGenerating] = useState(false);
    const [plan, setPlan]             = useState(null);
    const [generatedNiche, setGNiche] = useState('');

    const username    = adminProfile?.username?.toLowerCase() || '';
    const isSuperAdmin = adminProfile?.is_superadmin === true;
    const canEdit     = isSuperAdmin || username === 'alex' || username === 'oscar';

    const handleGenerate = async () => {
        if (!niche.trim()) return alert('Por favor ingresa un nicho o producto.');
        setGenerating(true);
        setPlan(null);
        try {
            const token = localStorage.getItem('adminToken');
            const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res   = await fetch(`${API}/api/studio/generate-monthly-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ niche, month, year, extraContext }),
            });
            const data = await res.json();
            if (data.success) {
                setPlan(data.plan);
                setGNiche(niche);
            } else {
                alert(data.error || 'Error generando plan');
            }
        } catch (err) {
            console.error(err);
            alert('Fallo de conexión con el servidor.');
        }
        setGenerating(false);
    };

    const handleSendToCalendar = async (day) => {
        try {
            const token = localStorage.getItem('adminToken');
            const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
            // Construye un evento con el tema + narracion como caption
            const captions = SCENE_COLUMNS.map(n => day[COL(n).narracion] || '').filter(Boolean).join('\n\n');
            const res = await fetch(`${API}/api/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: `🤖 ${day['Tema']}`,
                    platform: 'ALL',
                    status: 'warning',
                    caption: captions,
                    empresa: 'godzilla',
                    calendario: 'contenido',
                    start_date: new Date().toISOString().split('T')[0] + `T${String(day.dia || 1).padStart(2,'0')}:00:00`,
                    end_date:   new Date().toISOString().split('T')[0] + `T${String(day.dia || 1).padStart(2,'0')}:00:00`,
                }),
            });
            const data = await res.json();
            if (data.success) alert(`✅ Día ${day.dia} "${day['Tema']}" enviado al Calendario de Contenido.`);
            else alert(data.error || 'Error enviando al calendario.');
        } catch (err) {
            console.error(err);
            alert('Fallo de conexión.');
        }
    };

    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    return (
        <div className="w-full h-full bg-[#0a0a0a] flex flex-col relative overflow-hidden font-sans">

            {/* ── Header ── */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-purple-500" />
                        Planificador IA · Contenido Mensual
                    </h2>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                        30 días · 5 escenas por video · Faceless · Reels / Shorts / TikTok
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!canEdit && (
                        <span className="text-[10px] bg-red-900/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full font-bold">
                            🔒 Solo Lectura
                        </span>
                    )}
                    {plan && (
                        <button
                            onClick={() => exportToCSV(plan, generatedNiche)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            <Download className="w-4 h-4" /> Exportar CSV (Sheets)
                        </button>
                    )}
                </div>
            </div>

            {/* ── Formulario ── */}
            <div className="px-6 py-4 bg-neutral-900/40 border-b border-neutral-800 shrink-0">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block mb-1.5">Nicho / Producto *</label>
                        <input
                            type="text"
                            value={niche}
                            onChange={e => setNiche(e.target.value)}
                            disabled={!canEdit || isGenerating}
                            placeholder="Ej: Finanzas Personales, Skincare Natural, Agencia B2B..."
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                        />
                    </div>
                    <div className="w-36">
                        <label className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block mb-1.5">Mes</label>
                        <select
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            disabled={!canEdit || isGenerating}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="w-24">
                        <label className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block mb-1.5">Año</label>
                        <input
                            type="number"
                            value={year}
                            onChange={e => setYear(+e.target.value)}
                            disabled={!canEdit || isGenerating}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest block mb-1.5">Contexto Extra (opcional)</label>
                        <input
                            type="text"
                            value={extraContext}
                            onChange={e => setExtra(e.target.value)}
                            disabled={!canEdit || isGenerating}
                            placeholder="Ej: audiencia 25-40 años, tono aspiracional..."
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={!canEdit || isGenerating || !niche.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 text-white font-black uppercase tracking-widest px-8 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all text-sm shrink-0"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isGenerating ? 'Generando...' : 'Generar 30 Días'}
                    </button>
                </div>

                {/* Columnas del Sheets como referencia */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {['Tema', 'Narración ×5', 'Visual Prompt ×5', 'Video Motion Prompt ×5'].map(col => (
                        <span key={col} className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded font-mono">
                            {col}
                        </span>
                    ))}
                    <span className="text-[9px] text-neutral-700 font-bold">= {16} columnas totales por día</span>
                </div>
            </div>

            {/* ── Contenido ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                {isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-neutral-500">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                            <CalendarIcon className="w-6 h-6 absolute inset-0 m-auto text-purple-400" />
                        </div>
                        <p className="text-sm font-bold">Gemini está diseñando tu estrategia de 30 días...</p>
                        <p className="text-xs text-neutral-700">Generando 150 escenas completas · puede tomar ~30 segundos</p>
                    </div>
                ) : !plan ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                        <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm font-bold">Ingresa un nicho y genera la estrategia del mes.</p>
                        {!canEdit && (
                            <p className="text-xs mt-2 text-red-500/60 font-bold">Solo Alex u Oscar pueden generar planes.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-black text-white">
                                📅 Plan Generado: <span className="text-purple-400">{generatedNiche}</span> · {plan.length} días
                            </p>
                            <button
                                onClick={() => exportToCSV(plan, generatedNiche)}
                                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Descargar CSV
                            </button>
                        </div>
                        {plan.map((day, idx) => (
                            <DayCard
                                key={idx}
                                day={day}
                                idx={idx}
                                canEdit={canEdit}
                                onSendToCalendar={handleSendToCalendar}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
