import React, { useState, useEffect } from 'react';
import { Send, Users, Clock, CheckCircle, XCircle, Loader, AlertCircle, PaperclipIcon, Wand2 } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';
const getToken = () => localStorage.getItem('adminToken');

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

export default function NewsletterPanel() {
    const [tab, setTab] = useState('compose'); //'compose' | 'subscribers' | 'history'

    // Compose state
    const [subject, setSubject] = useState('Boletín #1 | Actualizaciones Globales de IA');
    const [bodyHtml, setBodyHtml] = useState('<h2>Saludos,</h2><p>Texto inicial.</p>');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [feedback, setFeedback] = useState('');
    const [sending, setSending] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const [currentDraftId, setCurrentDraftId] = useState(null);

    // Subscribers
    const [subscribers, setSubscribers] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);

    // History
    const [history, setHistory] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);

    const fetchSubscribers = async () => {
        setLoadingSubs(true);
        try {
            const r = await fetch(`${API_BASE}/api/newsletter/subscribers`, { headers: authHeaders() });
            const d = await r.json();
            setSubscribers(d.subscribers || []);
        } catch { /* silent */ }
        setLoadingSubs(false);
    };

    const fetchHistory = async () => {
        setLoadingHist(true);
        try {
            const r = await fetch(`${API_BASE}/api/newsletter/history`, { headers: authHeaders() });
            const d = await r.json();
            setHistory(d.newsletters || []);
        } catch { /* silent */ }
        setLoadingHist(false);
    };

    useEffect(() => {
        if (tab === 'subscribers') fetchSubscribers();
        if (tab === 'history') fetchHistory();
    }, [tab]);

    const handleSend = async () => {
        if (!subject.trim() || !bodyHtml.trim()) return;
        setSending(true);
        setSendResult(null);
        try {
            const r = await fetch(`${API_BASE}/api/newsletter/send`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ id: currentDraftId, subject, bodyHtml, attachmentUrl: attachmentUrl || null }),
            });
            const d = await r.json();
            setSendResult(d);
            if (d.success) { 
                setSubject(''); setBodyHtml(''); setAttachmentUrl(''); setFeedback(''); setCurrentDraftId(null); 
            }
        } catch (err) {
            setSendResult({ success: false, message: err.message });
        }
        setSending(false);
    };

    const handleGenerateDraft = async () => {
        if(!window.confirm("¿Deseas ensamblar el reporte Bilingüe y el PDF formal automáticamente? Tomará unos segundos.")) return;
        setGenerating(true);
        setSendResult(null);
        try {
            const r = await fetch(`${API_BASE}/api/newsletter/generate-draft`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ feedback: feedback.trim() || null })
            });
            const d = await r.json();
            if (d.success) {
                // Al venir del JSON multi-idioma (es, en), para parse visual sacaremos temporalmente la string ES en la interfaz (o raw json si da error).
                let displaySubject = d.subject || 'Boletín Generado';
                let displayBody = d.bodyHtml || '';
                
                try {
                   const jbody = JSON.parse(d.bodyHtml);
                   displayBody = jbody.es || d.bodyHtml;
                } catch(e){}

                setSubject(displaySubject);
                setBodyHtml(displayBody);
                setAttachmentUrl(d.attachmentUrl || '');
                setCurrentDraftId(d.newsletterId);
                setFeedback(''); // clear feedback if successful
                setSendResult({ success: true, message: 'Borrador Inteligente ensamblado con éxito. Si no te gusta, agrégale feedback abajo y rehazlo.' });
            } else {
                setSendResult({ success: false, message: d.error || 'Error al generar borrador con IA' });
            }
        } catch (err) {
            setSendResult({ success: false, message: err.message });
        }
        setGenerating(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas borrar este reporte permanentemente del historial?")) return;
        try {
            const r = await fetch(`${API_BASE}/api/newsletter/delete/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const d = await r.json();
            if (d.success) {
                fetchHistory();
            } else {
                alert(d.message || "Error al borrar");
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const statusBadge = (status) => {
        const map = {
            done: { color: 'text-green-400 bg-green-400/10', icon: <CheckCircle size={12} />, label: 'Enviado' },
            sending: { color: 'text-yellow-400 bg-yellow-400/10', icon: <Loader size={12} className="animate-spin" />, label: 'Enviando' },
            failed: { color: 'text-red-400 bg-red-400/10', icon: <XCircle size={12} />, label: 'Falló' },
            draft: { color: 'text-neutral-400 bg-neutral-800', icon: null, label: 'Borrador' },
        };
        const s = map[status] || map.draft;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.color}`}>
                {s.icon}{s.label}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full text-white">

            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 shrink-0">
                <h2 className="text-sm font-black text-white">📧 Newsletter & Premium PDF</h2>
                <p className="text-[10px] text-neutral-500 mt-0.5">Genera investigación dual (Freemium + Socios) y corrige iterativamente con Godzilla. </p>
                
                {currentDraftId && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/20 px-3 py-1.5 rounded-full text-[10px] font-bold">
                        <span>🤖 Edición de un Borrador Inteligente</span>
                        <button onClick={() => {
                            setCurrentDraftId(null);
                            setSubject('');
                            setBodyHtml('');
                            setAttachmentUrl('');
                            setFeedback('');
                        }} className="ml-2 hover:text-white transition-colors">✕ Cancelar</button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-neutral-800 shrink-0">
                {[
                    { id: 'compose', label: '📝 Redactar' },
                    { id: 'subscribers', label: '👥 Suscriptores' },
                    { id: 'history', label: '📜 Historial' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            tab === t.id ? 'bg-[#CC0000] text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* ─ COMPOSE ─ */}
                {tab === 'compose' && (
                    <div className="space-y-4">

                        {sendResult && (
                            <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                                sendResult.success
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                                {sendResult.success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                                <div>
                                    <p className="font-bold">{sendResult.success ? '¡Éxito!' : 'Error'}</p>
                                    <p className="text-xs opacity-80">{sendResult.message}</p>
                                    {sendResult.totalRecipients && (
                                        <p className="text-xs mt-1">👥 {sendResult.totalRecipients} destinatarios encolados</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3 mb-4">
                            <h3 className="text-xs font-bold text-yellow-500 flex items-center gap-1.5"><Wand2 size={14}/> Afinador de Borrador IA</h3>
                            <p className="text-[10px] text-neutral-400">Si no te gustó el borrador o quieres enfocarlo en otra noticia, dale feedabck aquí y presiona generar nuevamente.</p>
                            <input
                                type="text"
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                placeholder="Ej: Haz los bullet points más agresivos, o habla de la caída del Bitcoin."
                                className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-xs focus:border-yellow-500 outline-none"
                            />
                            <button onClick={handleGenerateDraft} disabled={generating || sending} className="w-full flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest font-black px-3 py-2.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg transition-colors border border-yellow-500/30">
                                {generating ? <><Loader size={14} className="animate-spin" /> Ensamblando Reporte Bi-fásico...</> : <>🤖 Forzar/Generar Borrador</>}
                            </button>
                        </div>


                        {/* Acciones Principales y Asunto */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-gray-400">Asunto del correo (La IA genera JSON)</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="ej. 🦖 Estrategias de IA para esta semana"
                                className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none"
                            />
                        </div>

                        {/* URL adjunto */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <PaperclipIcon size={12} /> PDF Premium B2B (Solo se incluye como Botón de Pago en el Mail)
                            </label>
                            <input
                                type="url"
                                value={attachmentUrl}
                                onChange={e => setAttachmentUrl(e.target.value)}
                                placeholder="https://godzillaconsulting.ai/media/guia.pdf"
                                className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none"
                                readOnly
                            />
                        </div>

                        {/* Cuerpo HTML */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400">
                                Cuerpo Skimmable de Hoy (Si usas IA, esto es en formato JSON Interno)
                            </label>
                            <textarea
                                rows={10}
                                value={bodyHtml}
                                onChange={e => setBodyHtml(e.target.value)}
                                placeholder={`<h2>Saludos,</h2>\n<p>Esta semana te compartimos...</p>`}
                                className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm font-mono focus:border-[#CC0000] outline-none resize-none"
                            />
                        </div>

                        {/* Preview del HTML */}
                        {bodyHtml && !bodyHtml.startsWith('{"es"') && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400">Vista previa (Versión final mostrada a cliente)</label>
                                <div
                                    className="bg-[#f6f6f6] rounded-xl p-4 text-sm text-[#333333] max-h-48 overflow-y-auto w-full max-w-[600px] mx-auto "
                                    dangerouslySetInnerHTML={{ __html: String(bodyHtml).replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>') }}
                                />
                            </div>
                        )}

                        {/* Botón enviar */}
                        <button
                            onClick={handleSend}
                            disabled={sending || !subject.trim() || !bodyHtml.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-red-600 text-white py-3 rounded-xl font-black text-sm transition shadow-[0_4px_20px_rgba(204,0,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {sending
                                ? <><Loader size={16} className="animate-spin" /> Encolando envíos...</>
                                : <><Send size={16} /> Enviar (Con Paywall de PDF inclúido)</>
                            }
                        </button>
                    </div>
                )}

                {/* ─ SUBSCRIBERS ─ */}
                {tab === 'subscribers' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-neutral-500 tracking-widest">
                                {subscribers.length} suscriptores
                            </p>
                            <button onClick={fetchSubscribers} className="text-[10px] text-neutral-500 hover:text-white transition">
                                🔄 Actualizar
                            </button>
                        </div>

                        {loadingSubs ? (
                            <div className="flex items-center justify-center py-12 gap-2 text-neutral-500">
                                <Loader size={16} className="animate-spin" /> Cargando...
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {subscribers.map(s => (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800">
                                        <div>
                                            <p className="text-xs font-semibold text-white">{s.email}</p>
                                            <p className="text-[9px] text-neutral-500">{s.source} · {new Date(s.subscribed_at).toLocaleDateString('es-MX')} · <span className="font-bold text-sky-400">ID: {s.language || 'es'}</span></p>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                            s.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-neutral-700 text-neutral-500'
                                        }`}>
                                            {s.status === 'active' ? 'Activo' : 'Desuscrito'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─ HISTORY ─ */}
                {tab === 'history' && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-neutral-500 tracking-widest">Últimos envíos</p>
                        {loadingHist ? (
                            <div className="flex items-center justify-center py-12 gap-2 text-neutral-500">
                                <Loader size={16} className="animate-spin" /> Cargando...
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map(n => {
                                    // Parse subject for history
                                    let hSub = n.subject || 'Sin Asunto';
                                    try { const jSub = JSON.parse(hSub); hSub = jSub.es || hSub; } catch(e){}
                                    
                                    return (
                                    <div key={n.id} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-xs font-bold text-white leading-snug flex-1">{hSub}</p>
                                            <div className="flex items-center gap-2">
                                                {n.attachment_url && (
                                                    <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" title="Abrir reporte PDF adjunto" className="text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black border border-yellow-500/20 px-2 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1">
                                                        💎 Ver Premium
                                                    </a>
                                                )}
                                                {n.status === 'draft' && (
                                                    <button onClick={() => {
                                                        setCurrentDraftId(n.id);
                                                        setSubject(n.subject || '');
                                                        setBodyHtml(n.body_html || '');
                                                        setAttachmentUrl(n.attachment_url || '');
                                                        setTab('compose');
                                                    }} className="text-[#CC0000] bg-white/5 hover:bg-[#CC0000] hover:text-white px-2 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1">
                                                        ✏️ Editar
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(n.id)} className="text-neutral-500 hover:text-red-500 hover:bg-neutral-800 px-2 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1" title="Borrar Reporte">
                                                     🗑️
                                                </button>
                                                {statusBadge(n.status)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] text-neutral-500">
                                            <span className="flex items-center gap-1"><Users size={10} /> {n.total_recipients || 0} total</span>
                                            <span className="flex items-center gap-1"><CheckCircle size={10} className="text-green-400" /> {n.sent_count || 0} ok</span>
                                            {n.failed_count > 0 && <span className="flex items-center gap-1"><XCircle size={10} className="text-red-400" /> {n.failed_count} falló</span>}
                                            {n.sent_at && <span className="flex items-center gap-1"><Clock size={10} /> {new Date(n.sent_at).toLocaleDateString('es-MX')}</span>}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
