import React, { useState, useRef, useEffect } from 'react';
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

const ELEVENLABS_VOICES = [
    { id: 'elevenlabs:ODO4sbmD3pTjhgRVVRP6', name: 'Sara (Cálida y Narradora)', preview: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/b4826acc45e3461bbb2bf80dbcd5a125/voices/ODO4sbmD3pTjhgRVVRP6/DkAbS58XmW8lYza30cB3.mp3' },
    { id: 'elevenlabs:tTQzD8U9VSnJgfwC6HbY', name: 'Nathalia (Dulce y Amistosa)', preview: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/3132161831d747b6b062491689ffb1fd/voices/tTQzD8U9VSnJgfwC6HbY/BwOSM6Ja6WIaCuQZzL8Y.mp3' },
    { id: 'elevenlabs:J4vZAFDEcpenkMp3f3R9', name: 'Valentina (Conversacional)', preview: 'https://storage.googleapis.com/eleven-public-prod/database/user/Yb0B8bJu9XhmTzORxR23RpxsDAb2/voices/J4vZAFDEcpenkMp3f3R9/w6dSSPdIpQ00o4yFIzlz.mp3' },
    { id: 'elevenlabs:9Godp7dNohUvXk6qp0gS', name: 'Regina (Contact Center)', preview: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/3ec0f756a64949d7971677b1e7afc31e/voices/9Godp7dNohUvXk6qp0gS/af31797a-9f1e-4e8e-a53b-2e6f18c9c9cb.mp3' },
    { id: 'elevenlabs:9y2QVHqoZ9f198GJJ99i', name: 'Tijuana La Iguana (Clonada)', preview: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/6419f23ed95a48e893bf771e6824a61b/voices/9y2QVHqoZ9f198GJJ99i/2de21a7d-397d-4056-9688-7f82e949f605.mp3' }
];

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
        // El AI devuelve días en orden desde el 1. idx es 0-indexed.
        // Si ya pasó el mes (ej. estamos en 16 de junio, y generamos junio), empezará desde el 16.
        // Pero para simplificar y mostrar lo que pide el usuario:
        const today = new Date();
        let targetDay = idx + 1;
        // Si el mes seleccionado es el mes actual, y el año es el actual, empezamos desde hoy.
        if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            targetDay = today.getDate() + idx;
        }
        const date = new Date(currentYear, currentMonth, targetDay);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const OPTIONS = [
        { key: 'ia',       label: 'Opción IA',       icon: 'smart_toy', desc: 'Generado automáticamente por Gemini', color: 'purple' },
        { key: 'template', label: 'Template Manual',  icon: 'description', desc: 'Usar estructura base propia',          color: 'blue'   },
        { key: 'skip',     label: 'Omitir día',       icon: 'block', desc: 'No enviar este día al calendario',    color: 'neutral' },
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
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                        active ? `${c.bg} ${c.border} ${c.text}` : 'bg-black/30 border-neutral-800 text-neutral-600 hover:text-neutral-400'
                                    }`}
                                >
                                    {active ? <CheckSquare className="w-3 h-3 shrink-0" /> : <Square className="w-3 h-3 shrink-0" />}
                                    <span className="material-symbols-outlined text-[12px] select-none shrink-0">{opt.icon}</span>
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
                    {sel === 'skip' ? (
                        <div className="p-8 text-center bg-black/40 rounded-xl mt-2 border border-neutral-800">
                            <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest">Día Omitido</p>
                            <p className="text-[10px] text-neutral-600 mt-1">Este contenido no se enviará al estudio.</p>
                        </div>
                    ) : sel === 'template' ? (
                        <div className="p-8 text-center bg-blue-950/20 rounded-xl mt-2 border border-blue-900/30">
                            <p className="text-blue-400 font-bold text-xs uppercase tracking-widest">Template Manual</p>
                            <p className="text-[10px] text-blue-500/70 mt-1">Se enviará el tema en blanco al Estudio IA para que lo llenes manualmente.</p>
                        </div>
                    ) : (
                        (day.scenes ? day.scenes : SCENE_COLUMNS).map((sceneData, i) => {
                            const isNewFormat = !!day.scenes;
                            const n = isNewFormat ? i + 1 : sceneData;
                            const narr = isNewFormat ? sceneData.narration : (day[COL(n).narracion] || '');
                            const txt  = isNewFormat ? sceneData.text_on_screen : (day[COL(n).texto] || '');
                            const vis  = isNewFormat ? sceneData.visual_prompt : (day[COL(n).visual] || '');
                            const aud  = isNewFormat ? sceneData.audio_sfx : '';
                            const vid  = isNewFormat ? sceneData.video_prompt : '';
                            
                            if (!narr && !vis) return null;
                            const isCTA = isNewFormat ? (i === day.scenes.length - 1) : (n === 5);
                            return (
                                <div key={n} className={`rounded-xl p-3 border mt-2 ${
                                    isCTA ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-black/30 border-neutral-800/50'
                                }`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1 ${
                                        isCTA ? 'text-emerald-400' : 'text-neutral-500'
                                    }`}>{isCTA ? <><span className="material-symbols-outlined text-[12px] select-none">target</span> Escena 5 — CTA</> : `Escena ${n}`}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[9px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">mic</span>
                                                Narración
                                            </p>
                                            <p className="text-xs text-neutral-300 leading-relaxed">{narr}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-blue-400 font-bold uppercase mb-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">image</span>
                                                Visual Prompt
                                            </p>
                                            <p className="text-xs text-neutral-400 font-mono leading-relaxed">{vis}</p>
                                        </div>
                                    </div>
                                    {txt && (
                                        <p className="text-[9px] text-yellow-400 font-bold mt-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px] select-none">chat</span>
                                            Pantalla: <span className="text-neutral-300 font-normal">{txt}</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
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
        const today = new Date();
        let targetDay = idx + 1;
        if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            targetDay = today.getDate() + idx;
        }
        const date = new Date(currentYear, currentMonth, targetDay);
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
                        onClick={(e) => { e.stopPropagation(); onSendToCalendar(day, idx); }}
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
                    {(day.scenes ? day.scenes : SCENE_COLUMNS).map((sceneData, i) => {
                        const isNewFormat = !!day.scenes;
                        const n = isNewFormat ? i + 1 : sceneData;
                        const isCTA = isNewFormat ? (i === day.scenes.length - 1) : (n === 5);
                        const narr = isNewFormat ? sceneData.narration : (day[COL(n).narracion] || '');
                        const txt  = isNewFormat ? sceneData.text_on_screen : (day[COL(n).texto] || '');
                        const aud  = isNewFormat ? sceneData.audio_sfx : (day[COL(n).audio] || '');
                        const vis  = isNewFormat ? sceneData.visual_prompt : (day[COL(n).visual] || '');
                        const vid  = isNewFormat ? sceneData.video_prompt : (day[COL(n).video] || '');
                        if (!narr && !vis && !vid && !txt && !aud) return null;
                        return (
                            <div key={n} className={`rounded-xl p-4 border mt-3 ${isCTA ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-black/40 border-neutral-800/50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${isCTA ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                                        {isCTA ? <><span className="material-symbols-outlined text-[12px] select-none">target</span> Escena 5 — CTA</> : `Escena ${n}`}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Narración */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">mic</span>
                                                Narración (TTS)
                                            </span>
                                            <p className="text-sm text-neutral-200 leading-relaxed">{narr}</p>
                                        </div>
                                        {/* Texto en Pantalla */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">chat</span>
                                                Texto Pantalla
                                            </span>
                                            <p className="text-sm text-neutral-200 font-bold leading-relaxed">{txt}</p>
                                        </div>
                                        {/* Audio y SFX */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">music_note</span>
                                                Audio & SFX
                                            </span>
                                            <p className="text-xs text-neutral-300 italic leading-relaxed">{aud}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/50">
                                        {/* Visual Prompt */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">image</span>
                                                Visual Prompt
                                            </span>
                                            <p className="text-xs text-neutral-400 font-mono leading-relaxed">{vis}</p>
                                        </div>
                                        {/* Video Motion Prompt */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] select-none">movie</span>
                                                Video Motion Prompt
                                            </span>
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
        const d = new Date(); 
        const m = d.toLocaleString('es', { month: 'long' });
        return m.charAt(0).toUpperCase() + m.slice(1);
    });
    const [year, setYear]             = useState(() => new Date().getFullYear());
    const [extraContext, setExtra]    = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Automático');
    const [playingVoice, setPlayingVoice] = useState(null);
    const [isGenerating, setGenerating] = useState(false);
    const [plan, setPlan]             = useState(null);
    const [durationDays, setDurationDays] = useState(1);
    const [generatedNiche, setGNiche] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSendingWebhook, setIsSendingWebhook] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    // ── Revisión Template vs IA ──
    const [reviewMode, setReviewMode]       = useState(false); // true = pantalla de revisión
    const [selections, setSelections]       = useState({});    // { idx: 'ia'|'template'|'skip' }
    const [isSendingBulk, setIsSendingBulk] = useState(false);
    const isSendingBulkRef = useRef(false);
    const [bulkResult, setBulkResult]       = useState(null);  // { sent, skipped }
    
    // ── Voice Selection (Auto Flow) ──
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [autoVoice, setAutoVoice]           = useState('edge:es-MX-JorgeNeural');
    const [customVoiceId, setCustomVoiceId]   = useState('');
    
    useEffect(() => {
        const prefillNiche = sessionStorage.getItem('godzilla_radar_niche');
        if (prefillNiche) {
            setNiche(prefillNiche);
            sessionStorage.removeItem('godzilla_radar_niche');
        }
    }, []);
    
    // ─── Radar de Contenido (AnswerThePublic Engine + Tendencias) ──────────
    const [showContentRadar, setShowContentRadar] = useState(false);
    const [radarTopic, setRadarTopic] = useState('');
    const [radarLoading, setRadarLoading] = useState(false);
    const [radarData, setRadarData] = useState(null);
    const [radarCopied, setRadarCopied] = useState(false);
    const [radarTab, setRadarTab] = useState('today'); // 'today' | 'search'
    const [dailyTrends, setDailyTrends] = useState([]);
    const [dailyTrendsLoading, setDailyTrendsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const fetchDailyTrends = async () => {
        setDailyTrendsLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${API}/api/studio/daily-trends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setDailyTrends(data.data);
            }
        } catch (e) {
            console.error('Error fetching daily trends:', e);
        } finally {
            setDailyTrendsLoading(false);
        }
    };

    const handleOpenContentRadar = () => {
        setShowContentRadar(true);
        if (dailyTrends.length === 0) {
            fetchDailyTrends();
        }
    };

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
        let currentNiche = niche.trim();
        if (!currentNiche) {
            alert('Por favor escribe un nicho primero, o usa "Explorar Radar" para buscar uno.');
            return;
        }

        setLoadingTrends(true);
        setPlannerTrends(null);
        try {
            const res = await fetch(`/api/studio/content-radar?topic=${encodeURIComponent(currentNiche)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                setPlannerTrends(data);
                if (data.audiencia && !extraContext) setExtra(data.audiencia);
                // Ya no forzamos la generación con un confirm.
                // El usuario podrá leer los trends y decidir si editar el Nicho o darle a "Generar".
            }
            else setPlannerTrends({ error: data.error || 'Sin datos de trends.' });
        } catch (e) {
            setPlannerTrends({ error: e.message });
        }
        setLoadingTrends(false);
    };

    const username    = adminProfile?.username?.toLowerCase() || '';
    const isSuperAdmin = adminProfile?.is_superadmin === true;
    const canEdit     = isSuperAdmin || username === 'alex' || username === 'oscar';

    const audioRef = React.useRef(null);
    const toggleVoicePreview = (voiceId, url) => {
        if (playingVoice === voiceId) {
            if (audioRef.current) audioRef.current.pause();
            setPlayingVoice(null);
            return;
        }
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(e => console.error("Audio play error", e));
        setPlayingVoice(voiceId);
        audio.onended = () => setPlayingVoice(null);
    };

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

    const handleGenerate = async (overrideNiche = null, overrideDays = null, overrideTrends = null) => {
        const finalNiche = (typeof overrideNiche === 'string' ? overrideNiche : niche) || '';
        const finalDays = overrideDays || durationDays;
        const finalTrends = overrideTrends || plannerTrends;

        if (!finalNiche.trim()) return alert('Por favor ingresa un nicho o producto.');
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
                body: JSON.stringify({ niche: finalNiche, month, year, extraContext, durationDays: finalDays, radarTrends: finalTrends }),
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
                                const totalBatches = Math.ceil(finalDays / 5);
                                const currentBatch = Math.ceil((statusData.progress || 1) / (100 / totalBatches));
                                setProgressText(`Generando plan (Lote ${currentBatch} de ${totalBatches})...`);
                                
                                // Live streaming del plan
                                if (statusData.partialPlan && statusData.partialPlan.length > 0) {
                                    const partialWithDates = statusData.partialPlan.map(d => ({ ...d, month, year }));
                                    setPlan(partialWithDates);
                                    setGNiche(finalNiche);
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
            let narrations = '';
            if (day.scenes && Array.isArray(day.scenes)) {
                narrations = day.scenes.map((s, i) => `Escena ${i+1}: ${s.narration}`).join('\n');
            } else {
                narrations = [1, 2, 3, 4, 5].map(n => {
                    const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
                    return day[key] ? `Escena ${n}: ${day[key]}` : null;
                }).filter(Boolean).join('\n');
            }

            const mediaPayload = {
                source: 'manual_planner',
                niche: generatedNiche || niche,
                month: month,
                year: year,
                scenes: day,
                voice: selectedVoice,
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

    const handleBulkSend = () => {
        if (!plan) return;
        // Sincronizar con el selector principal; si es Automático → Jorge MX por defecto
        const syncVoice = (selectedVoice === 'Automático' || !selectedVoice.startsWith('edge:'))
            ? 'edge:es-MX-JorgeNeural'
            : selectedVoice;
        setAutoVoice(syncVoice);
        setShowVoiceModal(true);
    };

    const confirmBulkSend = async (targetStatus = 'pending_render') => {
        if (isSendingBulkRef.current) return;
        isSendingBulkRef.current = true;
        setShowVoiceModal(false);
        setIsSendingBulk(true);
        let sent = 0, skipped = 0;
        const finalVoice = autoVoice === 'custom' ? `elevenlabs:${customVoiceId}` : autoVoice;
        for (let idx = 0; idx < plan.length; idx++) {
            const sel = selections[idx] || 'ia';
            if (sel === 'skip') { skipped++; continue; }
            try {
                await handleSendToCalendarSilent(plan[idx], idx, sel, finalVoice, targetStatus);
                sent++;
            } catch (_) { skipped++; }
        }
        isSendingBulkRef.current = false;
        setIsSendingBulk(false);
        setBulkResult({ sent, skipped });
        setReviewMode(false);
    };

    // Silent version (no alert) used by bulk send
    const handleSendToCalendarSilent = async (day, idx, sel = 'ia', voiceParam = null, targetStatus = 'pending_render') => {
        const token = localStorage.getItem('adminToken');
        const API   = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const now = new Date();
        const monthMap = { 'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11 };
        const currentYear  = parseInt(year) || now.getFullYear();
        const currentMonth = monthMap[(month||'').toLowerCase().trim()] ?? now.getMonth();
        const isoDate = new Date(currentYear, currentMonth, idx + 1).toISOString().split('T')[0];
        
        let narrations = '';
        let scenesData = { 'Tema': day['Tema'] };

        if (sel === 'ia') {
            if (day.scenes && Array.isArray(day.scenes)) {
                narrations = day.scenes.map((s, i) => `Escena ${i+1}: ${s.narration}`).join('\n');
            } else {
                narrations = [1,2,3,4,5].map(n => {
                    const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
                    return day[key] ? `Escena ${n}: ${day[key]}` : null;
                }).filter(Boolean).join('\n');
            }
            scenesData = day;
        } else {
            // Si es 'template', mandamos vacío para que lo edite a mano
            [1,2,3,4,5].forEach(n => {
                scenesData[`NARRACION ESCENA ${n === 5 ? '5 (CTA)' : n}`] = '';
                scenesData[`TEXTO EN PANTALLA ESCENA ${n}`] = '';
                scenesData[`VISUAL ESCENA ${n} (Prompt Imagen Detallado)`] = '';
            });
            narrations = '';
        }

        const mediaPayload = { source: sel === 'template' ? 'manual_planner' : 'ai_planner', niche: generatedNiche || niche, month, year, scenes: scenesData, voice: voiceParam };
        const res = await fetch(`${API}/api/studio/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                title: day['Tema'] || `Día ${idx+1}`,
                prompt: narrations,
                assigned_to: 'auto',
                tags: JSON.stringify([generatedNiche || niche || 'auto', 'ai-planner']),
                priority: 'Media',
                status: targetStatus,
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
        <>
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
                            <option value={1}>1 Día (Seguro)</option>
                            <option value={3}>3 Días</option>
                            <option value={5}>5 Días</option>
                            <option value={7}>1 Semana Máx.</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block mb-1.5">Voz Narrador</label>
                        <select
                            value={selectedVoice}
                            onChange={e => setSelectedVoice(e.target.value)}
                            disabled={!canEdit || isGenerating}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                            <option value="Automático">Automático (Jorge MX)</option>
                            <option value="edge:es-MX-JorgeNeural">🎙️ Jorge (Masculino MX)</option>
                            <option value="edge:es-MX-DaliaNeural">🎙️ Dalia (Femenino MX)</option>
                            <option value="edge:es-ES-AlvaroNeural">🎙️ Álvaro (Masculino ES)</option>
                            <option value="edge:es-ES-ElviraNeural">🎙️ Elvira (Femenino ES)</option>
                            <option value="edge:es-AR-TomasNeural">🎙️ Tomás (Masculino AR)</option>
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
                        onClick={handleOpenContentRadar}
                        className="bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all text-[10px] shrink-0 h-[42px] flex items-center gap-2 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                        title="Busca y explora temas antes de escribir el nicho"
                    >
                        <span className="material-symbols-outlined text-[14px] select-none">search</span> Explorar Radar
                    </button>

                    <button
                        onClick={fetchPlannerTrends}
                        disabled={loadingTrends || !niche.trim()}
                        className="bg-black border border-white/10 hover:border-white/30 text-white font-black uppercase tracking-widest px-5 py-2.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-all text-[10px] shrink-0 h-[42px]"
                        title="Carga hashtags y ganchos (requiere nicho)"
                    >
                        {loadingTrends ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span className="material-symbols-outlined text-[14px] select-none">local_fire_department</span> Estadísticas</>}
                    </button>

                    <button
                        onClick={handleGenerate}
                        disabled={!canEdit || isGenerating || !niche.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 text-white font-black uppercase tracking-widest px-8 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all text-sm shrink-0 h-[42px]"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isGenerating ? 'Generando...' : `Generar ${durationDays} Días`}
                    </button>

                    <button
                        onClick={() => {
                            if(window.confirm('¿Estás seguro de borrar toda la planificación actual y limpiar los campos?')) {
                                setPlan(null);
                                setPlannerTrends(null);
                                setNiche('');
                                setExtra('');
                                setReviewMode(false);
                            }
                        }}
                        disabled={isGenerating}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all text-[10px] shrink-0 h-[42px] flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                        title="Borrar todo y limpiar panel"
                    >
                        <span className="material-symbols-outlined text-[14px] select-none">delete</span> Limpiar
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
                                <p className="text-[10px] text-purple-400 font-bold uppercase mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] select-none">local_fire_department</span>
                                    Trending Hashtags <span className="text-neutral-500 lowercase normal-case text-[9px]">(click para usar)</span>
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {plannerTrends.hashtags.slice(0, 10).map((h, i) => (
                                        <span 
                                            key={i} 
                                            onClick={() => setExtra(prev => prev ? `${prev} ${h}` : h)}
                                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-neutral-300 cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-white transition-colors"
                                            title="Agregar al Contexto Extra"
                                        >
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {plannerTrends.hooks && plannerTrends.hooks.length > 0 && (
                            <div>
                                <p className="text-[10px] text-cyan-400 font-bold uppercase mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] select-none">anchor</span>
                                    Hooks Virales <span className="text-neutral-500 lowercase normal-case text-[9px]">(click para usar)</span>
                                </p>
                                <ul className="space-y-1.5">
                                    {plannerTrends.hooks.slice(0, 3).map((hook, i) => (
                                        <li 
                                            key={i} 
                                            onClick={() => setExtra(prev => prev ? `${prev} | ${hook}` : hook)}
                                            className="text-[11px] text-white flex items-start gap-2 leading-tight cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded transition-colors"
                                            title="Agregar al Contexto Extra"
                                        >
                                            <span className="material-symbols-outlined text-cyan-500 text-[10px] shrink-0 mt-0.5 select-none">arrow_forward</span> {hook}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {plannerTrends.audiencia && (
                            <div>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] select-none">target</span>
                                    Audiencia Objetivo Sugerida
                                </p>
                                <p className="text-[11px] text-emerald-100/80 leading-tight italic">{plannerTrends.audiencia}</p>
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
                                        <span className="material-symbols-outlined text-[16px] select-none text-purple-400">psychology</span>
                                        Revisión — <span className="text-purple-400">{generatedNiche}</span>
                                        <span className="text-[10px] bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                                            {plan.length} días
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-neutral-600 font-bold mt-1 flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px] select-none">smart_toy</span> {Object.values(selections).filter(v => v==='ia').length} IA</span> &nbsp;·&nbsp;
                                        <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px] select-none">description</span> {Object.values(selections).filter(v => v==='template').length} Template</span> &nbsp;·&nbsp;
                                        <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px] select-none">block</span> {Object.values(selections).filter(v => v==='skip').length} omitidos</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => handleSelectAll('ia')} className="text-[10px] px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg font-black hover:bg-purple-600/40 transition-colors flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px] select-none">smart_toy</span> Todo IA
                                    </button>
                                    <button onClick={() => handleSelectAll('template')} className="text-[10px] px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg font-black hover:bg-blue-600/40 transition-colors flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px] select-none">description</span> Todo Template
                                    </button>
                                    <button onClick={() => exportToCSV(plan, generatedNiche)} className="text-[10px] px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-black flex items-center gap-1 hover:bg-emerald-600/40 transition-colors">
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                    <button
                                        onClick={handleBulkSend}
                                        disabled={isSendingBulk || !canEdit}
                                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                                    >
                                        {isSendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                        {isSendingBulk ? 'Enviando...' : <><span className="material-symbols-outlined text-xs select-none">movie</span> Mandar al Estudio IA</>}
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
                                <p className="text-sm font-black text-white flex items-center gap-1">
                                    <span className="material-symbols-outlined text-purple-400 text-[16px] select-none">calendar_month</span> Plan: <span className="text-purple-400">{generatedNiche}</span> · {plan.length} días
                                </p>
                                {bulkResult && (
                                    <p className="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-emerald-400 text-xs select-none">check_circle</span> {bulkResult.sent} días enviados · {bulkResult.skipped} omitidos
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setReviewMode(true)} className="text-xs text-purple-400 hover:text-purple-300 font-bold border border-purple-500/30 px-3 py-1.5 rounded-lg bg-purple-600/10 transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs select-none">search</span> Revisar Plan
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
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#9D00FF]/20 border border-[#00F0FF]/30 flex items-center justify-center text-lg">
                                        <span className="material-symbols-outlined text-[#00F0FF] select-none">search</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase tracking-widest text-sm">Radar de Contenido</h3>
                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Búsquedas reales Google · Hashtags IA · Costo cero</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowContentRadar(false)} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-full transition-colors text-lg">×</button>
                            </div>

                            {/* Tabs */}
                            <div className="shrink-0 bg-black/40 border-b border-white/5 px-5 py-2.5 flex items-center gap-2">
                                <button
                                    onClick={() => setRadarTab('today')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        radarTab === 'today'
                                            ? 'bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                                            : 'bg-transparent border border-transparent text-neutral-500 hover:text-neutral-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[14px] select-none">local_fire_department</span> Tendencias de Hoy
                                </button>
                                <button
                                    onClick={() => setRadarTab('search')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        radarTab === 'search'
                                            ? 'bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                                            : 'bg-transparent border border-transparent text-neutral-500 hover:text-neutral-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[14px] select-none">search</span> Explorar Radar
                                </button>
                            </div>

                            {/* Category Filter Pills (only when tab is today) */}
                            {radarTab === 'today' && dailyTrends.length > 0 && (
                                <div className="shrink-0 px-5 py-4 border-b border-white/5 bg-black/20 flex flex-wrap gap-2 items-center">
                                    <span className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mr-2">Filtrar por:</span>
                                    {['All', ...new Set(dailyTrends.map(t => t.category).filter(Boolean))].map((cat, ci) => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                                                selectedCategory === cat
                                                    ? 'bg-purple-600/30 border-purple-500/50 text-purple-400'
                                                    : 'bg-[#111] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                                            }`}
                                        >
                                            {cat === 'All' ? <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs select-none">language</span> Todas las categorías</span> : cat}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Search Input (only when tab is search) */}
                            {radarTab === 'search' && (
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
                                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] select-none">search</span> Analizar</span>
                                            )}
                                        </button>
                                    </div>
                                    {radarData && (
                                        <p className="mt-2 text-[10px] text-neutral-500 font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-emerald-400 text-xs select-none">check_circle</span> {radarData.totalQuestions} preguntas reales encontradas para <span className="text-[#00F0FF]">"{radarData.topic}"</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Results */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {radarTab === 'search' && (
                                    <>
                                        {!radarData && !radarLoading && (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 min-h-[30vh]">
                                                <span className="material-symbols-outlined text-neutral-800 text-[64px] select-none">language</span>
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
                                                                className="text-[9px] font-black uppercase tracking-widest bg-[#9D00FF]/20 hover:bg-[#9D00FF]/40 border border-[#9D00FF]/40 text-[#9D00FF] px-3 py-1.5 rounded-full transition-all flex items-center gap-1"
                                                            >
                                                                {radarCopied ? <><span className="material-symbols-outlined text-[10px] select-none">check_circle</span> Copiado!</> : <><span className="material-symbols-outlined text-[10px] select-none">content_copy</span> Copiar todos</>}
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
                                                                <span className="material-symbols-outlined text-[12px] select-none">psychology</span> Análisis IA
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
                                                                            setNiche(q);
                                                                            if (radarData.audiencia && !extraContext) setExtra(radarData.audiencia);
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
                                    </>
                                )}

                                {radarTab === 'today' && (
                                    <>
                                        {dailyTrendsLoading && (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 min-h-[40vh]">
                                                <div className="relative w-20 h-20">
                                                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping"/>
                                                    <div className="absolute inset-2 rounded-full border-2 border-[#00F0FF]/30 animate-ping" style={{animationDelay:'0.3s'}}/>
                                                    <div className="w-full h-full rounded-full border-2 border-t-purple-500 border-purple-500/10 animate-spin"/>
                                                </div>
                                                <p className="text-purple-400 font-black uppercase tracking-widest text-xs animate-pulse">Cargando Tendencias del Día en México...</p>
                                            </div>
                                        )}

                                        {!dailyTrendsLoading && dailyTrends.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 min-h-[40vh]">
                                                <span className="material-symbols-outlined text-neutral-800 text-[64px] select-none">inbox</span>
                                                <p className="text-white font-bold uppercase tracking-widest text-sm">No se encontraron tendencias hoy.</p>
                                            </div>
                                        )}

                                        {!dailyTrendsLoading && dailyTrends.length > 0 && (
                                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                {dailyTrends
                                                    .filter(trend => selectedCategory === 'All' || trend.category === selectedCategory)
                                                    .map((trend, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="group bg-gradient-to-br from-[#111] to-[#151515] hover:from-[#151515] hover:to-[#1b1b1b] border border-white/5 hover:border-purple-500/30 rounded-2xl p-5 transition-all flex flex-col justify-between hover:shadow-[0_0_20px_rgba(168,85,247,0.05)] hover:scale-[1.01]"
                                                        >
                                                            <div className="space-y-4">
                                                                {/* Header */}
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest rounded-md">
                                                                        {trend.category || 'General'}
                                                                    </span>
                                                                    <span className="text-[10px] text-neutral-500 font-bold flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-xs select-none">analytics</span> {trend.traffic || '50K+ búsquedas'}
                                                                    </span>
                                                                </div>

                                                                {/* Title */}
                                                                <div>
                                                                    <h4 className="text-white font-black text-base group-hover:text-purple-400 transition-colors uppercase leading-tight">
                                                                        {trend.topic}
                                                                    </h4>
                                                                </div>

                                                                {/* Engagement Stats Grid */}
                                                                <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/5 rounded-xl p-2.5">
                                                                    <div className="text-center">
                                                                        <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Vistas</span>
                                                                        <span className="text-xs text-white font-black">{trend.views || '1.2M vistas est.'}</span>
                                                                    </div>
                                                                    <div className="text-center border-x border-white/5">
                                                                        <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Reacc.</span>
                                                                        <span className="text-xs text-yellow-400 font-black flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-yellow-500 text-xs select-none">favorite</span> {trend.reactions || '90K'}</span>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Comp.</span>
                                                                        <span className="text-xs text-cyan-400 font-black flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-cyan-400 text-xs select-none">send</span> {trend.shares || '30K'}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Hook */}
                                                                <div className="space-y-1 bg-purple-950/10 border border-purple-900/10 rounded-xl p-3">
                                                                    <span className="text-[8px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px] select-none">anchor</span> Gancho sugerido</span>
                                                                    <p className="text-xs text-neutral-300 font-medium italic leading-relaxed">
                                                                        "{trend.hook}"
                                                                    </p>
                                                                </div>

                                                                {/* Idea */}
                                                                <div className="space-y-1">
                                                                    <span className="text-[8px] text-neutral-500 font-black uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px] select-none">lightbulb</span> Idea de video</span>
                                                                    <p className="text-xs text-neutral-400 leading-relaxed font-light">
                                                                        {trend.idea}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Action Button */}
                                                            <div className="pt-4 mt-4 border-t border-white/5">
                                                                <button
                                                                    onClick={() => {
                                                                        setNiche(trend.topic);
                                                                        setExtra(`Gancho: ${trend.hook}. Idea: ${trend.idea}`);
                                                                        setShowContentRadar(false);
                                                                    }}
                                                                    className="w-full bg-purple-600/15 hover:bg-purple-600 hover:text-white border border-purple-500/30 text-purple-400 font-black uppercase tracking-wider text-[10px] py-2.5 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                                                                >
                                                                    <span className="material-symbols-outlined text-xs select-none">movie</span> Planificar Video
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* ─────────────────────────────────────────────────────────
                    MODAL DE SELECCIÓN DE VOZ (FLUJO AUTO)
                ───────────────────────────────────────────────────────── */}
                {showVoiceModal && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="text-white font-black text-lg mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-purple-400 select-none">mic</span> Selecciona el Narrador (Auto)</h3>
                            <p className="text-xs text-neutral-400 mb-6">Elige la voz que narrará este lote de videos generados.</p>
                            
                            <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {[
                                    { id: 'edge:es-MX-JorgeNeural',  name: '🎙️ Jorge',  desc: 'Masculino · México · Defecto' },
                                    { id: 'edge:es-MX-DaliaNeural',  name: '🎙️ Dalia',  desc: 'Femenino · México' },
                                    { id: 'edge:es-ES-AlvaroNeural', name: '🎙️ Álvaro', desc: 'Masculino · España' },
                                    { id: 'edge:es-ES-ElviraNeural', name: '🎙️ Elvira', desc: 'Femenino · España' },
                                    { id: 'edge:es-AR-TomasNeural',  name: '🎙️ Tomás',  desc: 'Masculino · Argentina' },
                                ].map(v => (
                                    <label key={v.id} className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${autoVoice === v.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20 bg-black/50'}`}>
                                        <div className="flex items-center justify-between gap-3 w-full">
                                            <div className="flex items-center gap-3">
                                                <input type="radio" name="voice" value={v.id} checked={autoVoice === v.id} onChange={(e) => setAutoVoice(e.target.value)} className="accent-purple-500" />
                                                <div>
                                                    <p className={`text-sm font-bold ${autoVoice === v.id ? 'text-purple-400' : 'text-white'}`}>{v.name}</p>
                                                    <p className="text-[10px] text-neutral-500">{v.desc}</p>
                                                </div>
                                            </div>
                                            {v.preview && (
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.preventDefault(); toggleVoicePreview(v.id, v.preview); }}
                                                    className="p-2 rounded-full bg-black/40 hover:bg-purple-500/20 text-neutral-400 hover:text-purple-400 border border-white/5 transition-colors"
                                                    title="Escuchar Demo"
                                                >
                                                    {playingVoice === v.id ? (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </label>
                                ))}

                            </div>

                            <div className="flex items-center justify-end gap-3 mt-4">
                                <button onClick={() => setShowVoiceModal(false)} className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={() => confirmBulkSend('pending')} disabled={isSendingBulk} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">description</span> Solo Guardar Guiones
                                </button>
                                <button onClick={() => confirmBulkSend('pending_render')} disabled={isSendingBulk} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2">
                                    {isSendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {isSendingBulk ? 'Enviando...' : <span className="flex items-center gap-1">Producir con IA <span className="material-symbols-outlined text-xs select-none">rocket_launch</span></span>}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
