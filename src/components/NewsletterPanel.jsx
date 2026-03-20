import React, { useState, useEffect } from'react';
import { Send, Users, Clock, CheckCircle, XCircle, Loader, AlertCircle, PaperclipIcon } from'lucide-react';

const API_BASE = import.meta.env.DEV ?'http://localhost:3000' :'';
const getToken = () => localStorage.getItem('adminToken');

const authHeaders = () => ({'Content-Type':'application/json',
 Authorization: `Bearer ${getToken()}`,
});

// ── Panel de Newsletter ──────────────────────────────────────────────────────
export default function NewsletterPanel() {
 const [tab, setTab] = useState('compose'); //'compose' |'subscribers' |'history'

 // Compose state
 const [subject, setSubject] = useState('');
 const [bodyHtml, setBodyHtml] = useState('');
 const [attachmentUrl, setAttachmentUrl] = useState('');
 const [sending, setSending] = useState(false);
 const [sendResult, setSendResult] = useState(null);

 // Subscribers
 const [subscribers, setSubscribers] = useState([]);
 const [loadingSubs, setLoadingSubs] = useState(false);

 // History
 const [history, setHistory] = useState([]);
 const [loadingHist, setLoadingHist] = useState(false);

 // Cargar suscriptores
 const fetchSubscribers = async () => {
 setLoadingSubs(true);
 try {
 const r = await fetch(`${API_BASE}/api/newsletter/subscribers`, { headers: authHeaders() });
 const d = await r.json();
 setSubscribers(d.subscribers || []);
 } catch { /* silent */ }
 setLoadingSubs(false);
 };

 // Cargar historial
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
 if (tab ==='subscribers') fetchSubscribers();
 if (tab ==='history') fetchHistory();
 }, [tab]);

 const handleSend = async () => {
 if (!subject.trim() || !bodyHtml.trim()) return;
 setSending(true);
 setSendResult(null);
 try {
 const r = await fetch(`${API_BASE}/api/newsletter/send`, {
 method:'POST',
 headers: authHeaders(),
 body: JSON.stringify({ subject, bodyHtml, attachmentUrl: attachmentUrl || null }),
 });
 const d = await r.json();
 setSendResult(d);
 if (d.success) { setSubject(''); setBodyHtml(''); setAttachmentUrl(''); }
 } catch (err) {
 setSendResult({ success: false, message: err.message });
 }
 setSending(false);
 };

 const statusBadge = (status) => {
 const map = {
 done: { color:'text-green-400 bg-green-400/10', icon: <CheckCircle size={12} />, label:'Enviado' },
 sending: { color:'text-yellow-400 bg-yellow-400/10', icon: <Loader size={12} className="animate-spin" />, label:'Enviando' },
 failed: { color:'text-red-400 bg-red-400/10', icon: <XCircle size={12} />, label:'Falló' },
 draft: { color:'text-neutral-400 bg-neutral-800', icon: null, label:'Borrador' },
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
 <h2 className="text-sm font-black text-white">📧 Newsletter</h2>
 <p className="text-[10px] text-neutral-500 mt-0.5">Redacta y envía boletines a todos tus suscriptores</p>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 px-4 py-2 border-b border-neutral-800 shrink-0">
 {[
 { id:'compose', label:'📝 Redactar' },
 { id:'subscribers', label:'👥 Suscriptores' },
 { id:'history', label:'📜 Historial' },
 ].map(t => (
 <button key={t.id} onClick={() => setTab(t.id)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
 tab === t.id ?'bg-[#CC0000] text-white' :'bg-neutral-800 text-neutral-400 hover:text-white'
 }`}>
 {t.label}
 </button>
 ))}
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4 space-y-4">

 {/* ─ COMPOSE ─ */}
 {tab ==='compose' && (
 <div className="space-y-4">

 {sendResult && (
 <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
 sendResult.success
 ?'bg-green-500/10 border-green-500/20 text-green-400'
 :'bg-red-500/10 border-red-500/20 text-red-400'
 }`}>
 {sendResult.success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
 <div>
 <p className="font-bold">{sendResult.success ?'¡Enviando!' :'Error'}</p>
 <p className="text-xs opacity-80">{sendResult.message}</p>
 {sendResult.totalRecipients && (
 <p className="text-xs mt-1">👥 {sendResult.totalRecipients} destinatarios encolados</p>
 )}
 </div>
 </div>
 )}

 {/* Asunto */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400">Asunto del correo</label>
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
 <PaperclipIcon size={12} /> URL del adjunto (opcional)
 </label>
 <input
 type="url"
 value={attachmentUrl}
 onChange={e => setAttachmentUrl(e.target.value)}
 placeholder="https://godzillaconsulting.ai/media/guia.pdf"
 className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none"
 />
 </div>

 {/* Cuerpo HTML */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400">
 Cuerpo del boletín <span className="text-neutral-600">(HTML permitido)</span>
 </label>
 <textarea
 rows={14}
 value={bodyHtml}
 onChange={e => setBodyHtml(e.target.value)}
 placeholder={`<h2>Hola,</h2>\n<p>Esta semana te compartimos...</p>`}
 className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm font-mono focus:border-[#CC0000] outline-none resize-none"
 />
 </div>

 {/* Preview del HTML */}
 {bodyHtml && (
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400">Vista previa</label>
 <div
 className="bg-white rounded-xl p-4 text-sm text-black max-h-48 overflow-y-auto"
 dangerouslySetInnerHTML={{ __html: bodyHtml }}
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
 : <><Send size={16} /> Enviar a Todos los Suscriptores</>
 }
 </button>
 <p className="text-[10px] text-neutral-600 text-center">
 Los correos se envían de forma escalonada (2s entre cada uno) para proteger la reputación del dominio.
 </p>
 </div>
 )}

 {/* ─ SUBSCRIBERS ─ */}
 {tab ==='subscribers' && (
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
 <p className="text-[9px] text-neutral-500">{s.source} · {new Date(s.subscribed_at).toLocaleDateString('es-MX')}</p>
 </div>
 <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
 s.status ==='active' ?'bg-green-400/10 text-green-400' :'bg-neutral-700 text-neutral-500'
 }`}>
 {s.status ==='active' ?'Activo' :'Desuscrito'}
 </span>
 </div>
 ))}
 {subscribers.length === 0 && (
 <p className="text-neutral-600 text-sm text-center py-8">Aún no hay suscriptores.</p>
 )}
 </div>
 )}
 </div>
 )}

 {/* ─ HISTORY ─ */}
 {tab ==='history' && (
 <div className="space-y-3">
 <p className="text-xs font-bold text-neutral-500 tracking-widest">Últimos envíos</p>
 {loadingHist ? (
 <div className="flex items-center justify-center py-12 gap-2 text-neutral-500">
 <Loader size={16} className="animate-spin" /> Cargando...
 </div>
 ) : (
 <div className="space-y-2">
 {history.map(n => (
 <div key={n.id} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
 <div className="flex items-start justify-between gap-2">
 <p className="text-xs font-bold text-white leading-snug flex-1">{n.subject}</p>
 {statusBadge(n.status)}
 </div>
 <div className="flex items-center gap-4 text-[10px] text-neutral-500">
 <span className="flex items-center gap-1"><Users size={10} /> {n.total_recipients} total</span>
 <span className="flex items-center gap-1"><CheckCircle size={10} className="text-green-400" /> {n.sent_count} ok</span>
 {n.failed_count > 0 && <span className="flex items-center gap-1"><XCircle size={10} className="text-red-400" /> {n.failed_count} falló</span>}
 <span className="flex items-center gap-1"><Clock size={10} /> {new Date(n.sent_at).toLocaleDateString('es-MX')}</span>
 </div>
 </div>
 ))}
 {history.length === 0 && (
 <p className="text-neutral-600 text-sm text-center py-8">No hay boletines enviados aún.</p>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
