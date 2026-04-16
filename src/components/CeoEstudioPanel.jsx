import React, { useState, useEffect, useRef } from 'react';

const STATUS_MAP = {
    pending_cm_approval: { label: '⏳ En Revisión', tab: 'pendientes', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    rejected:            { label: '🔙 Devuelta',    tab: 'devueltas',  color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    approved:            { label: '✅ Aprobada',    tab: 'aprobadas',  color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    published:           { label: '🚀 Publicada',   tab: 'aprobadas',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
};

export default function CeoEstudioPanel({ adminProfile }) {
    const [activeTab, setActiveTab] = useState('pendientes');
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [selected, setSelected]   = useState(null);
    const [feedback, setFeedback]   = useState('');
    const [network, setNetwork]     = useState('instagram');
    const [caption, setCaption]     = useState('');
    const [showPublish, setShowPublish] = useState(false);
    const [publishing, setPublishing]   = useState(false);
    const [publishReport, setPublishReport] = useState(null);
    const evtRef = useRef(null);

    const username  = adminProfile?.username?.toLowerCase() || '';
    const isCockers = adminProfile?.role === 'cockers' || username === 'alex' || username === 'cockers';
    // Alex puede aprobar y publicar; Judith también. Ambos ven CEO Estudio.
    const canReview  = isCockers || ['judith', 'godzilla_admin'].includes(username) || adminProfile?.is_superadmin;
    const canPublish = isCockers || ['judith', 'godzilla_admin'].includes(username) || adminProfile?.is_superadmin;
    // Alex debe dejar nota al publicar; Judith no
    const publishNeedsReason = isCockers;

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
                } else if (data.type === 'NOTIFICATION') {
                    // Badge flash for Judith
                    if (!document.hidden) {
                        console.log('[CEO SSE]', data.task?.message || 'Notificación');
                    }
                }
            } catch {}
        };
        return () => evtSource.close();
    }, []);

    // ── Action: approve / reject ──────────────────────────────
    const handleAction = async (action) => {
        if (!selected) return;
        if (action === 'reject' && !feedback.trim()) {
            alert('Debes escribir notas de corrección para devolver la pieza.');
            return;
        }
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        try {
            const res = await fetch(`/api/studio/tasks/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus, feedback_notes: feedback.trim() || undefined })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, status: newStatus } : t));
            setSelected(null);
            setFeedback('');
        } catch (e) { alert('Error: ' + e.message); }
    };

    // ── Action: publish ───────────────────────────────────────
    const handlePublish = async () => {
        if (!selected || !selected.media_options?.[0]?.url) return;
        setPublishing(true);
        try {
            // Convertir URLs relativas (/api/sora/media/...) a absolutas para que Meta pueda acceder
            const BASE_URL = 'https://godzillaconsulting.ai';
            const absoluteMedia = selected.media_options.map(m => ({
                ...m,
                url: m.url?.startsWith('http') ? m.url : `${BASE_URL}${m.url}`
            }));

            const res = await fetch(`/api/studio/tasks/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    status: 'published',
                    publish_targets: [network],
                    media_payload: absoluteMedia
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            setPublishReport(data.report);
            setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'published' } : t));
        } catch (e) { alert('Error publicando: ' + e.message); }
        setPublishing(false);
    };


    // ── Filtered view ─────────────────────────────────────────
    const tabStatuses = {
        pendientes: ['pending_cm_approval'],
        devueltas:  ['rejected'],
        aprobadas:  ['approved', 'published'],
    };
    const visible = tasks.filter(t => (tabStatuses[activeTab] || []).includes(t.status));

    // ── Counts ────────────────────────────────────────────────
    const counts = {
        pendientes: tasks.filter(t => t.status === 'pending_cm_approval').length,
        devueltas:  tasks.filter(t => t.status === 'rejected').length,
        aprobadas:  tasks.filter(t => ['approved','published'].includes(t.status)).length,
    };

    const firstMedia = selected?.media_options?.[0];
    const isVideo = firstMedia?.isVideo || firstMedia?.url?.match(/\.(mp4|webm|mov)$/i);

    return (
        <div className="flex-1 flex flex-col p-6 bg-black text-white overflow-hidden relative">
            {/* Ambient Orb */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d946ef]/10 rounded-full blur-[120px] pointer-events-none" />

            {/* ── Header ── */}
            <div className="mb-6 border-b border-[#d946ef]/30 pb-4 shrink-0 relative z-10 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-widest text-[#d946ef] drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] flex items-center gap-2">
                        <span>👑</span> CEO ESTUDIO
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
            <div className="flex gap-3 mb-6 shrink-0 z-10 relative">
                {[
                    { id: 'pendientes', label: 'Pendientes por Revisar', icon: '⏳' },
                    { id: 'devueltas',  label: 'Devueltas',               icon: '🔙' },
                    { id: 'aprobadas',  label: 'Aprobadas / Publicadas',  icon: '✅' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative px-5 py-2.5 rounded-xl font-black text-sm transition-all border ${activeTab === tab.id ? 'bg-[#d946ef] border-[#d946ef] text-white shadow-md' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-[#d946ef]/50'}`}>
                        {tab.icon} {tab.label}
                        {counts[tab.id] > 0 && (
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black text-white ${tab.id === 'pendientes' ? 'bg-[#CC0000]' : 'bg-[#d946ef]'}`}>
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
                        <span className="text-4xl mb-3">👻</span>
                        <p className="font-bold uppercase tracking-widest text-sm">Bandeja vacía</p>
                        <p className="text-xs text-neutral-700 mt-1">
                            {activeTab === 'pendientes' ? 'Alex aún no ha enviado nada a revisión.' : 'No hay contenido en esta sección.'}
                        </p>
                    </div>
                )}

                {!loading && visible.map(item => {
                    const media = item.media_options?.[0];
                    const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' };
                    return (
                        <div key={item.id} onClick={() => { setSelected(item); setFeedback(''); setPublishReport(null); }}
                            className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-[#d946ef]/60 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col group relative">
                            <div className="h-40 bg-black flex items-center justify-center overflow-hidden relative">
                                {media?.url ? (
                                    media.isVideo || media.url.match(/\.(mp4|webm|mov)$/i) ? (
                                        <video src={media.url} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" muted playsInline />
                                    ) : (
                                        <img src={media.url} alt="Media" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <span className="text-3xl mb-1">🖼</span>
                                        <span className="text-[9px] font-bold uppercase">Sin preview</span>
                                    </div>
                                )}
                                <div className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                                    {statusInfo.label}
                                </div>
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
            {selected && !showPublish && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-700 w-full max-w-5xl h-[88vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(217,70,239,0.15)]">

                        {/* Visualizador */}
                        <div className="flex-1 bg-black flex items-center justify-center relative p-4 min-h-[50%]">
                            {firstMedia?.url ? (
                                isVideo ? (
                                    <video src={firstMedia.url} controls autoPlay muted className="max-w-full max-h-full rounded-xl" />
                                ) : (
                                    <img src={firstMedia.url} className="max-w-full max-h-full object-contain rounded-xl" alt="Asset" />
                                )
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center gap-2">
                                    <span className="text-5xl">🖼</span>
                                    <p className="text-sm font-bold">Sin archivo adjunto aún</p>
                                </div>
                            )}
                            <button onClick={() => setSelected(null)}
                                className="absolute top-4 left-4 w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transition-colors text-lg">
                                ✕
                            </button>
                            {firstMedia?.url && (
                                <a href={firstMedia.url} download={`asset_${selected.id}`} target="_blank" rel="noreferrer"
                                    className="absolute bottom-4 left-4 bg-white/20 hover:bg-white text-white hover:text-black px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2">
                                    ⬇️ Descargar
                                </a>
                            )}
                        </div>

                        {/* Panel lateral */}
                        <div className="w-full md:w-96 bg-neutral-950 p-6 flex flex-col border-l border-neutral-800 overflow-y-auto">
                            <div className="mb-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${STATUS_MAP[selected.status]?.color || 'text-neutral-400 border-neutral-700'}`}>
                                    {STATUS_MAP[selected.status]?.label || selected.status}
                                </span>
                                <h3 className="text-lg font-black text-white mt-3 mb-1 leading-snug">{selected.caption || '(Sin título)'}</h3>
                                <p className="text-[10px] text-neutral-600 mb-1">por <span className="text-neutral-400 font-bold">{selected.uploader}</span></p>
                                {selected.prompt && (
                                    <p className="text-[10px] text-neutral-600 border border-neutral-800 bg-neutral-900 rounded-lg p-2 mt-2 leading-relaxed line-clamp-3">
                                        🤖 Prompt: {selected.prompt}
                                    </p>
                                )}
                            </div>

                            <hr className="border-neutral-800 my-3" />

                            {/* PENDIENTE → Judith puede aprobar/rechazar */}
                            {selected.status === 'pending_cm_approval' && canReview && (
                                <div className="flex-1 flex flex-col">
                                    <label className="text-xs font-bold text-neutral-400 mb-2 block uppercase tracking-widest">
                                        Notas (obligatorio si se devuelve):
                                    </label>
                                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                                        className="w-full h-28 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-sm focus:border-[#d946ef] outline-none resize-none mb-4"
                                        placeholder="Escribe qué debe corregir Alex..." />
                                    <div className="mt-auto space-y-3">
                                        <button onClick={() => handleAction('approve')}
                                            className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all transform hover:scale-105">
                                            ✅ APROBAR
                                        </button>
                                        <button onClick={() => handleAction('reject')}
                                            className="w-full bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-black py-4 rounded-xl text-lg transition-all">
                                            🔙 DEVOLVER A CORRECCIÓN
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PENDIENTE → Alex solo ve estado */}
                            {selected.status === 'pending_cm_approval' && !canReview && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                                        <span className="text-2xl">⏳</span>
                                    </div>
                                    <p className="font-black text-white uppercase tracking-widest">En Revisión</p>
                                    <p className="text-xs text-neutral-500">Judith está revisando este activo. Recibirás notificación cuando sea aprobado o devuelto.</p>
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

                            {/* APROBADA → Publicar */}
                            {(selected.status === 'approved' || selected.status === 'published') && (
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-xl text-center">
                                        <p className="text-sm font-black text-green-400">{selected.status === 'published' ? '🚀 YA PUBLICADA' : '✅ LISTO PARA PUBLICAR'}</p>
                                    </div>
                                    {selected.scheduled_for && (
                                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase">Fecha programada</p>
                                            <p className="text-sm text-white font-black">{new Date(selected.scheduled_for).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                        </div>
                                    )}
                                    {canPublish && selected.status !== 'published' && firstMedia?.url && (
                                        <button onClick={() => setShowPublish(true)}
                                            className="mt-auto w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-white hover:to-white text-white hover:text-purple-600 font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                                            📱 PUBLICAR AHORA
                                        </button>
                                    )}
                                    {selected.status === 'published' && (
                                        <div className="mt-auto text-center text-[10px] text-neutral-600 uppercase tracking-widest">Publicada — visible en el Calendario Global</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── HUD DE PUBLICACIÓN ── */}
            {showPublish && selected && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl flex gap-6 h-[82vh]">
                        {/* Formulario */}
                        <div className="flex-1 bg-neutral-900 border border-neutral-700 rounded-3xl p-6 flex flex-col">
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
                                <h3 className="text-xl font-bold">Publicar Activo</h3>
                                <button onClick={() => { setShowPublish(false); setPublishReport(null); }} className="text-neutral-500 hover:text-white">✕ Cancelar</button>
                            </div>

                            <label className="text-xs font-bold text-neutral-400 mb-2">Red Social Destino</label>
                            <div className="flex gap-2 mb-6">
                                <button onClick={() => setNetwork('instagram')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Instagram</button>
                                <button onClick={() => setNetwork('facebook')}  className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'facebook'  ? 'bg-[#1877F2] text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Facebook</button>
                                <button onClick={() => setNetwork('tiktok')}    className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'tiktok'    ? 'bg-black border-[#00f2fe] text-white shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>TikTok</button>
                            </div>

                            <label className="text-xs font-bold text-neutral-400 mb-2">Caption / Descripción</label>
                            <textarea value={caption} onChange={e => setCaption(e.target.value)}
                                className="w-full h-28 bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-white outline-none resize-none mb-4"
                                placeholder="Escribe el texto de la publicación..." />

                            {publishReport && (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-green-400 font-bold">
                                    ✅ Publicado. Reporte: {JSON.stringify(publishReport, null, 2)}
                                </div>
                            )}

                            <button onClick={handlePublish} disabled={publishing}
                                className="mt-auto w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                                {publishing ? (
                                    <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Publicando...</>
                                ) : '🚀 CONFIRMAR Y ENVIAR AL BOT'}
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
                                        {firstMedia?.url && <img src={firstMedia.url} className="w-full object-cover" alt="" />}
                                    </div>
                                    <div className="p-3">
                                        <div className="flex gap-4 mb-2"><span className="text-xl">❤️</span><span className="text-xl">💬</span><span className="text-xl">↗️</span></div>
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
                                        {firstMedia?.url && <div className="bg-black"><img src={firstMedia.url} className="w-full object-cover" alt="" /></div>}
                                    </div>
                                </div>
                            )}
                            {network === 'tiktok' && (
                                <div className="flex-1 bg-black text-white flex flex-col relative pt-0">
                                    {firstMedia?.url && <img src={firstMedia.url} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="" />}
                                    <div className="absolute inset-y-0 right-2 flex flex-col justify-end pb-20 gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden"><img src="/favicon.png" className="bg-black" alt="" /></div>
                                        <div className="text-center"><p className="text-3xl">❤️</p><p className="text-xs font-bold">128K</p></div>
                                        <div className="text-center"><p className="text-3xl">💬</p><p className="text-xs font-bold">1024</p></div>
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
            )}
        </div>
    );
}
