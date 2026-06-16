import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import VideoEditorModal from './VideoEditorModal';

const STATUS_MAP = {
    pending_cm_approval:   { label: 'En Revisión',    tab: 'pendientes',    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    rejected:              { label: 'Devuelta',       tab: 'devueltas',     color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    approved:              { label: 'Aprobada',       tab: 'aprobadas',     color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    published:             { label: 'Publicada',      tab: 'aprobadas',     color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    manual_studio:         { label: 'En Estudio IA',  tab: 'manual_studio', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    pending_render:        { label: 'Encolado',       tab: 'manual_studio', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    pending_render_docker: { label: 'Encolado (Worker)',tab: 'manual_studio', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    rendering:             { label: 'Renderizando',   tab: 'manual_studio', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    rendering_docker:      { label: 'Renderizando (Worker)', tab: 'manual_studio', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    failed_docker:         { label: 'Error de Motor', tab: 'manual_studio', color: 'text-red-100 bg-red-600 border-red-600' },
};

// Extrae escenas legibles de cualquier formato de payload
function extractReadableScenes(mediaOptions) {
    if (!mediaOptions || Array.isArray(mediaOptions)) return null;
    const scenes = mediaOptions.scenes;
    if (!scenes || typeof scenes !== 'object') return null;

    // Formato simple del script manual (manual_cockers): { "VISUAL ESCENA 1 ...": "...", "NARRACION ESCENA 1": "..." }
    // Formato del Planificador (ai_planner/manual_planner): 26 columnas del Sheets
    const result = [];
    for (let n = 1; n <= 5; n++) {
        const isLast = n === 5;
        const narrKey = isLast ? `NARRACION ESCENA 5 (CTA)` : `NARRACION ESCENA ${n}`;
        const visualKey = `VISUAL ESCENA ${n} (Prompt Imagen Detallado)`;
        const videoKey  = `VIDEO ESCENA ${n} (Prompt Movimiento Detallado)`;
        const textoKey  = `TEXTO EN PANTALLA ESCENA ${n}`;
        const narr  = scenes[narrKey]  || '';
        const visual = scenes[visualKey] || scenes[videoKey] || '';
        const texto  = scenes[textoKey] || '';
        if (narr || visual) {
            result.push({ n, isCTA: isLast, narr, visual, texto });
        }
    }
    return result.length > 0 ? result : null;
}

const getBackendUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://bot.godzillaconsulting.ai';
};

const API_URL = getBackendUrl();

const resolveMedia = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
            try {
                const urlObj = new URL(url);
                return `${API_URL}${urlObj.pathname}${urlObj.search}`;
            } catch(e) { /* ignore */ }
        }
        return url;
    }
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const RenderProgress = ({ progress, msg }) => {
    // Si no hay progreso real, usa un contador falso visual
    const [p, setP] = React.useState(0);
    React.useEffect(() => {
        if (progress !== undefined) return;
        const int = setInterval(() => {
            setP(old => old >= 99 ? 99 : old + Math.floor(Math.random() * 5) + 1);
        }, 2000);
        return () => clearInterval(int);
    }, [progress]);
    
    const displayP = progress !== undefined ? progress : p;
    const displayMsg = msg || "Ensamblando";
    return (
        <div className="w-full flex flex-col items-center justify-center h-full">
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f97316" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * p) / 100} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-orange-400">{displayP}%</span>
                    <span className="text-[10px] text-orange-500/70 uppercase font-bold mt-1 tracking-widest text-center px-2">{displayMsg}</span>
                </div>
            </div>
            <p className="text-orange-300 font-bold tracking-widest uppercase text-sm mb-2">MediaWorker Produciendo</p>
            <p className="text-neutral-500 text-xs max-w-sm text-center leading-relaxed">
                Generando imágenes ultra-realistas, sintetizando voz neural y uniendo las escenas con FFmpeg. Por favor espera...
            </p>
        </div>
    );
};


export default function CeoEstudioPanel({ adminProfile }) {
    const [activeTab, setActiveTab] = useState('pendientes');
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [selected, setSelected]   = useState(null);
    const [feedback, setFeedback]   = useState('');
    const [network, setNetwork]     = useState('instagram');
    const [caption, setCaption]     = useState('');
    const [publishMode, setPublishMode] = useState('now');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [showPublish, setShowPublish] = useState(false);
    const [publishing, setPublishing]   = useState(false);
    const [publishReport, setPublishReport] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editorData, setEditorData] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [refFileUrl, setRefFileUrl]   = useState('');
    const [refFileType, setRefFileType] = useState('');
    const [uploadingRef, setUploadingRef] = useState(false);
    const evtRef = useRef(null);

    useEffect(() => {
        setVideoError(false);
        setRefFileUrl('');
        setRefFileType('');
        setUploadingRef(false);
    }, [selected]);

    const username  = adminProfile?.username?.toLowerCase() || '';
    const isCockers = adminProfile?.role === 'cockers' || username === 'alex' || username === 'cockers';
    
    // Solo Judith, Oscar, Alex, Godzilla_admin, y Test pueden modificar/publicar
    const canReview  = ['judith', 'oscar', 'alex', 'godzilla_admin', 'test', 'admin'].includes(username) || adminProfile?.is_superadmin;
    const canPublish = ['judith', 'oscar', 'alex', 'godzilla_admin', 'test', 'admin'].includes(username) || adminProfile?.is_superadmin;
    
    // Alex debe dejar nota al APROBAR; Judith no
    const approveNeedsReason = isCockers;

    const token = localStorage.getItem('adminToken');

    // ── Fetch real tasks ──────────────────────────────────────
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/studio/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTasks(data.tasks.map(t => ({
                    id: t.id,
                    status: t.status,
                    caption: t.title,
                    prompt: t.prompt,
                    scheduled_for: t.ig_publish_date,
                    uploader: t.assigned_to || 'desconocido',
                    created_at: t.created_at,
                    media_options: (() => {
                        try { return typeof t.media_payload === 'string' ? JSON.parse(t.media_payload) : (t.media_payload || []); }
                        catch { return []; }
                    })(),
                    feedback: t.feedback_notes || ''
                })));
            }
        } catch (e) { console.error('[CEO] fetch tasks error', e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();

        // ── SSE: real-time sync con CockersStudio y CMCalendar ──
        const evtSource = new EventSource(`/api/studio/tasks/stream?token=${token}`);
        evtRef.current = evtSource;
        evtSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'CREATE' && data.task) {
                    const t = data.task;
                    const mapped = {
                        id: t.id, status: t.status, caption: t.title, prompt: t.prompt,
                        scheduled_for: t.ig_publish_date, uploader: t.assigned_to,
                        created_at: t.created_at,
                        media_options: (() => { try { return typeof t.media_payload === 'string' ? JSON.parse(t.media_payload) : (t.media_payload || []); } catch { return []; } })(),
                    };
                    setTasks(prev => [mapped, ...prev.filter(x => x.id !== t.id)]);
                } else if (data.type === 'UPDATE' && data.task) {
                    const t = data.task;
                    setTasks(prev => prev.map(x => x.id === t.id
                        ? { ...x, status: t.status, scheduled_for: t.ig_publish_date,
                            media_options: (() => { try { return typeof t.media_payload === 'string' ? JSON.parse(t.media_payload) : (t.media_payload || []); } catch { return []; } })() }
                        : x));
                } else if (data.type === 'PROGRESS' && data.task) {
                    setTasks(prev => prev.map(x => x.id === data.task.taskId 
                        ? { ...x, renderProgress: data.task.progress, renderMsg: data.task.msg } 
                        : x));
                } else if (data.type === 'NOTIFICATION') {
                    if (data.task?.message) {
                        const newNotif = { id: Date.now(), text: data.task.message };
                        setNotifications(prev => [...prev, newNotif]);
                        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 6000);
                    }
                }
            } catch {}
        };
        return () => evtSource.close();
    }, []);

    // ── Tecla ESQ para cerrar modales ──────────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showPublish) setShowPublish(false);
                else if (selected) setSelected(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPublish, selected]);

    // ── Action: approve / reject ──────────────────────────────
    const handleAction = async (action, customFeedback = null) => {
        if (!selected) return;
        if (actionLoading) return;
        
        // Priorizar el texto personalizado del usuario en el textarea (feedback).
        // Si el textarea está vacío, usar el customFeedback del botón como fallback.
        const currentFeedback = feedback.trim() 
            ? (feedback.trim() + (customFeedback ? ` (${customFeedback})` : ''))
            : (customFeedback || '');
            
        if ((action === 'reject' || action === 'auto_regenerate') && !currentFeedback.trim() && !refFileUrl) {
            alert('Debes escribir notas de corrección o adjuntar un archivo de referencia.');
            return;
        }

        let finalTitle = selected.caption || selected.title;

        if (action === 'approve' && approveNeedsReason) {
            const nota = window.prompt(
                `📝 ¿Por qué apruebas este activo?\n\n` +
                `(Ej: "Acordado con Judith / Urgente campaña")\n\n` +
                `Esta nota quedará en el registro del equipo:`
            );
            if (nota === null) return; // Canceló
            if (!nota.trim()) {
                alert('⚠️ La nota es obligatoria para aprobar directamente.');
                return;
            }
            finalTitle = nota.trim();
        }

        let newStatus = 'rejected';
        if (action === 'approve') newStatus = 'approved';
        else if (action === 'auto_regenerate') newStatus = 'pending_render_docker';

        let updatedMediaPayload = selected.media_options;
        if (refFileUrl) {
            updatedMediaPayload = Array.isArray(selected.media_options)
                ? selected.media_options.map((m, idx) => idx === 0 ? { ...m, refImage: refFileUrl } : m)
                : { ...selected.media_options, refImage: refFileUrl };
        }

        const savedFeedback = currentFeedback.trim() || (refFileUrl ? 'Rehacer con referencia visual' : '');

        setActionLoading(true);
        try {
            const res = await fetch(`/api/studio/tasks/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    status: newStatus, 
                    title: finalTitle,
                    feedback_notes: savedFeedback,
                    media_payload: updatedMediaPayload
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || data.error || 'Error del servidor');
            setTasks(prev => prev.map(t => t.id === selected.id ? { 
                ...t, 
                status: newStatus, 
                caption: finalTitle, 
                media_options: updatedMediaPayload,
                feedback: savedFeedback
            } : t));
            setSelected(null);
            setFeedback('');
            setRefFileUrl('');
            setRefFileType('');
        } catch (e) { 
            console.error('[CEO] handleAction error:', e);
            alert('Error al procesar: ' + e.message); 
        } finally {
            setActionLoading(false);
        }
    };

    // ── Action: publish ───────────────────────────────────────
    const handlePublish = async () => {
        if (!selected || !selected.media_options?.[0]?.url) return;
        
        let finalStatus = 'published';
        let publishDate = null;
        if (publishMode === 'schedule') {
            finalStatus = 'approved';
            if (!scheduleDate || !scheduleTime) {
                alert('Debes seleccionar una fecha y hora para programar.');
                return;
            }
            publishDate = `${scheduleDate}T${scheduleTime}:00`;
        }

        setPublishing(true);
        try {
            // Convertir URLs relativas (/api/sora/media/...) a absolutas para que Meta pueda acceder
            const BASE_URL = 'https://godzillaconsulting.ai';
            const absoluteMedia = selected.media_options.map(m => ({
                ...m,
                url: m.url?.startsWith('http') ? m.url : `${BASE_URL}${m.url}`
            }));

            const payload = {
                status: finalStatus,
                publish_targets: [network],
                media_payload: absoluteMedia,
                title: caption || selected.caption || ''
            };
            
            if (publishDate) {
                payload.ig_publish_date = publishDate;
            }

            const res = await fetch(`/api/studio/tasks/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || data.error);
            setPublishReport(data.report || { message: publishMode === 'schedule' ? 'Programado correctamente en calendario.' : 'Iniciado proceso de publicación.' });
            setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, status: finalStatus, scheduled_for: publishDate || t.scheduled_for } : t));
        } catch (e) { 
            setPublishReport({ error: true, message: e.message }); 
        }
        setPublishing(false);
    };

    // ── Action: delete task ───────────────────────────────────
    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm('¿Eliminar este activo permanentemente? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/studio/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTasks(prev => prev.filter(t => t.id !== id));
                if (selected?.id === id) {
                    setSelected(null);
                    setShowPublish(false);
                }
            } else {
                alert('Error al eliminar.');
            }
        } catch (e) { alert('Error: ' + e.message); }
    };

    // ── Action: unpublish (dar de baja de aprobadas) ──────────
    const handleUnpublish = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm('¿Dar de baja este activo? Volverá a pendientes para su revisión.')) return;
        try {
            const res = await fetch(`/api/studio/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'pending_cm_approval' })
            });
            const data = await res.json();
            if (data.success) {
                setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending_cm_approval' } : t));
                if (selected?.id === id) setSelected(null);
            }
        } catch (e) { alert('Error: ' + e.message); }
    };


    // ── Filtered view ─────────────────────────────────────────
    const tabStatuses = {
        pendientes:    ['pending_cm_approval'],
        manual_studio: ['manual_studio', 'pending_render', 'rendering', 'pending_render_docker', 'rendering_docker', 'failed_docker'],
        ia_backlog:    ['backlog'],
        devueltas:     ['rejected'],
        aprobadas:     ['approved', 'published'],
    };
    const visible = tasks.filter(t => (tabStatuses[activeTab] || []).includes(t.status));

    // ── Counts ────────────────────────────────────────────────
    const counts = {
        pendientes:    tasks.filter(t => t.status === 'pending_cm_approval').length,
        manual_studio: tasks.filter(t => ['manual_studio','pending_render','rendering','pending_render_docker','rendering_docker','failed_docker'].includes(t.status)).length,
        ia_backlog:    tasks.filter(t => t.status === 'backlog').length,
        devueltas:     tasks.filter(t => t.status === 'rejected').length,
        aprobadas:     tasks.filter(t => ['approved','published'].includes(t.status)).length,
    };

    // ── Enviar a MediaWorker (desde bandeja manual_studio) ────
    const handleSendToMediaWorker = async () => {
        if (!selected) return;
        if (!window.confirm('¿Iniciar generación automática con el MediaWorker IA? Se ensamblará con voz + imágenes en ~2 min.')) return;
        try {
            const res = await fetch(`/api/studio/tasks/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'pending_render' })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'pending_render' } : t));
            setSelected(prev => ({ ...prev, status: 'pending_render' }));
        } catch (e) { alert('Error: ' + e.message); }
    };

    const firstMedia = Array.isArray(selected?.media_options) ? selected.media_options[0] : null;
    const isAutoVideo = selected && !Array.isArray(selected.media_options) && selected.media_options?.scenes;
    const isVideo = firstMedia?.isVideo || firstMedia?.url?.match(/\.(mp4|webm|mov)$/i);

    const handleUpdateSchedule = async (e) => {
        const localVal = e.target.value;
        if (!localVal) return;
        const isoDate = new Date(localVal).toISOString();
        try {
            await fetch(`/api/studio/tasks/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ig_publish_date: isoDate })
            });
            setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, scheduled_for: isoDate } : t));
            setSelected(prev => ({...prev, scheduled_for: isoDate}));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 bg-black text-white overflow-hidden relative">
            {/* Ambient Orb */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d946ef]/10 rounded-full blur-[120px] pointer-events-none" />

            {showEditor && (
                <VideoEditorModal queue={editorData} onClose={() => setShowEditor(false)} />
            )}

            {/* ── Header ── */}
            <div className="mb-6 border-b border-[#d946ef]/30 pb-4 shrink-0 relative z-10 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-widest text-[#d946ef] drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#d946ef] text-[28px] select-none flex items-center justify-center">gavel</span> CEO ESTUDIO
                    </h2>
                    <p className="text-sm text-neutral-400 mt-1 uppercase tracking-widest">
                        Flujo de Aprobación y Publicación — Conectado al Estudio IA
                    </p>
                </div>
                <button onClick={fetchTasks}
                    className="text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                    Sincronizar
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-2 mb-6 shrink-0 z-10 relative flex-wrap">
                {[
                    { id: 'pendientes',    label: 'Pendientes por Revisar',    icon: 'hourglass_empty' },
                    { id: 'manual_studio', label: 'En Estudio IA',             icon: 'movie' },
                    { id: 'ia_backlog',    label: 'Bandeja IA (Autogenerados)', icon: 'smart_toy' },
                    { id: 'devueltas',     label: 'Devueltas',                  icon: 'undo' },
                    { id: 'aprobadas',     label: 'Aprobadas / Publicadas',     icon: 'check_circle' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative px-4 py-2.5 rounded-xl font-black text-sm transition-all border flex items-center gap-2 ${
                            activeTab === tab.id
                                ? tab.id === 'manual_studio'
                                    ? 'bg-cyan-500 border-cyan-500 text-white shadow-md'
                                    : 'bg-[#d946ef] border-[#d946ef] text-white shadow-md'
                                : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-[#d946ef]/50'
                        }`}>
                        <span className="material-symbols-outlined text-[18px] select-none">{tab.icon}</span> {tab.label}
                        {counts[tab.id] > 0 && (
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black text-white ${
                                tab.id === 'manual_studio' ? 'bg-cyan-600' :
                                ['pendientes', 'ia_backlog'].includes(tab.id) ? 'bg-[#CC0000]' : 'bg-[#d946ef]'
                            }`}>
                                {counts[tab.id]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Pipeline Connection Notice ── */}
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold text-neutral-600 uppercase tracking-widest shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#CC0000] animate-pulse" />
                🤖 Estudio IA
                <span className="text-neutral-800">──────</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#d946ef]" />
                👑 CEO Estudio
                <span className="text-neutral-800">──────</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                📅 Calendario Global
                <span className="ml-2 text-green-500/60">Canal SSE en vivo</span>
            </div>

            {/* ── Grid ── */}
            <div className="flex-1 overflow-y-auto z-10 relative grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10 custom-scrollbar">
                {loading && (
                    <div className="col-span-full h-64 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-[#d946ef]/30 border-t-[#d946ef] rounded-full animate-spin" />
                    </div>
                )}

                {!loading && visible.length === 0 && (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl">
                        <span className="material-symbols-outlined text-neutral-800 text-[48px] mb-3 select-none">inbox</span>
                        <p className="font-bold uppercase tracking-widest text-sm">Bandeja vacía</p>
                        <p className="text-xs text-neutral-700 mt-1">
                            {activeTab === 'pendientes' ? 'Alex aún no ha enviado nada a revisión.' : 'No hay contenido en esta sección.'}
                        </p>
                    </div>
                )}

                {!loading && visible.map(item => {
                    const isGridAuto = !Array.isArray(item.media_options) && item.media_options?.scenes;
                    const media = Array.isArray(item.media_options) ? item.media_options[0] : null;
                    const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' };
                    return (
                        <div key={item.id} onClick={() => { setSelected(item); setFeedback(''); setPublishReport(null); }}
                            className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-[#d946ef]/60 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col group relative">
                            <div className="h-40 bg-black flex items-center justify-center overflow-hidden relative">
                                {media?.url ? (
                                    media.isVideo || media.url.match(/\.(mp4|webm|mov)$/i) ? (
                                        <video src={resolveMedia(media.url)} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" muted playsInline />
                                    ) : (
                                        <img src={resolveMedia(media.url)} alt="Media" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                    )
                                ) : isGridAuto ? (
                                    <div className="flex flex-col items-center justify-center text-neutral-400">
                                        <span className="material-symbols-outlined text-[#d946ef] text-[36px] mb-1 select-none">description</span>
                                        <span className="text-[10px] font-bold uppercase text-center px-4">Guion de Video<br/>(Renderizando)</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <span className="material-symbols-outlined text-neutral-600 text-[28px] mb-1 select-none">image</span>
                                        <span className="text-[9px] font-bold uppercase">Sin preview</span>
                                    </div>
                                )}
                                <div className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                                    {statusInfo.label}
                                </div>

                                {/* Botones de acción rápida — aparecen en hover */}
                                {canReview && (
                                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Dar de baja — solo en aprobadas/publicadas */}
                                        {(item.status === 'approved' || item.status === 'published') && (
                                            <button
                                                onClick={(e) => handleUnpublish(item.id, e)}
                                                title="Dar de baja (volver a pendientes)"
                                                className="w-7 h-7 rounded-full bg-yellow-500/20 hover:bg-yellow-500 border border-yellow-500/40 text-yellow-400 hover:text-black text-[10px] font-black flex items-center justify-center transition-all"
                                            >↩</button>
                                        )}
                                        {/* Borrar permanentemente */}
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            title="Eliminar permanentemente"
                                            className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500 border border-red-500/40 text-red-400 hover:text-white text-[11px] font-black flex items-center justify-center transition-all"
                                        >✕</button>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between">
                                <p className="text-xs text-white font-bold line-clamp-2 mb-1">{item.caption || item.prompt || '(Sin título)'}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <p className="text-[9px] text-neutral-600 uppercase tracking-wider">por {item.uploader}</p>
                                    <p className="text-[9px] text-neutral-700">{item.created_at ? new Date(item.created_at).toLocaleDateString('es-MX', {month:'short', day:'numeric'}) : ''}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── MODAL DE REVISIÓN ── */}
            {selected && !showPublish && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-700 w-full max-w-5xl h-[88vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(217,70,239,0.15)]">

                        {/* Visualizador */}
                        <div className="flex-1 bg-black flex items-center justify-center relative p-4 min-h-[50%] overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center overflow-y-auto p-4 custom-scrollbar">
                                {firstMedia?.url ? (
                                    videoError ? (
                                        <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-2xl max-w-sm">
                                            <span className="material-symbols-outlined text-yellow-500 text-[40px] select-none">warning</span>
                                            <p className="text-sm font-bold text-red-400 mt-2">Error al cargar el archivo</p>
                                            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                                                No se pudo reproducir el recurso. Es posible que el renderizado aún no esté completo o que el archivo haya sido eliminado del servidor.
                                            </p>
                                        </div>
                                    ) : isVideo ? (
                                        <video 
                                            src={resolveMedia(firstMedia.url)} 
                                            controls 
                                            autoPlay 
                                            muted 
                                            className="max-w-full max-h-full rounded-xl"
                                            onError={() => {
                                                setVideoError(true);
                                            }}
                                        />
                                    ) : (
                                        <img src={resolveMedia(firstMedia.url)} className="max-w-full max-h-full object-contain rounded-xl" alt="Asset"
                                            onError={() => { setVideoError(true); }} />
                                    )
                                ) : isAutoVideo ? (() => {
                                    const isManualPending = selected.status === 'manual_studio';
                                    const isRenderQueued  = ['pending_render', 'rendering', 'pending_render_docker', 'rendering_docker'].includes(selected.status);
                                    const readableScenes  = extractReadableScenes(selected.media_options);
                                    const sourceLabel     = selected.media_options?.source === 'manual_cockers' ? 'Video Manual (Cockers Studio)'
                                                          : selected.media_options?.source === 'manual_planner' ? 'Video del Planificador'
                                                          : selected.media_options?.source === 'ai_planner'     ? 'Plan Mensual IA'
                                                          : 'Video IA';
                                    return (
                                    <div className="w-full h-full p-6 max-w-2xl mx-auto flex flex-col justify-start overflow-y-auto custom-scrollbar">

                                        {/* Badge de fuente */}
                                        <div className="mb-4 flex items-center gap-2">
                                            <span className="text-[10px] font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                                {sourceLabel}
                                            </span>
                                            {selected.media_options?.niche && (
                                                <span className="text-[10px] font-bold bg-neutral-800 border border-neutral-700 text-neutral-400 px-3 py-1 rounded-full">
                                                    {selected.media_options.niche}
                                                </span>
                                            )}
                                        </div>

                                        {/* Estado de producción y Guion */}
                                        {isRenderQueued ? (
                                            <RenderProgress progress={selected.renderProgress} msg={selected.renderMsg} />
                                        ) : (
                                            <>
                                                {isManualPending && (
                                                    <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-xl p-4 mb-5 flex items-center gap-4">
                                                        <span className="material-symbols-outlined text-cyan-400 text-[32px] shrink-0 select-none">movie</span>
                                                        <div>
                                                            <p className="font-black tracking-widest uppercase text-sm">Esperando Activación</p>
                                                            <p className="text-xs text-cyan-400/70 mt-0.5">Este video fue enviado al Estudio IA. Revisa el guion y presiona "Generar" cuando esté listo.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <h3 className="text-base font-black text-white mb-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[20px] select-none">description</span>
                                                    Guion de Escenas
                                                </h3>
                                                <div className="space-y-3 text-sm pb-4">
                                                    {readableScenes ? readableScenes.map(({ n, isCTA, narr, visual, texto }) => (
                                                        <div key={n} className={`border rounded-xl p-4 ${
                                                            isCTA ? 'bg-[#CC0000]/5 border-[#CC0000]/30' : 'bg-neutral-900/60 border-neutral-800'
                                                        }`}>
                                                            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${
                                                                isCTA ? 'text-[#CC0000]' : 'text-neutral-500'
                                                            }`}>
                                                                {isCTA ? `ESCENA ${n} — CTA` : `ESCENA ${n}`}
                                                            </p>
                                                            {narr && (
                                                                <div className="mb-2">
                                                                    <p className="text-[8px] text-neutral-600 font-bold uppercase mb-1">Narración</p>
                                                                    <p className="text-neutral-200 text-xs leading-relaxed">{narr}</p>
                                                                </div>
                                                            )}
                                                            {texto && (
                                                                <div className="mb-2">
                                                                    <p className="text-[8px] text-neutral-600 font-bold uppercase mb-1">Texto en Pantalla</p>
                                                                    <p className="text-yellow-300/80 text-xs leading-relaxed font-bold">{texto}</p>
                                                                </div>
                                                            )}
                                                            {visual && (
                                                                <div>
                                                                    <p className="text-[8px] text-neutral-600 font-bold uppercase mb-1">Visual / Imagen IA</p>
                                                                    <p className="text-violet-300/70 text-xs leading-relaxed italic">{visual}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )) : (
                                                        <p className="text-neutral-600 text-xs">No se encontró guion estructurado. El MediaWorker usará el prompt original.</p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    );
                                })() : (
                                    <div className="text-neutral-600 flex flex-col items-center gap-2 select-none">
                                        <span className="material-symbols-outlined text-neutral-800 text-[48px] select-none">image</span>
                                        <p className="text-sm font-bold">Sin archivo adjunto aún</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Floating control buttons */}
                            <button onClick={() => setSelected(null)}
                                className="absolute top-4 left-4 w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transition-colors text-lg z-50 shadow-md">
                                ✕
                            </button>
                            {firstMedia?.url && (
                                <button
                                    onClick={async () => {
                                        const fileUrl = resolveMedia(firstMedia.url);
                                        const fileName = firstMedia.url.split('/').pop() || `video_${selected.id}.mp4`;
                                        try {
                                            const resp = await fetch(fileUrl);
                                            if (!resp.ok) throw new Error('Error al conectar con el servidor.');
                                            const contentType = resp.headers.get('content-type') || '';
                                            if (contentType.includes('text/html')) {
                                                throw new Error('El archivo de video no se encuentra en el servidor.');
                                            }
                                            const blob = await resp.blob();
                                            const a = document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            a.download = fileName;
                                            document.body.appendChild(a);
                                            a.click();
                                            setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 2000);
                                        } catch(err) {
                                            alert(`Error al descargar: ${err.message}. Por favor intenta de nuevo o contacta al administrador.`);
                                        }
                                    }}
                                    className="absolute bottom-4 left-4 bg-white/20 hover:bg-white text-white hover:text-black px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 z-50 shadow-md">
                                    <span className="material-symbols-outlined text-[16px]">download</span> Descargar
                                </button>
                            )}
                        </div>

                        {/* Panel lateral */}
                        <div className="w-full md:w-96 bg-neutral-950 p-6 flex flex-col border-l border-neutral-800 overflow-y-auto">
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${STATUS_MAP[selected.status]?.color || 'text-neutral-400 border-neutral-700'}`}>
                                        {STATUS_MAP[selected.status]?.label || selected.status}
                                    </span>
                                    {canReview && (
                                        <button onClick={(e) => handleDelete(selected.id, e)} className="text-[10px] font-bold text-red-500 hover:text-white border border-red-500/30 hover:bg-red-500 px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 focus:outline-none">
                                            <span className="material-symbols-outlined text-[14px]">delete</span> Borrar Activo
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-white mb-1 leading-snug">{selected.caption || '(Sin título)'}</h3>
                                <p className="text-[10px] text-neutral-600 mb-1">por <span className="text-neutral-400 font-bold">{selected.uploader}</span></p>
                                {selected.prompt && (
                                    <p className="text-[10px] text-neutral-600 border border-neutral-800 bg-neutral-900 rounded-lg p-2 mt-2 leading-relaxed line-clamp-3">
                                        🤖 Prompt: {selected.prompt}
                                    </p>
                                )}
                            </div>

                            <hr className="border-neutral-800 my-3" />

                            {/* PENDIENTE → Judith puede aprobar/rechazar */}
                            {['pending_cm_approval', 'backlog'].includes(selected.status) && canReview && (
                                <div className="flex-1 flex flex-col">
                                    <label className="text-xs font-bold text-neutral-400 mb-2 block uppercase tracking-widest">
                                        Notas (obligatorio si se devuelve):
                                    </label>
                                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                                        className="w-full h-20 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-sm focus:border-[#d946ef] outline-none resize-none mb-3"
                                        placeholder="Escribe qué debe corregir Alex o el editor..." />

                                    {/* --- SUBIR ARCHIVO DE REFERENCIA --- */}
                                    <div className="mb-4">
                                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-2">Archivo de Referencia Visual (Opcional)</p>
                                        {refFileUrl ? (
                                            <div className="relative group rounded-xl overflow-hidden border border-[#d946ef]/60 bg-neutral-950 p-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {refFileType.startsWith('video/') ? (
                                                        <div className="w-10 h-10 rounded bg-[#d946ef]/10 border border-[#d946ef]/30 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-cyan-400 text-[20px]">movie</span>
                                                        </div>
                                                    ) : (
                                                        <img src={refFileUrl} className="w-10 h-10 rounded object-cover border border-neutral-800" alt="Ref" />
                                                    )}
                                                    <span className="text-[10px] text-neutral-400 font-bold truncate max-w-[150px]">Referencia cargada</span>
                                                </div>
                                                <button onClick={() => { setRefFileUrl(''); setRefFileType(''); }} className="text-neutral-500 hover:text-red-500 text-xs font-black px-2">Quitar</button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-neutral-800 rounded-xl p-3 text-center relative hover:border-[#d946ef]/60 transition-colors cursor-pointer bg-neutral-900/50 flex flex-col items-center justify-center min-h-[64px]">
                                                {uploadingRef ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3.5 h-3.5 border-2 border-[#d946ef]/30 border-t-[#d946ef] rounded-full animate-spin" />
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Subiendo...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px] text-neutral-400">attach_file</span>
                                                        <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest mt-1">Subir Imagen o Video de Referencia</span>
                                                    </>
                                                )}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,video/*" disabled={uploadingRef} onChange={async (e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        const file = e.target.files[0];
                                                        setUploadingRef(true);
                                                        try {
                                                            const formData = new FormData();
                                                            formData.append('file', file);
                                                            const uploadEndpoint = file.type.startsWith('video/') ? '/api/media/upload-video' : '/api/media/upload';
                                                            const uRes = await fetch(uploadEndpoint, {
                                                                method: 'POST',
                                                                headers: { 'Authorization': `Bearer ${token}` },
                                                                body: formData
                                                            });
                                                            const uData = await uRes.json();
                                                            if (uData.success) {
                                                                setRefFileUrl(uData.url);
                                                                setRefFileType(file.type);
                                                            } else {
                                                                alert('Error al subir: ' + (uData.error || 'Intenta de nuevo'));
                                                            }
                                                        } catch(err) {
                                                            alert('Error al subir archivo: ' + err.message);
                                                        } finally {
                                                            setUploadingRef(false);
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-2">
                                        <button 
                                            onClick={() => handleAction('approve')}
                                            disabled={actionLoading || uploadingRef}
                                            className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-base shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all transform hover:scale-105 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Procesando...</> : 'APROBAR'}
                                        </button>

                                        {/* --- BOTON AUTOMATICO DE RE-GENERAR CON ESTA REFERENCIA --- */}
                                        <button 
                                            onClick={() => handleAction('auto_regenerate')}
                                            disabled={actionLoading || uploadingRef}
                                            className="w-full bg-gradient-to-r from-[#d946ef] to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all transform hover:scale-105 disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span> AUTO-REGENERAR
                                        </button>

                                        <button 
                                            onClick={() => handleAction('reject', 'Rehacer video completo')}
                                            disabled={actionLoading || uploadingRef}
                                            className="w-full bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-1.5 rounded-xl text-xs transition-all disabled:opacity-60"
                                        >
                                            DEVOLVER (Rehacer Todo)
                                        </button>
                                        <button 
                                            onClick={() => handleAction('reject', 'Cambiar fondo y visuales')}
                                            disabled={actionLoading || uploadingRef}
                                            className="w-full bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold py-1.5 rounded-xl text-xs transition-all disabled:opacity-60"
                                        >
                                            DEVOLVER (Cambiar Visuales)
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditorData([selected]);
                                                setShowEditor(true);
                                            }}
                                            disabled={actionLoading || uploadingRef}
                                            className="w-full bg-transparent border border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white font-bold py-1.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            EDICIÓN MANUAL (Estudio Pro)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PENDIENTE → Alex solo ve estado */}
                            {['pending_cm_approval', 'backlog'].includes(selected.status) && !canReview && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-yellow-500 text-[24px]">hourglass_empty</span>
                                    </div>
                                    <p className="font-black text-white uppercase tracking-widest">En Revisión</p>
                                    <p className="text-xs text-neutral-500">Este activo está siendo revisado. Recibirás notificación cuando sea aprobado o devuelto.</p>
                                </div>
                            )}

                            {/* DEVUELTA → Feedback + instrucción */}
                            {selected.status === 'rejected' && (
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                                        <p className="text-xs font-bold text-red-400 mb-2 uppercase">Notas de devolución:</p>
                                        <p className="text-sm text-white">{selected.feedback || 'Sin notas específicas.'}</p>
                                    </div>
                                    <p className="text-xs text-neutral-600 text-center mt-auto">Corrige en el Estudio IA y vuelve a enviar a revisión.</p>
                                </div>
                            )}

                            {/* EN ESTUDIO IA (manual_studio) → Botón Generar */}
                            {selected.status === 'manual_studio' && canReview && (
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-center">
                                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Video Manual — Pendiente de Activación</p>
                                        <p className="text-xs text-neutral-500 leading-relaxed">Revisa el guion a la izquierda. Si todo está correcto, activa el MediaWorker para que genere el video automáticamente.</p>
                                    </div>
                                    <button
                                        onClick={handleSendToMediaWorker}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black py-5 rounded-xl text-base shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">smart_toy</span> GENERAR CON ESTUDIO IA
                                    </button>
                                    <p className="text-[9px] text-neutral-600 text-center leading-relaxed">
                                        El MediaWorker ensamblará las escenas con voz Edge TTS + imágenes Imagen 3 + subtítulos Whisper. ~2 min.
                                    </p>
                                    <button
                                        onClick={(e) => handleDelete(selected.id, e)}
                                        className="border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Descartar Video Manual
                                    </button>
                                </div>
                            )}

                            {/* EN COLA / RENDERIZANDO → Estado de progreso */}
                            {['pending_render', 'rendering', 'pending_render_docker', 'rendering_docker'].includes(selected.status) && (
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                                        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-400 rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-sm font-black text-orange-400 uppercase tracking-widest">
                                            {['rendering', 'rendering_docker'].includes(selected.status) ? 'Renderizando...' : 'En Cola del MediaWorker'}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-2">Generando voz + imágenes IA + subtítulos + ensamble FFmpeg. El resultado aparecerá en "Pendientes por Revisar" al terminar.</p>
                                    </div>
                                    <button onClick={fetchTasks} className="border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                                        Actualizar Estado
                                    </button>
                                    {canReview && (
                                        <button 
                                            onClick={(e) => handleDelete(selected.id, e)}
                                            className="border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-colors mt-2"
                                        >
                                            Descartar / Borrar Activo
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* APROBADA → Publicar */}
                            {['approved', 'published'].includes(selected.status) && (
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-xl text-center">
                                        <p className="text-sm font-black text-green-400">
                                            {selected.status === 'published' ? 'YA PUBLICADA' : 
                                             ['pending_render', 'rendering'].includes(selected.status) ? 'APROBADA (RENDERIZANDO VIDEO...)' : 'APROBADA'}
                                        </p>
                                    </div>
                                    
                                    {/* Selector de fecha directo en CEO Estudio */}
                                    {selected.status !== 'published' && canPublish && (
                                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-blue-400 uppercase text-center flex items-center justify-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px]">calendar_month</span> Escoger Fecha y Hora
                                            </label>
                                            <input 
                                                type="datetime-local" 
                                                value={selected.scheduled_for ? new Date(new Date(selected.scheduled_for).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                                onChange={handleUpdateSchedule}
                                                className="bg-black border border-blue-500/50 rounded-lg p-2.5 text-white text-sm text-center outline-none focus:border-blue-400 cursor-pointer hover:bg-neutral-900 transition-colors"
                                            />
                                            <p className="text-[9px] text-neutral-500 text-center leading-tight mt-1">Si programas la fecha, el bot publicará en IG en automático.</p>
                                        </div>
                                    )}

                                    {canPublish && selected.status !== 'published' && firstMedia?.url && (
                                        <button onClick={() => setShowPublish(true)}
                                            className="mt-auto w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-white hover:to-white text-white hover:text-purple-600 font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                                            PUBLICAR AHORA
                                        </button>
                                    )}
                                    {selected.status === 'published' && (
                                        <div className="mt-auto text-center text-[10px] text-neutral-600 uppercase tracking-widest">Publicada — visible en el Calendario Global</div>
                                    )}

                                    {/* Controles secundarios directos desde el modal */}
                                    {canReview && (
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-800">
                                            <button 
                                                onClick={(e) => handleUnpublish(selected.id, e)}
                                                className="flex-1 border border-yellow-500/40 text-yellow-500 hover:bg-yellow-500 hover:text-black py-2 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                Regresar a Pendiente
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(selected.id, e)}
                                                className="flex-1 border border-red-500/40 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                Eliminar Activo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* ── HUD DE PUBLICACIÓN ── */}
            {showPublish && selected && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl flex gap-6 h-[82vh]">
                        {/* Formulario */}
                        <div className="flex-1 bg-neutral-900 border border-neutral-700 rounded-3xl p-6 flex flex-col">
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
                                <h3 className="text-xl font-bold">Publicar Activo</h3>
                                <div className="flex items-center gap-4">
                                    {canReview && (
                                        <button onClick={(e) => handleDelete(selected.id, e)} className="text-[10px] font-bold text-red-500 hover:text-white border border-red-500/30 hover:bg-red-500 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 focus:outline-none">
                                            Borrar
                                        </button>
                                    )}
                                    <button onClick={() => { setShowPublish(false); setPublishReport(null); }} className="text-neutral-500 hover:text-white text-sm focus:outline-none">✕ Cancelar</button>
                                </div>
                            </div>

                            <label className="text-xs font-bold text-neutral-400 mb-2">Red Social Destino</label>
                            <div className="flex gap-2 mb-6">
                                <button onClick={() => setNetwork('instagram')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Instagram</button>
                                <button onClick={() => setNetwork('facebook')}  className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'facebook'  ? 'bg-[#1877F2] text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Facebook</button>
                                <button onClick={() => setNetwork('tiktok')}    className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'tiktok'    ? 'bg-black border-[#00f2fe] text-white shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>TikTok</button>
                            </div>

                            <label className="text-xs font-bold text-neutral-400 mb-2">Caption / Descripción</label>
                            <textarea value={caption} onChange={e => setCaption(e.target.value)}
                                className="w-full h-20 bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-white outline-none resize-none mb-4"
                                placeholder="Escribe el texto de la publicación..." />

                            <label className="text-xs font-bold text-neutral-400 mb-2">¿Cuándo Publicar?</label>
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setPublishMode('now')} className={`flex-1 py-1.5 rounded-xl text-sm font-bold border transition-colors ${publishMode === 'now' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Ahora Mismo</button>
                                <button onClick={() => setPublishMode('schedule')} className={`flex-1 py-1.5 rounded-xl text-sm font-bold border transition-colors ${publishMode === 'schedule' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Programar</button>
                            </div>

                            {publishMode === 'schedule' && (
                                <div className="flex gap-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">Día</label>
                                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">Hora</label>
                                        <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            )}

                            {publishReport && (
                                <div className={`mb-4 p-3 rounded-xl text-xs font-bold overflow-y-auto max-h-32 border ${publishReport.error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                    {publishReport.error ? 'Error: ' : 'Éxito: '} {publishReport.message || 'Operación completada.'} 
                                    {!publishReport.error && publishReport.tiktok && <span className="block mt-1 font-mono text-[10px] break-all">{JSON.stringify(publishReport, null, 2)}</span>}
                                </div>
                            )}

                            <button onClick={handlePublish} disabled={publishing}
                                className="mt-auto w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                                {publishing ? (
                                    <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Procesando...</>
                                ) : publishMode === 'schedule' ? (
                                    'GUARDAR PROGRAMACIÓN'
                                ) : (
                                    'CONFIRMAR Y PUBLICAR YA'
                                )}
                            </button>
                        </div>

                        {/* Preview celular */}
                        <div className="w-[375px] bg-black border-[8px] border-neutral-800 rounded-[3rem] overflow-hidden flex flex-col relative shadow-[0_0_50px_rgba(255,255,255,0.08)]">
                            <div className="absolute top-0 inset-x-0 h-6 shrink-0 flex justify-center z-50">
                                <div className="w-40 h-6 bg-neutral-800 rounded-b-2xl" />
                            </div>
                            {network === 'instagram' && (
                                <div className="flex-1 bg-white text-black flex flex-col pt-8">
                                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full p-[2px]">
                                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-0.5"><img src="/favicon.png" className="rounded-full bg-black" alt="" /></div>
                                            </div>
                                            <p className="font-bold text-sm">godzilla.consulting</p>
                                        </div>
                                        <span className="font-black">⋮</span>
                                    </div>
                                    <div className="bg-black w-full aspect-square flex items-center justify-center overflow-hidden">
                                        {firstMedia?.url && <img src={resolveMedia(firstMedia.url)} className="w-full object-cover" alt="" />}
                                    </div>
                                    <div className="p-3">
                                        <div className="flex gap-4 mb-2">
                                            <span className="material-symbols-outlined text-neutral-800 text-[20px] select-none">favorite</span>
                                            <span className="material-symbols-outlined text-neutral-800 text-[20px] select-none">chat_bubble</span>
                                            <span className="material-symbols-outlined text-neutral-800 text-[20px] select-none">send</span>
                                        </div>
                                        <p className="text-sm line-clamp-3"><span className="font-bold">godzilla.consulting</span> {caption || 'Tu texto de publicación aquí...'}</p>
                                    </div>
                                </div>
                            )}
                            {network === 'facebook' && (
                                <div className="flex-1 bg-neutral-200 text-black flex flex-col pt-8">
                                    <div className="bg-white p-3 mb-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <img src="/favicon.png" className="w-10 h-10 rounded-full bg-black" alt="" />
                                            <div>
                                                <p className="font-bold text-sm leading-none">Godzilla Consulting</p>
                                                <p className="text-xs text-gray-500">Justo ahora • 🌎</p>
                                            </div>
                                        </div>
                                        <p className="text-sm mb-2">{caption || 'Tu texto aquí...'}</p>
                                        {firstMedia?.url && <div className="bg-black"><img src={resolveMedia(firstMedia.url)} className="w-full object-cover" alt="" /></div>}
                                    </div>
                                </div>
                            )}
                            {network === 'tiktok' && (
                                <div className="flex-1 bg-black text-white flex flex-col relative pt-0">
                                    {firstMedia?.url && <img src={resolveMedia(firstMedia.url)} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="" />}
                                    <div className="absolute inset-y-0 right-2 flex flex-col justify-end pb-20 gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden"><img src="/favicon.png" className="bg-black" alt="" /></div>
                                        <div className="text-center flex flex-col items-center"><span className="material-symbols-outlined text-[28px] text-white select-none">favorite</span><p className="text-xs font-bold mt-1">128K</p></div>
                                        <div className="text-center flex flex-col items-center"><span className="material-symbols-outlined text-[28px] text-white select-none">chat_bubble</span><p className="text-xs font-bold mt-1">1024</p></div>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="font-bold text-sm">@godzilla.consulting</p>
                                        <p className="text-sm mt-1 mb-2 line-clamp-2">{caption || 'Tu texto aquí...'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* ── NOTIFICACIONES EMERGENTES (TOASTS) ── */}
            {createPortal(
                <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-3 pointer-events-none">
                    {notifications.map(n => (
                        <div key={n.id} className="bg-[#0a0a0a] border border-[#d946ef]/50 text-white p-4 rounded-2xl shadow-[0_5px_30px_rgba(217,70,239,0.2)] animate-in slide-in-from-right-8 fade-in duration-300 max-w-sm pointer-events-auto flex items-start gap-3">
                            <span className="text-xl shrink-0 mt-0.5">🔔</span>
                            <p className="text-sm font-bold leading-tight">{n.text}</p>
                        </div>
                    ))}
                </div>
            , document.body)}
        </div>
    );
}
