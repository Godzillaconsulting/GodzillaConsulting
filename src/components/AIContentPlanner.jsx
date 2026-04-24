import React, { useState } from 'react';
import { Calendar as CalendarIcon, Wand2, Loader2, Send, Download, ChevronDown, ChevronUp, CheckSquare, Square, Rocket } from 'lucide-react';

// ─── Columnas exactas del Sheets ──────────────────────────────────────────────
const SCENE_COLUMNS = [1, 2, 3, 4, 5];
const COL = (n) => ({
    narracion: n === 5 ? `NARRACION ESCENA 5 (CTA)` : `NARRACION ESCENA ${n}`,
    texto:     `TEXTO EN PANTALLA ESCENA ${n}`,
    audio:     `AUDIO Y SFX ESCENA ${n}`,
    visual:    `VISUAL ESCENA ${n} (Prompt Imagen Detallado)`,
    video:     `VIDEO ESCENA ${n} (Prompt Movimiento Detallado)`,
});

const exportToCSV = (plan, niche) => {
    const headers = [
        'Tema',
        ...SCENE_COLUMNS.flatMap(n => [COL(n).narracion, COL(n).texto, COL(n).audio, COL(n).visual, COL(n).video])
    ];

    const rows = plan.map(day => [
        day['Tema'] || '',
        ...SCENE_COLUMNS.flatMap(n => [
            day[COL(n).narracion] || '',
            day[COL(n).texto]     || '',
            day[COL(n).audio]     || '',
            day[COL(n).visual]    || '',
            day[COL(n).video]     || '',
        ])
    ]);

    const escape = (val) => {
        // Envolver en comillas dobles y escapar comillas internas para no romper columnas con saltos de linea
        const strVal = String(val || '').replace(/"/g, '""');
        return `"${strVal}"`;
    };
    
    const csvContent = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-contenido-${niche.slice(0, 20).replace(/\s+/g, '-')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Tarjeta de revisión: Template vs IA ────────────────────────────────────
function ReviewCard({ day, idx, selection, onToggle }) {
    const [open, setOpen] = useState(idx === 0);
    const sel = selection || 'ia'; // 'ia' | 'template' | 'skip'

    const OPTIONS = [
        { key: 'ia',       label: '🤖 Opción IA',       desc: 'Generado automáticamente por Gemini', color: 'purple' },
        { key: 'template', label: '📋 Template Manual',  desc: 'Usar estructura base propia',          color: 'blue'   },
        { key: 'skip',     label: '⏭ Omitir día',       desc: 'No enviar este día al calendario',    color: 'neutral' },
    ];

    const colorMap = {
        purple:  { ring: 'ring-purple-500', bg: 'bg-purple-600/20', border: 'border-purple-500/60', text: 'text-purple-400' },
        blue:    { ring: 'ring-blue-500',   bg: 'bg-blue-600/20',   border: 'border-blue-500/60',   text: 'text-blue-400'   },
        neutral: { ring: 'ring-neutral-600',bg: 'bg-neutral-800/40',border: 'border-neutral-600/60',text: 'text-neutral-500'},
    };

    return (
        <div className={`rounded-2xl overflow-hidden border transition-all ${
            sel === 'skip' ? 'border-neutral-800 opacity-50' : 'border-neutral-700'
        }`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex justify-between items-center px-5 py-3 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-xs">
                        {day.dia || idx + 1}
                    </span>
                    <div className="text-left">
                        <p className="text-white font-black text-sm">{day['Tema'] || `Día ${idx + 1}`}</p>
                        <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">5 escenas · revisión requerida</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Selector inline */}
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {OPTIONS.map(opt => {
                            const c = colorMap[opt.color];
                            const active = sel === opt.key;
                            return (
                                <button
                                    key={opt.key}
                                    onClick={() => onToggle(idx, opt.key)}
                                    title={opt.desc}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                        active ? `${c.bg} ${c.border} ${c.text}` : 'bg-black/30 border-neutral-800 text-neutral-600 hover:text-neutral-400'
                                    }`}
                                >
                                    {active ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-neutral-600" /> : <ChevronDown className="w-4 h-4 text-neutral-600" />}
                </div>
            </button>

            {open && (
                <div className="px-5 pb-5 space-y-2 border-t border-neutral-800 bg-black/20">
                    {SCENE_COLUMNS.map(n => {
                        const narr = day[COL(n).narracion] || '';
                        const txt  = day[COL(n).texto]     || '';
                        const vis  = day[COL(n).visual]    || '';
                        if (!narr && !vis) return null;
                        const isCTA = n === 5;
                        return (
                            <div key={n} className={`rounded-xl p-3 border mt-2 ${
                                isCTA ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-black/30 border-neutral-800/50'
                            }`}>
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${
                                    isCTA ? 'text-emerald-400' : 'text-neutral-500'
                                }`}>{isCTA ? '🎯 Escena 5 — CTA' : `Escena ${n}`}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[9px] text-emerald-400 font-bold uppercase mb-1">🎙 Narración</p>
                                        <p className="text-xs text-neutral-300 leading-relaxed">{narr}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">🖼 Visual Prompt</p>
                                        <p className="text-xs text-neutral-400 font-mono leading-relaxed">{vis}</p>
                                    </div>
                                </div>
                                {txt && <p className="text-[9px] text-yellow-400 font-bold mt-2">💬 Pantalla: <span className="text-neutral-300 font-normal">{txt}</span></p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

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
                        const txt   = day[COL(n).texto]     || '';
                        const aud   = day[COL(n).audio]     || '';
                        const vis   = day[COL(n).visual]    || '';
                        const vid   = day[COL(n).video]     || '';
                        if (!narr && !vis && !vid && !txt && !aud) return null;
                        return (
                            <div key={n} className={`rounded-xl p-4 border mt-3 ${isCTA ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-black/40 border-neutral-800/50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isCTA ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                                        {isCTA ? '🎯 Escena 5 — CTA' : `Escena ${n}`}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Narración */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block">🎙 Narración (TTS)</span>
                                            <p className="text-sm text-neutral-200 leading-relaxed">{narr}</p>
                                        </div>
                                        {/* Texto en Pantalla */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest block">💬 Texto Pantalla</span>
                                            <p className="text-sm text-neutral-200 font-bold leading-relaxed">{txt}</p>
                                        </div>
                                        {/* Audio y SFX */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest block">🎵 Audio & SFX</span>
                                            <p className="text-xs text-neutral-300 italic leading-relaxed">{aud}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/50">
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
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSendingWebhook, setIsSendingWebhook] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    // ── Revisión Template vs IA ──
    const [reviewMode, setReviewMode]       = useState(false); // true = pantalla de revisión
    const [selections, setSelections]       = useState({});    // { idx: 'ia'|'template'|'skip' }
    const [isSendingBulk, setIsSendingBulk] = useState(false);
    const [bulkResult, setBulkResult]       = useState(null);  // { sent, skipped }

    const username    = adminProfile?.username?.toLowerCase() || '';
    const isSuperAdmin = adminProfile?.is_superadmin === true;
    const canEdit     = isSuperAdmin || username === 'alex' || username === 'oscar';

    const handleSendWebhook = async () => {
        if (!webhookUrl.trim() || !plan) return alert('No hay URL o plan generado.');
        setIsSendingWebhook(true);
        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ niche: generatedNiche, plan }),
            });
            if (res.ok) alert('Plan enviado exitosamente al webhook (n8n/Make).');
            else alert('Error en la respuesta del webhook.');
        } catch (err) {
            alert('Fallo al conectar con el webhook.');
        }
        setIsSendingWebhook(false);
    };

    const handleGenerate = async () => {
        if (!niche.trim()) return alert('Por favor ingresa un nicho o producto.');
        setGenerating(true);
        setPlan(null);
        setProgress(0);
        setProgressText('Iniciando clúster de IA...');
        try {
            const token = localStorage.getItem('adminToken');
            const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res   = await fetch(`${API}/api/studio/generate-monthly-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ niche, month, year, extraContext }),
            });
            const data = await res.json();
            
            if (data.success && data.taskId) {
                // Iniciar Polling de estado
                const intervalId = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${API}/api/studio/plan-status/${data.taskId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const statusData = await statusRes.json();
                        
                        if (statusData.success) {
                            if (statusData.status === 'completed') {
                                clearInterval(intervalId);
                                const newPlan = statusData.plan;
                                setPlan(newPlan);
                                setGNiche(statusData.niche);
                                // Init all days to 'ia' and open review mode
                                const initSel = {};
                                newPlan.forEach((_, i) => { initSel[i] = 'ia'; });
                                setSelections(initSel);
                                setBulkResult(null);
                                setReviewMode(true);
                                setGenerating(false);
                            } else if (statusData.status === 'error') {
                                clearInterval(intervalId);
                                alert(statusData.error || 'Error durante la generación.');
                                setGenerating(false);
                            } else {
                                setProgress(statusData.progress || 0);
                                setProgressText(`Generando plan (Lote ${Math.ceil((statusData.progress || 1) / 16.66)} de 6)...`);
                            }
                        }
                    } catch (e) {
                        console.error("Error polling status:", e);
                        // No rompemos el loop por un fallo de red intermitente
                    }
                }, 3000);
            } else {
                alert(data.error || 'Error iniciando plan');
                setGenerating(false);
            }
        } catch (err) {
            console.error(err);
            alert('Fallo de conexión con el servidor.');
            setGenerating(false);
        }
    };

    const handleSendToCalendar = async (day, idx) => {
        try {
            const token = localStorage.getItem('adminToken');
            const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
            
            // Calculate correct date
            const now = new Date();
            const currentYear = parseInt(year) || now.getFullYear();
            const monthMap = { 'enero':0, 'febrero':1, 'marzo':2, 'abril':3, 'mayo':4, 'junio':5, 'julio':6, 'agosto':7, 'septiembre':8, 'octubre':9, 'noviembre':10, 'diciembre':11 };
            const monthStr = month ? month.toLowerCase().trim() : '';
            const currentMonth = monthMap[monthStr] !== undefined ? monthMap[monthStr] : now.getMonth();
            const publishDate = new Date(currentYear, currentMonth, (idx || 0) + 1);
            const isoDate = publishDate.toISOString().split('T')[0];

            // Build narrations
            const narrations = [1, 2, 3, 4, 5].map(n => {
                const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
                return day[key] ? `Escena ${n}: ${day[key]}` : null;
            }).filter(Boolean).join('\n');

            const mediaPayload = {
                source: 'manual_planner',
                niche: generatedNiche || niche,
                month: month,
                year: year,
                scenes: day,
                visualJobs: day._visualJobs || [],
                videoJobs: day._videoJobs || []
            };

            const res = await fetch(`${API}/api/studio/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: day['Tema'] || 'Día sin título',
                    prompt: narrations,
                    assigned_to: 'auto',
                    tags: JSON.stringify([generatedNiche || niche || 'auto', 'manual-generated']),
                    priority: 'Media',
                    content_type: 'Video Corto',
                    ig_publish_date: isoDate,
                    media_payload: JSON.stringify(mediaPayload)
                }),
            });
            const data = await res.json();
            if (data.success) alert(`✅ Día ${day.dia || (idx+1)} "${day['Tema']}" enviado al Contenido IA para generación automática.`);
            else alert(data.error || 'Error enviando al Contenido IA.');
        } catch (err) {
            console.error(err);
            alert('Fallo de conexión.');
        }
    };

    const handleToggleSelection = (idx, val) => {
        setSelections(prev => ({ ...prev, [idx]: val }));
    };

    const handleSelectAll = (val) => {
        if (!plan) return;
        const all = {};
        plan.forEach((_, i) => { all[i] = val; });
        setSelections(all);
    };

    const handleBulkSend = async () => {
        if (!plan) return;
        setIsSendingBulk(true);
        let sent = 0, skipped = 0;
        for (let idx = 0; idx < plan.length; idx++) {
            const sel = selections[idx] || 'ia';
            if (sel === 'skip') { skipped++; continue; }
            try {
                await handleSendToCalendarSilent(plan[idx], idx);
                sent++;
            } catch (_) { skipped++; }
        }
        setIsSendingBulk(false);
        setBulkResult({ sent, skipped });
        setReviewMode(false);
    };

    // Silent version (no alert) used by bulk send
    const handleSendToCalendarSilent = async (day, idx) => {
        const token = localStorage.getItem('adminToken');
        const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const now = new Date();
        const monthMap = { 'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11 };
        const currentYear  = parseInt(year) || now.getFullYear();
        const currentMonth = monthMap[(month||'').toLowerCase().trim()] ?? now.getMonth();
        const isoDate = new Date(currentYear, currentMonth, idx + 1).toISOString().split('T')[0];
        const narrations = [1,2,3,4,5].map(n => {
            const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
            return day[key] ? `Escena ${n}: ${day[key]}` : null;
        }).filter(Boolean).join('\n');
        const mediaPayload = { source: 'ai_planner', niche: generatedNiche || niche, month, year, scenes: day };
        const res = await fetch(`${API}/api/studio/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                title: day['Tema'] || `Día ${idx+1}`,
                prompt: narrations,
                assigned_to: 'auto',
                tags: JSON.stringify([generatedNiche || niche || 'auto', 'ai-planner']),
                priority: 'Media',
                content_type: 'Video Corto',
                ig_publish_date: isoDate,
                media_payload: JSON.stringify(mediaPayload)
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
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
                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <div className="flex items-center bg-black/50 border border-neutral-800 rounded-xl overflow-hidden shadow-inner">
                                    <input 
                                        type="url" 
                                        placeholder="Webhook URL (n8n/Make)..."
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        className="bg-transparent text-xs text-white px-3 py-2 outline-none w-48 placeholder-neutral-600"
                                    />
                                    <button 
                                        onClick={handleSendWebhook}
                                        disabled={isSendingWebhook || !webhookUrl}
                                        className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border-l border-neutral-800 text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                    >
                                        {isSendingWebhook ? 'Enviando...' : 'POST'}
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => exportToCSV(plan, generatedNiche)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                <Download className="w-4 h-4" /> Exportar CSV (Sheets)
                            </button>
                        </div>
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
                    {['Tema', 'Narración ×5', 'Texto Pantalla ×5', 'Audio/SFX ×5', 'Visual Prompt ×5', 'Video Motion Prompt ×5'].map(col => (
                        <span key={col} className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded font-mono">
                            {col}
                        </span>
                    ))}
                    <span className="text-[9px] text-neutral-700 font-bold">= {26} columnas totales por día</span>
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
                        <p className="text-sm font-bold text-white">{progressText || 'Gemini está diseñando tu estrategia de 30 días...'}</p>
                        
                        <div className="w-64 bg-black/50 h-2 rounded-full overflow-hidden mt-2 border border-white/5">
                            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>

                        <p className="text-xs text-neutral-700">Generando 150 escenas completas en 6 lotes</p>
                    </div>
                ) : !plan ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                        <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm font-bold">Ingresa un nicho y genera la estrategia del mes.</p>
                        {!canEdit && (
                            <p className="text-xs mt-2 text-red-500/60 font-bold">Solo Alex u Oscar pueden generar planes.</p>
                        )}
                    </div>
                ) : reviewMode ? (
                    /* ── PANTALLA DE REVISIÓN: Template vs IA ── */
                    <div className="space-y-4">
                        <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm pb-3 border-b border-neutral-800">
                            <div className="flex flex-wrap justify-between items-center gap-3">
                                <div>
                                    <p className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                                        🧠 Revisión — <span className="text-purple-400">{generatedNiche}</span>
                                        <span className="text-[10px] bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                                            {plan.length} días
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-neutral-600 font-bold mt-1">
                                        🤖 {Object.values(selections).filter(v => v==='ia').length} IA &nbsp;·&nbsp;
                                        📋 {Object.values(selections).filter(v => v==='template').length} Template &nbsp;·&nbsp;
                                        ⏭ {Object.values(selections).filter(v => v==='skip').length} omitidos
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => handleSelectAll('ia')} className="text-[10px] px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg font-black hover:bg-purple-600/40 transition-colors">🤖 Todo IA</button>
                                    <button onClick={() => handleSelectAll('template')} className="text-[10px] px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg font-black hover:bg-blue-600/40 transition-colors">📋 Todo Template</button>
                                    <button onClick={() => exportToCSV(plan, generatedNiche)} className="text-[10px] px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-black flex items-center gap-1 hover:bg-emerald-600/40 transition-colors">
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                    <button
                                        onClick={handleBulkSend}
                                        disabled={isSendingBulk || !canEdit}
                                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
                                    >
                                        {isSendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                        {isSendingBulk ? 'Enviando...' : 'Enviar al Calendario IA'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {plan.map((day, idx) => (
                                <ReviewCard key={idx} day={day} idx={idx} selection={selections[idx]} onToggle={handleToggleSelection} />
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ── VISTA NORMAL post-envío ── */
                    <div className="space-y-3">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                            <div>
                                <p className="text-sm font-black text-white">
                                    📅 Plan: <span className="text-purple-400">{generatedNiche}</span> · {plan.length} días
                                </p>
                                {bulkResult && (
                                    <p className="text-xs text-emerald-400 font-bold mt-1">
                                        ✅ {bulkResult.sent} días enviados · {bulkResult.skipped} omitidos
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setReviewMode(true)} className="text-xs text-purple-400 hover:text-purple-300 font-bold border border-purple-500/30 px-3 py-1.5 rounded-lg bg-purple-600/10 transition-colors">
                                    🔍 Revisar Plan
                                </button>
                                <button onClick={() => exportToCSV(plan, generatedNiche)} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                                    <Download className="w-3.5 h-3.5" /> CSV
                                </button>
                            </div>
                        </div>
                        {plan.map((day, idx) => (
                            <DayCard key={idx} day={day} idx={idx} canEdit={canEdit} onSendToCalendar={handleSendToCalendar} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
