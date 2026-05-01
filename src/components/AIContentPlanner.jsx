import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
    
    const formatDay = () => {
        const now = new Date();
        const monthMap = { 'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11 };
        const currentYear = parseInt(day.year) || now.getFullYear();
        const currentMonth = monthMap[(day.month||'').toLowerCase().trim()] ?? now.getMonth();
        const date = new Date(currentYear, currentMonth, idx + 1);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

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
                    <span className="w-12 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-xs shrink-0">
                        {formatDay()}
                    </span>
                    <div className="text-left">
                        <p className="text-white font-black text-sm line-clamp-1">{day['Tema'] || `Tema del día`}</p>
                        <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-0.5">5 escenas · revisión requerida</p>
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
                                    <span className="hidden sm:inline">{opt.label}</span>
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
    
    const formatDay = () => {
        const now = new Date();
        const monthMap = { 'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11 };
        const currentYear = parseInt(day.year) || now.getFullYear();
        const currentMonth = monthMap[(day.month||'').toLowerCase().trim()] ?? now.getMonth();
        const date = new Date(currentYear, currentMonth, idx + 1);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Header del día */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex justify-between items-center px-6 py-4 hover:bg-neutral-800/50 transition-colors group"
            >
                <div className="flex items-center gap-4">
                    <span className="w-14 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-xs shrink-0">
                        {formatDay()}
                    </span>
                    <div className="text-left flex-1 min-w-0">
                        <p className="text-white font-black text-sm leading-tight truncate">{day['Tema'] || `Tema del día`}</p>
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
    const [durationDays, setDurationDays] = useState(30);
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
    
    // ─── Radar de Contenido (AnswerThePublic Engine) ───────────────────────
    const [showContentRadar, setShowContentRadar] = useState(false);
    const [radarTopic, setRadarTopic] = useState('');
    const [radarLoading, setRadarLoading] = useState(false);
    const [radarData, setRadarData] = useState(null);
    const [radarCopied, setRadarCopied] = useState(false);

    const fetchContentRadar = async () => {
        if (!radarTopic.trim()) return;
        setRadarLoading(true);
        setRadarData(null);
        try {
            const token = localStorage.getItem('adminToken');
            const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${API}/api/studio/content-radar?topic=${encodeURIComponent(radarTopic.trim())}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setRadarData(data);
            else console.error('ContentRadar error:', data.error);
        } catch (e) {
            console.error('ContentRadar fetch failed:', e);
        } finally {
            setRadarLoading(false);
        }
    };

    const copyHashtags = () => {
        if (!radarData?.hashtags?.length) return;
        navigator.clipboard.writeText(radarData.hashtags.join(' '));
        setRadarCopied(true);
        setTimeout(() => setRadarCopied(false), 2000);
    };

    const [plannerTrends, setPlannerTrends] = useState(null);
    const [loadingTrends, setLoadingTrends] = useState(false);

    const fetchPlannerTrends = async () => {
        if (!niche.trim()) return alert('Escribe el nicho primero.');
        setLoadingTrends(true);
        setPlannerTrends(null);
        try {
            const res = await fetch(`/api/studio/content-radar?topic=${encodeURIComponent(niche)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) setPlannerTrends(data);
            else setPlannerTrends({ error: data.error || 'Sin datos de trends.' });
        } catch (e) {
            setPlannerTrends({ error: e.message });
        }
        setLoadingTrends(false);
    };

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
                body: JSON.stringify({ niche, month, year, extraContext, durationDays, radarTrends: plannerTrends }),
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
                                // Embed month and year into the plan days so the cards can format the date
                                const newPlan = statusData.plan.map(d => ({ ...d, month, year }));
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
                                const totalBatches = Math.ceil(durationDays / 5);
                                const currentBatch = Math.ceil((statusData.progress || 1) / (100 / totalBatches));
                                setProgressText(`Generando plan (Lote ${currentBatch} de ${totalBatches})...`);
                                
                                // Live streaming del plan
                                if (statusData.partialPlan && statusData.partialPlan.length > 0) {
                                    const partialWithDates = statusData.partialPlan.map(d => ({ ...d, month, year }));
                                    setPlan(partialWithDates);
                                    setGNiche(niche);
                                    setSelections(prev => {
                                        const newSel = { ...prev };
                                        statusData.partialPlan.forEach((_, i) => { if (!newSel[i]) newSel[i] = 'ia'; });
                                        return newSel;
                                    });
                                    setReviewMode(true);
                                }
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
                    tags: JSON.stringify([generatedNiche || niche || 'auto', 'ai-planner']),
                    priority: 'Media',
                    status: 'manual_studio', // Va al CEO Estudio → bandeja "En Estudio IA" para revisión y activación manual
                    content_type: 'Video Corto',
                    ig_publish_date: isoDate,
                    media_payload: JSON.stringify(mediaPayload)
                }),
            });
            const data = await res.json();
            if (data.success) alert(`✅ "${day['Tema']}" enviado al Estudio IA. Revísalo en CEO Estudio → bandeja "🎬 En Estudio IA" para activar la generación.`);
            else alert(data.error || 'Error enviando al Estudio IA.');
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
                status: 'manual_studio', // Va al CEO Estudio para revisión antes de generar
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
                        Planificador IA · Contenido Continuo
                    </h2>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                        {durationDays} días · 5 escenas por video · Faceless · Reels / Shorts / TikTok
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
                    <div className="w-32">
                        <label className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block mb-1.5">Duración</label>
                        <select
                            value={durationDays}
                            onChange={e => setDurationDays(+e.target.value)}
                            disabled={!canEdit || isGenerating}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                            <option value={1}>1 Día (Prueba)</option>
                            <option value={7}>1 Semana (7 Días)</option>
                            <option value={15}>15 Días</option>
                            <option value={30}>1 Mes (30 Días)</option>
                        </select>
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
                        onClick={fetchPlannerTrends}
                        disabled={loadingTrends || !niche.trim()}
                        className="bg-black border border-white/10 hover:border-white/30 text-white font-black uppercase tracking-widest px-6 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all text-[11px] shrink-0 h-[42px]"
                    >
                        {loadingTrends ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔥 Ver Trends'}
                    </button>

                    <button
                        onClick={() => setShowContentRadar(true)}
                        className="bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all text-[11px] shrink-0 h-[42px] flex items-center gap-2 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                    >
                        🔍 Radar
                    </button>

                    <button
                        onClick={handleGenerate}
                        disabled={!canEdit || isGenerating || !niche.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 text-white font-black uppercase tracking-widest px-8 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all text-sm shrink-0 h-[42px]"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isGenerating ? 'Generando...' : `Generar ${durationDays} Días`}
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

                {/* Panel de Trends */}
                {plannerTrends && !plannerTrends.error && (
                    <div className="mt-4 p-4 border border-white/10 bg-black/50 rounded-xl space-y-4">
                        {plannerTrends.hashtags && plannerTrends.hashtags.length > 0 && (
                            <div>
                                <p className="text-[10px] text-purple-400 font-bold uppercase mb-2">🔥 Trending Hashtags</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {plannerTrends.hashtags.slice(0, 10).map((h, i) => (
                                        <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-neutral-300">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {plannerTrends.hooks && plannerTrends.hooks.length > 0 && (
                            <div>
                                <p className="text-[10px] text-cyan-400 font-bold uppercase mb-2">🎣 Hooks Virales Recomendados</p>
                                <ul className="space-y-1.5">
                                    {plannerTrends.hooks.slice(0, 3).map((hook, i) => (
                                        <li key={i} className="text-[11px] text-white flex items-start gap-2 leading-tight">
                                            <span className="text-cyan-500 shrink-0 mt-0.5">👉</span> {hook}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Contenido ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 relative">
                
                {/* ── BARRA DE PROGRESO FLOTANTE CUANDO SE ESTÁ GENERANDO EN VIVO ── */}
                {isGenerating && plan && plan.length > 0 && (
                    <div className="sticky top-0 z-50 mb-6 bg-neutral-900/90 backdrop-blur-md border border-purple-500/50 rounded-2xl p-4 shadow-[0_10px_40px_rgba(168,85,247,0.15)] flex flex-col items-center">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                            <p className="text-sm font-bold text-white">{progressText || 'Diseñando la estrategia en vivo...'}</p>
                        </div>
                        <div className="w-full max-w-md bg-black/50 h-2 rounded-full overflow-hidden mt-3 border border-white/5">
                            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                {isGenerating && !plan ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-neutral-500">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                            <CalendarIcon className="w-6 h-6 absolute inset-0 m-auto text-purple-400" />
                        </div>
                        <p className="text-sm font-bold text-white">{progressText || `Gemini está diseñando tu estrategia de ${durationDays} días...`}</p>
                        
                        <div className="w-64 bg-black/50 h-2 rounded-full overflow-hidden mt-2 border border-white/5">
                            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>

                        <p className="text-xs text-neutral-700">Generando hasta {durationDays * 5} escenas completas en vivo</p>
                    </div>
                ) : !plan ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                        <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm font-bold">Ingresa un nicho y genera la estrategia.</p>
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
                                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                                    >
                                        {isSendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                        {isSendingBulk ? 'Enviando...' : '🎬 Mandar al Estudio IA'}
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
                {/* ─────────────────────────────────────────────────────────
                    RADAR DE CONTENIDO — AnswerThePublic Engine (Costo Cero)
                ───────────────────────────────────────────────────────── */}
                {showContentRadar && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-md" onClick={(e) => { if(e.target === e.currentTarget) setShowContentRadar(false); }}>
                        <div className="w-full max-w-5xl h-[90vh] bg-[#0d0d0c] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                            {/* Header */}
                            <div className="shrink-0 bg-gradient-to-r from-[#0f0f0e] to-[#141413] border-b border-white/5 p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#9D00FF]/20 border border-[#00F0FF]/30 flex items-center justify-center text-lg">🔍</div>
                                    <div>
                                        <h3 className="text-white font-black uppercase tracking-widest text-sm">Radar de Contenido</h3>
                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Búsquedas reales Google · Hashtags IA · Costo cero</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowContentRadar(false)} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-full transition-colors text-lg">×</button>
                            </div>

                            {/* Search Input */}
                            <div className="shrink-0 p-5 border-b border-white/5">
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                        </div>
                                        <input
                                            id="radar-topic-input"
                                            type="text"
                                            value={radarTopic}
                                            onChange={e => setRadarTopic(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && fetchContentRadar()}
                                            placeholder="Escribe un tema (ej: Marketing Digital, Inteligencia Artificial...)"
                                            className="w-full bg-[#1a1a19] border border-neutral-700 focus:border-[#00F0FF]/60 rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm font-light placeholder-neutral-600 outline-none transition-colors"
                                        />
                                    </div>
                                    <button
                                        onClick={fetchContentRadar}
                                        disabled={radarLoading || !radarTopic.trim()}
                                        className="bg-gradient-to-r from-[#00F0FF]/20 to-[#9D00FF]/20 hover:from-[#00F0FF]/40 hover:to-[#9D00FF]/40 border border-[#00F0FF]/40 text-[#00F0FF] font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
                                    >
                                        {radarLoading ? (
                                            <><span className="w-4 h-4 border-2 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin"/> Analizando...</>
                                        ) : (
                                            <>🔍 Analizar</>
                                        )}
                                    </button>
                                </div>
                                {radarData && (
                                    <p className="mt-2 text-[10px] text-neutral-500 font-bold">
                                        ✅ {radarData.totalQuestions} preguntas reales encontradas para <span className="text-[#00F0FF]">"{radarData.topic}"</span>
                                    </p>
                                )}
                            </div>

                            {/* Results */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {!radarData && !radarLoading && (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                                        <span className="text-6xl">🌐</span>
                                        <p className="text-white font-bold uppercase tracking-widest text-sm">Escribe un tema y presiona Analizar</p>
                                    </div>
                                )}

                                {radarLoading && (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 rounded-full border-2 border-[#00F0FF]/20 animate-ping"/>
                                            <div className="absolute inset-2 rounded-full border-2 border-[#9D00FF]/30 animate-ping" style={{animationDelay:'0.3s'}}/>
                                            <div className="w-full h-full rounded-full border-2 border-t-[#00F0FF] border-[#00F0FF]/10 animate-spin"/>
                                        </div>
                                        <p className="text-[#00F0FF] font-black uppercase tracking-widest text-xs animate-pulse">Escaneando Google + Generando Hashtags IA...</p>
                                    </div>
                                )}

                                {radarData && (
                                    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

                                        {/* COLUMNA 1: Hashtags generados por IA */}
                                        <div className="lg:col-span-1 flex flex-col gap-4">
                                            {/* Hashtags */}
                                            <div className="bg-gradient-to-br from-[#0f0f0e] to-[#141413] border border-[#9D00FF]/30 rounded-2xl p-4 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-[#9D00FF]/10 rounded-bl-full blur-xl"/>
                                                <div className="flex items-center justify-between mb-3 relative z-10">
                                                    <h4 className="text-[#9D00FF] font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                                                        <span>#</span> Hashtags IA ({radarData.hashtags.length})
                                                    </h4>
                                                    <button
                                                        onClick={copyHashtags}
                                                        className="text-[9px] font-black uppercase tracking-widest bg-[#9D00FF]/20 hover:bg-[#9D00FF]/40 border border-[#9D00FF]/40 text-[#9D00FF] px-3 py-1 rounded-full transition-all"
                                                    >
                                                        {radarCopied ? '✅ Copiado!' : '📋 Copiar todos'}
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 relative z-10">
                                                    {radarData.hashtags.map((tag, i) => {
                                                        const colors = [
                                                            'bg-[#9D00FF]/10 border-[#9D00FF]/30 text-[#9D00FF]',
                                                            'bg-[#00F0FF]/10 border-[#00F0FF]/30 text-[#00F0FF]',
                                                            'bg-[#FF0055]/10 border-[#FF0055]/30 text-[#FF0055]',
                                                            'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                                                            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
                                                        ];
                                                        const color = colors[i % colors.length];
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => navigator.clipboard.writeText(tag)}
                                                                title="Click para copiar"
                                                                className={`text-[10px] font-bold border px-2.5 py-1 rounded-full transition-all hover:scale-105 hover:brightness-125 whitespace-nowrap max-w-full truncate ${color}`}
                                                            >
                                                                {tag}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* AI Summary */}
                                            {radarData.aiSummary && (
                                                <div className="bg-gradient-to-br from-[#0f0f0e] to-[#141413] border border-[#00F0FF]/20 rounded-2xl p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#00F0FF]/5 rounded-bl-full blur-xl"/>
                                                    <h4 className="text-[#00F0FF] font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-1.5 relative z-10">
                                                        🧠 Análisis IA
                                                    </h4>
                                                    <p className="text-neutral-300 text-xs leading-relaxed font-light relative z-10">{radarData.aiSummary}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* COLUMNA 2-3: Preguntas de Google agrupadas */}
                                        <div className="lg:col-span-2 flex flex-col gap-4">
                                            {Object.keys(radarData.structured).map((modifier, mi) => (
                                                <div key={mi} className="bg-[#111]/60 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]"/>
                                                        {modifier}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {radarData.structured[modifier].map((q, qi) => (
                                                            <button
                                                                key={qi}
                                                                onClick={() => {
                                                                    // Al hacer click en una pregunta, la pone en el prompt del Planificador
                                                                    setNiche(q);
                                                                    setShowContentRadar(false);
                                                                }}
                                                                title="Click para usar como Nicho/Tema"
                                                                className="text-[11px] text-neutral-300 bg-black/40 hover:bg-[#00F0FF]/10 border border-white/5 hover:border-[#00F0FF]/40 hover:text-[#00F0FF] px-3 py-1.5 rounded-full transition-all text-left whitespace-nowrap max-w-full truncate"
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
    );
}
