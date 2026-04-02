import React, { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ─── EQUIPO (para @menciones) ─────────────────────────────────────────────
const TEAM = ['JareG', 'Oscar', 'Judith', 'Alex'];

// ─── ROLES ────────────────────────────────────────────────────────────────
// canAssign: JareG (super), Oscar (godzilla_admin), Judith (CM)
const canAssign = (profile) => {
    if (!profile) return false;
    const usr = (profile.username || '').toLowerCase();
    return profile.role === 'admin' || profile.role === 'cm' ||
        usr === 'jareg' || usr === 'oscar' || usr === 'godzilla_admin' || usr === 'judith' ||
        profile.id === 1 || profile.id === 4;
};

// ─── PARSEAR MENCIONES para resaltado ─────────────────────────────────────
const renderMentions = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
        part.startsWith('@')
            ? <span key={i} className="text-[#CC0000] font-black">{part}</span>
            : <span key={i}>{part}</span>
    );
};

export default function CMCalendar({ adminProfile }) {
    const navigate = useNavigate();
    const canCreate = canAssign(adminProfile);
    const currentUser = adminProfile?.username || 'Usuario';

    // ─── Pestaña activa del Calendario (solo para admins) ─────────────────
    // 'contenido' | 'citas' | 'pendientes' | 'todos'
    const [calendarTab, setCalendarTab] = useState('contenido');

    // ─── Estado del Calendario de Contenido ───────────────────────────────
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activePlatform, setActivePlatform] = useState('ALL');
    const [activeHashtag, setActiveHashtag] = useState(null);
    const [showNewAssignModal, setShowNewAssignModal] = useState(false);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        empresa: 'godzilla',
        calendario: 'contenido',
        asignado: '',
        titulo: '',
        fecha: '',
        plataforma: 'ALL',
        briefing: '',
        urlFoto: '',
        urlVideo: '',
        urlReferencia: ''
    });

    // ─── Citas (desde DB) ─────────────────────────────────────────────────
    const [citas, setCitas] = useState([]);
    const [loadingCitas, setLoadingCitas] = useState(false);

    // ─── Sistema de Tareas ────────────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [taskView, setTaskView] = useState('pendientes');
    const [newTask, setNewTask] = useState({ que: '', para: '', referencias: '', deadline: '' });

    // ─── Sistema de Comentarios & Notificaciones ───────────────────────────
    const [commentText, setCommentText] = useState('');
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionDropdownPos, setMentionDropdownPos] = useState({ top: 0, left: 0 });
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const commentInputRef = useRef(null);

    // ─── Tendencias en Tiempo Real ─────────────────────────────────────────
    const [trendsNiche, setTrendsNiche] = useState('B2B Tech');
    const [trendsNetwork, setTrendsNetwork] = useState('Todas');
    const [realTrends, setRealTrends] = useState(null);
    const [loadingTrends, setLoadingTrends] = useState(false);

    const fetchTrends = async (network = trendsNetwork, niche = trendsNiche) => {
        setLoadingTrends(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            // Si DEV mode usar /api/trends directo o port 3000
            const url = import.meta.env.DEV ? `http://localhost:3000/api/trends?network=${network}&filter=${niche}` : `/api/trends?network=${network}&filter=${niche}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
            const data = await res.json();
            if (data.success && data.data) {
                setRealTrends(data.data);
            }
        } catch (e) {
            console.error('Error fetching trends', e);
        }
        setLoadingTrends(false);
    };

    const unreadCount = notifications.filter(n => !n.read && n.to?.toLowerCase() === currentUser.toLowerCase()).length;

    useEffect(() => {
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 5);

        setEvents([
            {
                id: 1, title: '🔵 FB: El boca a boca no sirve', start: today, end: today, status: 'urgent',
                caption: '🚀 El boca a boca no te va a pagar la nómina el mes que viene. Si tu empresa Tech sigue dependiendo de referidos, estás cediendo el control a la "suerte".',
                media_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80',
                provider: 'Nano Banana', platform: 'facebook',
                comments: [{ id: 1, author: 'Judith', text: '@Alex por favor haz la imagen menos oscura. Se pierde el logo.', time: 'hace 2h' }]
            },
            {
                id: 2, title: '⚫ TK: Trend de Programación', start: tomorrow, end: tomorrow, status: 'warning',
                caption: '🎶 Si tu backend hace esto en 2026... (Baila) 🦖',
                media_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
                provider: 'Kling AI', platform: 'tiktok',
                comments: []
            },
            {
                id: 3, title: '🟣 IG: Portafolio de Éxito', start: nextWeek, end: nextWeek, status: 'success',
                caption: 'Así escalamos el B2B en Godzilla Consulting.',
                media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
                provider: 'Cockers Manual', platform: 'instagram',
                comments: []
            }
        ]);

        setTasks([
            { id: 1, que: 'Hacer la imagen menos oscura. Se pierde el logo de Godzilla.', para: 'Alex', referencias: 'https://godzillaconsulting.ai/admin', deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], done: false, asignadoPor: 'Judith', createdAt: new Date().toISOString() },
        ]);

        // Notificación de ejemplo para el usuario actual
        setNotifications([
            { id: 1, to: currentUser, from: 'Judith', text: '@' + currentUser + ' revisa el post de Facebook, necesita ajuste de color.', read: false, time: 'hace 2h', eventTitle: '🔵 FB: El boca a boca' }
        ]);

        // Cargar citas reales si es admin
        if (canAssign(adminProfile)) {
            setLoadingCitas(true);
            const API_URL = import.meta.env.VITE_API_URL || '';
            fetch(`${API_URL}/api/citas`)
                .then(r => r.json())
                .then(data => {
                    const citaEvents = (data.citas || data || []).map(c => ({
                        id: `cita-${c.id}`,
                        title: `📅 ${c.nombre_completo || c.nombre} — ${c.tipo_sesion || 'Consultoría'}`,
                        start: new Date(`${c.fecha}T${c.hora || '10:00'}`),
                        end: new Date(`${c.fecha}T${c.hora || '10:00'}`),
                        status: c.status === 'confirmada' ? 'success' : 'warning',
                        tipo: 'cita',
                        raw: c
                    }));
                    setCitas(citaEvents);
                })
                .catch(() => {
                    // Si falla, datos de muestra
                    setCitas([
                        { id: 'cita-1', title: '📅 Carlos Mendez — CRM', start: today, end: today, status: 'success', tipo: 'cita', raw: { email: 'carlos@demo.com', telefono: '664-000-0001', notas_adicionales: 'Interesado en plan B2B' } },
                        { id: 'cita-2', title: '📅 Ana Torres — SEO', start: tomorrow, end: tomorrow, status: 'warning', tipo: 'cita', raw: { email: 'ana@demo.com', telefono: '664-000-0002', notas_adicionales: 'Quiere auditoría SEO completa' } },
                    ]);
                })
                .finally(() => setLoadingCitas(false));
        }

        if (canAssign(adminProfile)) {
            fetchTrends('Todas', 'B2B Tech');
        }
    }, []);

    // ─── DETECTOR DE @menciones EN EL INPUT ──────────────────────────────
    const handleCommentChange = (e) => {
        const val = e.target.value;
        setCommentText(val);
        const cursor = e.target.selectionStart;
        const textUpToCursor = val.slice(0, cursor);
        const match = textUpToCursor.match(/@(\w*)$/);
        if (match) {
            setMentionQuery(match[1]);
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (username) => {
        const cursor = commentInputRef.current.selectionStart;
        const before = commentText.slice(0, cursor);
        const after = commentText.slice(cursor);
        const newBefore = before.replace(/@\w*$/, `@${username} `);
        setCommentText(newBefore + after);
        setMentionQuery(null);
        commentInputRef.current.focus();
    };

    const submitComment = () => {
        if (!commentText.trim() || !selectedEvent) return;

        const newComment = { id: Date.now(), author: currentUser, text: commentText, time: 'ahora' };

        // Detectar menciones y crear notificaciones
        const mentioned = TEAM.filter(u => commentText.toLowerCase().includes(`@${u.toLowerCase()}`));
        const newNotifs = mentioned.map(u => ({
            id: Date.now() + Math.random(),
            to: u,
            from: currentUser,
            text: commentText,
            read: false,
            time: 'ahora',
            eventTitle: selectedEvent.title
        }));

        if (newNotifs.length > 0) setNotifications(prev => [...newNotifs, ...prev]);

        // Actualizar comentarios del evento
        setEvents(prev => prev.map(ev =>
            ev.id === selectedEvent.id
                ? { ...ev, comments: [...(ev.comments || []), newComment] }
                : ev
        ));
        setSelectedEvent(prev => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
        setCommentText('');
        setMentionQuery(null);
    };

    // ─── ESTILOS DEL CALENDARIO ────────────────────────────────────────────
    const eventStyleGetter = (event) => {
        let backgroundColor = '#333333'; let border = '1px solid #111111';
        if (event.status === 'urgent') { backgroundColor = '#CC0000'; border = '1px solid #ff4444'; }
        else if (event.status === 'warning') { backgroundColor = '#d97706'; border = '1px solid #f59e0b'; }
        else if (event.status === 'success') { backgroundColor = '#15803d'; border = '1px solid #22c55e'; }
        return {
            style: { backgroundColor, border, borderRadius: '8px', opacity: 0.9, color: 'white', borderLeft: '4px solid white', display: 'block', fontWeight: 'bold', fontSize: '11px', padding: '2px 5px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }
        };
    };

    const hackerCalendarStyles = `
      .rbc-calendar { font-family: 'Inter', sans-serif; min-height: 50vh; }
      .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: #333; background: #0a0a0a; border-radius: 12px; overflow: hidden; }
      .rbc-header { padding: 10px 0; border-bottom: 1px solid #333 !important; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #888; }
      .rbc-header + .rbc-header { border-left: 1px solid #333 !important; }
      .rbc-day-bg { border-left: 1px solid #222 !important; }
      .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #222 !important; }
      .rbc-month-row + .rbc-month-row { border-top: 1px solid #222 !important; }
      .rbc-off-range-bg { background-color: #050505; }
      .rbc-today { background-color: rgba(204, 0, 0, 0.05); }
      .rbc-date-cell { padding: 5px; font-weight: bold; color: #aaa; }
      .rbc-btn-group button { background: #111; color: #fff; border: 1px solid #333; padding: 5px 15px; font-weight: bold; transition: 0.3s; }
      .rbc-btn-group button:hover { background: #333; }
      .rbc-btn-group button.rbc-active { background: #CC0000; border-color: #CC0000; box-shadow: none; }
      .rbc-toolbar-label { color: white; font-weight: 900; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 2px; }
      .rbc-time-content { border-top: 1px solid #333; }
      .rbc-timeslot-group { border-bottom: 1px solid #222; }
    `;

    const filteredEvents = activePlatform === 'ALL' ? events : events.filter(e => e.platform === activePlatform);
    // Eventos a mostrar en el calendario según pestaña
    const pendingTaskEvents = tasks.filter(t => !t.done).map(t => ({
        id: `task-${t.id}`,
        title: `✅ ${t.para}: ${t.que.substring(0, 35)}...`,
        start: new Date(t.deadline + 'T00:00'),
        end: new Date(t.deadline + 'T00:00'),
        status: 'warning', tipo: 'pendiente', raw: t
    }));
    const calendarEvents = {
        contenido: filteredEvents,
        citas: citas,
        pendientes: pendingTaskEvents,
        todos: [...filteredEvents, ...citas, ...pendingTaskEvents]
    }[calendarTab] || filteredEvents;

    const pendingTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);

    // ─── Mockup de red social (visible para TODOS) ─────────────────────────
    const renderSocialMockup = (event) => (
        <div className="bg-white rounded-xl overflow-hidden shadow-xl text-black font-sans border border-white/20">
            {event.platform === 'instagram' && (
                <div>
                    <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white border-2 border-white overflow-hidden"><img src="/logo192.png" alt="Godzilla" className="w-full h-full object-cover bg-black" /></div>
                        </div>
                        <p className="font-bold text-sm">godzillaconsulting</p>
                    </div>
                    <img src={event.media_url} className="w-full aspect-square object-cover" alt="post" />
                    <div className="p-3">
                        <div className="flex gap-4 mb-2"><span className="text-xl">❤️</span><span className="text-xl">💬</span><span className="text-xl">↗️</span></div>
                        <p className="font-bold text-sm mb-1">1,234 Me gusta</p>
                        <p className="text-sm"><span className="font-bold mr-1">godzillaconsulting</span><span className="text-gray-700">{event.caption.substring(0, 60)}...</span></p>
                    </div>
                </div>
            )}
            {event.platform === 'facebook' && (
                <div>
                    <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full bg-black overflow-hidden relative"><img src="/logo192.png" alt="Godzilla" className="w-full h-full object-cover absolute top-0 left-0" /></div>
                        <div><p className="font-bold text-[15px] leading-tight">Godzilla Consulting</p><p className="text-xs text-gray-500">Publicado • Hace 2 min • 🌎</p></div>
                    </div>
                    <div className="px-3 pb-3 text-[14px] text-gray-800"><p className="whitespace-pre-wrap line-clamp-3">{event.caption}</p></div>
                    <img src={event.media_url} className="w-full h-52 object-cover" alt="post" />
                    <div className="p-3 border-t border-gray-200 flex justify-between text-gray-500 text-sm font-semibold"><span>👍 Me gusta</span><span>💬 Comentar</span><span>↪️ Compartir</span></div>
                </div>
            )}
            {event.platform === 'tiktok' && (
                <div className="relative bg-black text-white h-[350px] flex items-center justify-center overflow-hidden">
                    <img src={event.media_url} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="post" />
                    <div className="absolute right-2 bottom-12 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden shadow-lg"><img src="/logo192.png" className="w-full h-full object-cover bg-black" alt="logo" /></div>
                        <div className="flex flex-col items-center"><span className="text-3xl drop-shadow-md">❤️</span><span className="text-xs font-bold drop-shadow-md">124K</span></div>
                        <div className="flex flex-col items-center"><span className="text-3xl drop-shadow-md">💬</span><span className="text-xs font-bold drop-shadow-md">1,024</span></div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-16">
                        <p className="font-bold text-sm drop-shadow-md">@godzillaconsulting</p>
                        <p className="text-xs mt-1 line-clamp-2 drop-shadow-md leading-tight">{event.caption}</p>
                    </div>
                </div>
            )}
        </div>
    );

    // ─── SIDEBAR ──────────────────────────────────────────────────────────
    const renderSidebar = () => {
        if (canCreate) {
            return (
                <div className="w-[280px] border-l border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col">
                    <div className="p-5 border-b border-white/10 bg-black/60">
                        <div className="flex justify-between items-center">
                            <h3 className="text-white font-black uppercase text-sm tracking-widest">🔥 Trends & Hashtags</h3>
                        </div>
                        <p className="text-xs text-neutral-500 font-bold mb-3">Datos en tiempo real (IA)</p>
                        <div className="flex flex-col gap-2">
                            <select value={trendsNetwork} onChange={e => setTrendsNetwork(e.target.value)} className="w-full bg-black border border-white/20 text-white text-[10px] rounded p-1.5 focus:outline-none focus:border-[#CC0000]">
                                <option value="Todas">🌐 Todas las redes</option>
                                <option value="TikTok">⚫ TikTok</option>
                                <option value="Instagram">🟣 Instagram</option>
                                <option value="LinkedIn">🔵 LinkedIn</option>
                            </select>
                            <input value={trendsNiche} onChange={e => setTrendsNiche(e.target.value)} placeholder="Ej: SaaS, E-commerce, IA..." className="w-full bg-black border border-white/20 text-white text-[10px] rounded p-1.5 focus:outline-none focus:border-[#CC0000]" />
                            <button onClick={() => fetchTrends(trendsNetwork, trendsNiche)} disabled={loadingTrends} className="w-full bg-[#CC0000] text-white text-[10px] font-black uppercase py-1.5 rounded disabled:opacity-50 hover:bg-white hover:text-[#CC0000] transition-colors">
                                {loadingTrends ? 'Buscando...' : '🔎 Analizar Trends'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-5">
                        {loadingTrends ? (
                            <div className="flex flex-col items-center justify-center h-40 opacity-50">
                                <span className="text-2xl animate-spin mb-2">⏳</span>
                                <p className="text-[10px] font-bold text-white uppercase tracking-widest">Extrayendo datos de la red...</p>
                            </div>
                        ) : realTrends ? (
                            <>
                                <div className="bg-black/50 border border-white/10 p-4 rounded-xl">
                                    <h4 className="text-[#CC0000] font-black text-[10px] uppercase mb-3">Trending {realTrends.niche} hoy:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(realTrends.hashtags || []).map(tag => (
                                            <span key={tag} onClick={() => setActiveHashtag(activeHashtag === tag ? null : tag)}
                                                className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors ${activeHashtag === tag ? 'bg-gradient-to-r from-[#CC0000] to-red-800 text-white' : 'text-neutral-300 bg-black/60 border border-white/10 hover:bg-white/20'}`}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-black/50 border border-white/10 p-4 rounded-xl">
                                    <h4 className="text-neutral-500 font-black text-[10px] uppercase mb-3">Hooks Sugeridos ({realTrends.network}):</h4>
                                    <ul className="text-[10px] text-neutral-300 space-y-3 font-bold leading-tight">
                                        {(realTrends.hooks || []).map((hk, i) => (
                                            <li key={i} className="flex gap-2">
                                                <span className="text-[#CC0000] shrink-0">👉</span>
                                                <span>{hk}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <p className="text-neutral-500 text-xs font-bold text-center">Haz clic en Analizar Trends para obtener la información de hoy.</p>
                        )}
                    </div>
                </div>
            );
        }

        // Vista diseñador (Alex etc.)
        return (
            <div className="w-[300px] border-l border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col">
                <div className="p-5 border-b border-red-900/50 bg-gradient-to-r from-[#CC0000]/10 to-transparent">
                    <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest">🔔 Mis Tareas</h3>
                    <p className="text-xs text-red-500/70 font-bold">Asignadas por CM / Dirección</p>
                </div>
                <div className="flex border-b border-white/10">
                    {[['pendientes', 'Por Realizar'], ['realizadas', 'Realizadas']].map(([key, label]) => (
                        <button key={key} onClick={() => setTaskView(key)}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${taskView === key ? 'text-[#CC0000] border-b-2 border-[#CC0000]' : 'text-neutral-600 hover:text-neutral-400'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {taskView === 'pendientes' && (
                        pendingTasks.length === 0
                            ? <p className="text-neutral-600 text-xs font-bold text-center py-8">✅ Sin tareas pendientes</p>
                            : pendingTasks.map(task => (
                                <div key={task.id} className="bg-black/30 border border-red-900/40 hover:border-red-500/60 p-4 rounded-xl transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="text-xs font-black text-white leading-snug">{task.que}</p>
                                        <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true } : t))}
                                            className="shrink-0 w-6 h-6 rounded-full border-2 border-neutral-700 hover:border-green-500 hover:bg-green-500/20 transition-all flex items-center justify-center" title="Marcar como realizada">
                                            <span className="text-[10px]">✔</span>
                                        </button>
                                    </div>
                                    <div className="space-y-1 mt-2 border-t border-white/5 pt-2">
                                        <p className="text-[10px] text-neutral-500 font-bold">📎 Ref: <span className="text-neutral-400">{task.referencias}</span></p>
                                        <p className="text-[10px] text-neutral-500 font-bold">📅 Para: <span className="text-yellow-400">{task.deadline}</span></p>
                                        <p className="text-[10px] text-neutral-500 font-bold">👤 Asignó: <span className="text-[#CC0000]">{task.asignadoPor}</span></p>
                                    </div>
                                    <button onClick={() => navigate('/studio')} className="mt-3 w-full text-[10px] bg-black/60 border border-neutral-700 text-[#CC0000] px-3 py-1.5 rounded-lg font-black hover:bg-[#CC0000] hover:text-white transition-all">Ir al Estudio ➔</button>
                                </div>
                            ))
                    )}
                    {taskView === 'realizadas' && (
                        doneTasks.length === 0
                            ? <p className="text-neutral-600 text-xs font-bold text-center py-8">Aún no hay tareas completadas</p>
                            : doneTasks.map(task => (
                                <div key={task.id} className="bg-green-950/10 border border-green-900/30 p-4 rounded-xl opacity-70">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-green-500 text-sm">✅</span>
                                        <p className="text-xs font-bold text-neutral-400 line-through">{task.que}</p>
                                    </div>
                                    <p className="text-[10px] text-neutral-600 font-bold">Asignó: {task.asignadoPor}</p>
                                </div>
                            ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,0,0,0.15),rgba(255,255,255,0))] relative overflow-hidden flex text-white">
            <style>{hackerCalendarStyles}</style>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* ── HEADER ── */}
                <div className="px-8 py-5 bg-[#000000] border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                                {canCreate ? "Control de Emisión" : "Calendario de Campañas"}
                            </h2>
                            <p className="text-neutral-500 font-bold text-sm mt-0.5">
                                {canCreate ? `Gestión completa • ${currentUser}` : `Solo lectura y comentarios • ${currentUser}`}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* 🔔 Campana de Notificaciones */}
                            <div className="relative">
                                <button onClick={() => { setShowNotifications(!showNotifications); setNotifications(prev => prev.map(n => n.to?.toLowerCase() === currentUser.toLowerCase() ? { ...n, read: true } : n)); }}
                                    className="relative w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:border-[#CC0000]/50 transition-colors">
                                    <span className="text-lg">🔔</span>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#CC0000] rounded-full text-[10px] font-black flex items-center justify-center text-white animate-pulse shadow-[0_0_8px_rgba(204,0,0,0.8)]">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                {/* Dropdown de notificaciones */}
                                {showNotifications && (
                                    <div className="absolute right-0 top-12 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] z-50 overflow-hidden">
                                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                            <h4 className="text-white font-black text-xs uppercase tracking-widest">Menciones & Alertas</h4>
                                            <button onClick={() => setShowNotifications(false)} className="text-neutral-500 hover:text-white text-lg font-black">×</button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.filter(n => n.to?.toLowerCase() === currentUser.toLowerCase()).length === 0
                                                ? <p className="text-neutral-600 text-xs font-bold text-center py-8">Sin notificaciones</p>
                                                : notifications.filter(n => n.to?.toLowerCase() === currentUser.toLowerCase()).map(n => (
                                                    <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'border-l-2 border-l-[#CC0000]' : ''}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[#CC0000] font-black text-xs">{n.from}</span>
                                                            <span className="text-neutral-600 text-[10px]">{n.time}</span>
                                                        </div>
                                                        <p className="text-xs text-neutral-300 font-bold leading-snug">{renderMentions(n.text)}</p>
                                                        <p className="text-[10px] text-neutral-600 mt-1 font-bold">📅 En: {n.eventTitle}</p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            {canCreate && (
                                <button onClick={() => setShowNewAssignModal(true)}
                                    className="px-4 py-2 bg-black/60 border border-[#CC0000]/40 hover:border-[#CC0000] text-[#CC0000] rounded-xl font-black text-xs transition-all uppercase tracking-widest">
                                    📋 Asignar Tarea
                                </button>
                            )}
                            {canCreate && (
                                <button onClick={() => setShowNewCampaignModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-[#CC0000] to-red-800 hover:from-white hover:to-white hover:text-[#CC0000] text-white rounded-xl font-black text-xs transition-all shadow-[0_4px_15px_rgba(204,0,0,0.5)] border border-red-900/50 uppercase tracking-widest flex items-center gap-1">
                                    ➕ Campaña
                                </button>
                            )}
                        </div>
                    </div>


                    {/* Pestañas de Calendario (solo Oscar, Judith, JareG) */}
                    {canCreate && (
                        <div className="flex gap-2 mb-4">
                            {[
                                { id: 'contenido', label: '📣 Contenido', count: events.length },
                                { id: 'citas', label: '📅 Citas', count: citas.length },
                                { id: 'pendientes', label: '✅ Pendientes', count: pendingTaskEvents.length },
                                { id: 'todos', label: '🗺️ Todo', count: null },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setCalendarTab(tab.id)}
                                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                                        calendarTab === tab.id
                                            ? 'bg-[#CC0000] text-white shadow-[0_0_12px_rgba(204,0,0,0.4)]'
                                            : 'bg-black/60 border border-white/10 text-neutral-500 hover:text-white hover:border-white/30'
                                    }`}>
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                            calendarTab === tab.id ? 'bg-white/20' : 'bg-white/10'
                                        }`}>{tab.count}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Filtros de Plataforma (solo en pestaña Contenido o Todos) */}
                    {(calendarTab === 'contenido' || calendarTab === 'todos' || !canCreate) && (
                    <div className="flex gap-3">
                        {[{ id: 'ALL', label: 'Todas' }, { id: 'facebook', label: '🔵 Facebook' }, { id: 'instagram', label: '🟣 Instagram' }, { id: 'tiktok', label: '⚫ TikTok' }].map(tab => (
                            <button key={tab.id} onClick={() => setActivePlatform(tab.id)}
                                className={`px-5 py-2 rounded-full font-black text-xs transition-all ${activePlatform === tab.id ? 'bg-white text-black' : 'bg-black/60 border border-white/10 text-neutral-500 hover:text-white'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    )}

                    {/* Carga de citas */}
                    {calendarTab === 'citas' && loadingCitas && (
                        <p className="text-xs text-neutral-500 font-black animate-pulse">Cargando citas desde la base de datos...</p>
                    )}
                </div>

                <div className="flex-1 p-4 md:p-6 overflow-hidden bg-[#050505] min-h-[500px]">
                    <Calendar
                        localizer={localizer} events={calendarEvents}
                        startAccessor="start" endAccessor="end" style={{ height: '100%' }}
                        messages={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día", next: "Sig", previous: "Ant" }}
                        culture="es" eventPropGetter={eventStyleGetter}
                        onSelectEvent={(event) => {
                            // Para citas y pendientes mostramos panel simplificado
                            if (event.tipo === 'cita') {
                                setSelectedEvent({ ...event, isCita: true });
                            } else if (event.tipo === 'pendiente') {
                                setSelectedEvent({ ...event, isPendiente: true });
                            } else {
                                setSelectedEvent(event);
                            }
                            setCommentText(''); setMentionQuery(null);
                        }}
                    />
                </div>
            </div>

            {renderSidebar()}

            {/* ── PANEL DE EVENTO/POST (visible para TODOS) ── */}
            {selectedEvent && (
                <div className="absolute top-0 right-0 h-full w-[420px] bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col z-50">
                    {/* Header */}
                    <div className={`p-4 border-b flex justify-between items-center shrink-0 ${selectedEvent.status === 'urgent' ? 'bg-gradient-to-r from-[#CC0000] to-red-800 border-red-900' : 'bg-black/30 border-white/10'}`}>
                        <div>
                            <h3 className="font-black text-sm uppercase text-white tracking-widest">{selectedEvent.title}</h3>
                            <p className="text-[10px] text-white/60 font-bold mt-0.5 uppercase">{selectedEvent.provider}</p>
                        </div>
                        <button onClick={() => setSelectedEvent(null)} className="text-white hover:text-black font-black text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20">×</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5 relative">
                        {/* Mockup de Red Social - visible para TODOS */}
                        <div>
                            <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-2">Vista Previa en Red Social:</p>
                            {renderSocialMockup(selectedEvent)}
                        </div>

                        {/* Copy editable - solo lectura para diseñadores */}
                        <div>
                            <p className="text-xs font-black text-neutral-500 uppercase mb-2">Copy / Caption:</p>
                            {canCreate
                                ? <textarea defaultValue={selectedEvent.caption} className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-sm text-white outline-none focus:border-yellow-500 transition-colors resize-none" rows="3" />
                                : <p className="bg-black/40 border border-white/5 p-3 rounded-xl text-sm text-neutral-300 font-bold">{selectedEvent.caption}</p>
                            }
                        </div>

                        {/* Asignar corrección - SOLO Oscar/Judith/JareG */}
                        {canCreate && (
                            <div className="pt-3 border-t border-white/10">
                                <p className="text-xs font-black text-neutral-500 uppercase mb-2">Asignar corrección al diseñador:</p>
                                <textarea placeholder="Ej: @Alex oscurece la imagen y sube el contraste..." className="w-full bg-black/30 border border-red-900/50 p-3 text-white text-sm rounded-xl resize-none outline-none focus:border-[#CC0000] mb-2" rows="2" />
                                <button className="w-full bg-gradient-to-r from-[#CC0000] to-red-800 text-white font-black py-2.5 rounded-xl text-xs uppercase transition-all hover:from-red-700">Mandar a Corregir ➔</button>
                            </div>
                        )}

                        {/* ── SECCIÓN DE COMENTARIOS (TODOS pueden comentar y mencionar) ── */}
                        <div className="pt-3 border-t border-white/10">
                            <p className="text-xs font-black text-neutral-500 uppercase mb-3 flex items-center gap-2">
                                💬 Comentarios del equipo
                                <span className="text-[10px] text-neutral-700 font-normal normal-case tracking-normal">Usa @Nombre para mencionar</span>
                            </p>

                            {/* Hilo de comentarios */}
                            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                                {(selectedEvent.comments || []).length === 0
                                    ? <p className="text-neutral-700 text-xs font-bold text-center py-4">Sin comentarios aún. Sé el primero.</p>
                                    : (selectedEvent.comments || []).map(c => (
                                        <div key={c.id} className={`flex gap-2 ${c.author?.toLowerCase() === currentUser.toLowerCase() ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-7 h-7 rounded-full bg-[#CC0000]/20 border border-[#CC0000]/40 flex items-center justify-center shrink-0 text-[10px] font-black text-[#CC0000]">
                                                {(c.author || '?')[0].toUpperCase()}
                                            </div>
                                            <div className={`max-w-[75%] ${c.author?.toLowerCase() === currentUser.toLowerCase() ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className={`px-3 py-2 rounded-xl text-xs font-bold leading-snug ${c.author?.toLowerCase() === currentUser.toLowerCase() ? 'bg-[#CC0000]/20 border border-[#CC0000]/30 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-neutral-300 rounded-tl-none'}`}>
                                                    {renderMentions(c.text)}
                                                </div>
                                                <p className="text-[10px] text-neutral-600 font-bold mt-1">{c.author} · {c.time}</p>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>

                            {/* Input de comentario con @menciones */}
                            <div className="relative">
                                {/* Dropdown de sugerencias de @menciones */}
                                {mentionQuery !== null && (
                                    <div className="absolute bottom-full mb-1 left-0 bg-[#1a1a1a] border border-[#CC0000]/30 rounded-xl overflow-hidden shadow-xl z-10 min-w-[160px]">
                                        {TEAM.filter(u => u.toLowerCase().startsWith(mentionQuery.toLowerCase())).map(u => (
                                            <button key={u} onClick={() => insertMention(u)}
                                                className="w-full text-left px-4 py-2 text-sm font-black text-white hover:bg-[#CC0000]/20 transition-colors flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-[#CC0000]/20 border border-[#CC0000]/40 flex items-center justify-center text-[10px] text-[#CC0000]">{u[0]}</span>
                                                @{u}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <input
                                        ref={commentInputRef}
                                        value={commentText}
                                        onChange={handleCommentChange}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                                        placeholder={`Comenta... usa @Nombre para mencionar`}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors placeholder:text-neutral-700"
                                    />
                                    <button onClick={submitComment}
                                        className="bg-[#CC0000] hover:bg-red-700 text-white font-black px-4 rounded-xl text-xs transition-colors shrink-0">
                                        ↑
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10">
                            <button className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] transition-all uppercase text-sm tracking-widest">Aprobar y Agendar ✔️</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: ASIGNAR TAREA ── */}
            {showNewAssignModal && canCreate && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111111] border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
                        <button onClick={() => setShowNewAssignModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2"><span className="text-[#CC0000]">📋</span> Asignar Tarea</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Qué se debe hacer? *</label>
                                <textarea value={newTask.que} onChange={e => setNewTask({ ...newTask, que: e.target.value })} placeholder="Ej: Hacer imagen menos oscura..." rows="3" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para quién? *</label>
                                <select value={newTask.para} onChange={e => setNewTask({ ...newTask, para: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                    <option value="">— Selecciona —</option>
                                    {TEAM.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Referencias</label>
                                <input type="text" value={newTask.referencias} onChange={e => setNewTask({ ...newTask, referencias: e.target.value })} placeholder="Link, brief o nota..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para cuándo? *</label>
                                <input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors [color-scheme:dark]" />
                            </div>
                            <button onClick={() => {
                                if (!newTask.que || !newTask.para || !newTask.deadline) return alert('Completa los campos obligatorios (*)');
                                setTasks(prev => [...prev, { id: Date.now(), ...newTask, done: false, asignadoPor: currentUser, createdAt: new Date().toISOString() }]);
                                // Notificación al asignado
                                setNotifications(prev => [{ id: Date.now(), to: newTask.para, from: currentUser, text: `@${newTask.para} tienes una nueva tarea asignada: "${newTask.que}"`, read: false, time: 'ahora', eventTitle: 'Tarea directa' }, ...prev]);
                                setNewTask({ que: '', para: '', referencias: '', deadline: '' });
                                setShowNewAssignModal(false);
                            }} className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-black uppercase tracking-widest transition-all">
                                Asignar Tarea ✔️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: NUEVA CAMPAÑA ── */}
            {showNewCampaignModal && canCreate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111111] border border-white/10 p-6 md:p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
                        <button onClick={() => setShowNewCampaignModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2"><span className="text-[#CC0000]">🎯</span> Programar Campaña</h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Empresa *</label>
                                    <select value={newCampaign.empresa} onChange={e => setNewCampaign({...newCampaign, empresa: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="godzilla">🦖 Godzilla Consulting</option>
                                        <option value="accrual" disabled>🏢 Accrual (Próximamente)</option>
                                        <option value="crein" disabled>🏗️ Crein (Próximamente)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Calendario Destino *</label>
                                    <select value={newCampaign.calendario} onChange={e => setNewCampaign({...newCampaign, calendario: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="contenido">📣 Calendario de Contenido</option>
                                        <option value="citas" disabled>📅 Calendario de Citas</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para quién? (Encargado) *</label>
                                    <select value={newCampaign.asignado} onChange={e => setNewCampaign({...newCampaign, asignado: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="">— Selecciona responsable —</option>
                                        {TEAM.map(u => <option key={u} value={u}>@{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Cuándo? (Fecha) *</label>
                                    <input type="date" value={newCampaign.fecha} onChange={e => setNewCampaign({...newCampaign, fecha: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors [color-scheme:dark]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Qué? (Título) *</label>
                                    <input type="text" value={newCampaign.titulo} onChange={e => setNewCampaign({...newCampaign, titulo: e.target.value})} placeholder="Ej: Video explicativo Godzilla..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Plataforma *</label>
                                    <select value={newCampaign.plataforma} onChange={e => setNewCampaign({...newCampaign, plataforma: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="ALL">🌐 Multicanal (Todas)</option>
                                        <option value="tiktok">⚫ TikTok</option>
                                        <option value="instagram">🟣 Instagram</option>
                                        <option value="facebook">🔵 Facebook</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-yellow-500/80 uppercase mb-2 flex items-center gap-2">
                                    <span>📸 Referencias (Fotos/Videos/URLs recomendadas)</span> 
                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[9px]">Opcional</span>
                                </label>
                                <div className="space-y-2 border border-white/5 p-3 rounded-xl bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0 text-base w-6 text-center" title="Foto">🖼️</span>
                                        <input type="url" value={newCampaign.urlFoto} onChange={e => setNewCampaign({...newCampaign, urlFoto: e.target.value})} placeholder="Ej: URL de referencia a Foto/Drive..." className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0 text-base w-6 text-center" title="Video">🎬</span>
                                        <input type="url" value={newCampaign.urlVideo} onChange={e => setNewCampaign({...newCampaign, urlVideo: e.target.value})} placeholder="Ej: URL de referencia a TikTok/Reel..." className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0 text-base w-6 text-center" title="URL">🔗</span>
                                        <input type="url" value={newCampaign.urlReferencia} onChange={e => setNewCampaign({...newCampaign, urlReferencia: e.target.value})} placeholder="Ej: URL al documento o blog..." className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Briefing detallado *</label>
                                <textarea value={newCampaign.briefing} onChange={e => setNewCampaign({...newCampaign, briefing: e.target.value})} placeholder="Explica la visión, tono y los activos necesarios para esta campaña..." rows="3" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                            </div>

                            <button onClick={() => {
                                if (!newCampaign.empresa || !newCampaign.calendario || !newCampaign.asignado || !newCampaign.titulo || !newCampaign.fecha || !newCampaign.briefing) {
                                    alert('Por favor completa todos los campos obligatorios (*) antes de programar la campaña.');
                                    return;
                                }
                                
                                const eventInfo = {
                                    id: Date.now(),
                                    title: `${newCampaign.plataforma === 'tiktok' ? '⚫ TK' : newCampaign.plataforma === 'instagram' ? '🟣 IG' : newCampaign.plataforma === 'facebook' ? '🔵 FB' : '🌐 Multi'}: ${newCampaign.titulo}`,
                                    start: new Date(newCampaign.fecha + 'T12:00:00'),
                                    end: new Date(newCampaign.fecha + 'T12:00:00'),
                                    status: 'warning',
                                    caption: newCampaign.briefing,
                                    media_url: newCampaign.urlFoto || newCampaign.urlVideo || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
                                    provider: newCampaign.empresa, // Guardamos la empresa
                                    platform: newCampaign.plataforma === 'ALL' ? 'instagram' : newCampaign.plataforma, // Default icon/mockup behavior
                                    comments: [{ id: Date.now(), author: currentUser, text: `@${newCampaign.asignado} te he asignado esta nueva campaña.`, time: 'ahora' }]
                                };
                                
                                setEvents(prev => [...prev, eventInfo]);
                                
                                // Notificar a asignado
                                setNotifications(prev => [{ id: Date.now()+1, to: newCampaign.asignado, from: currentUser, text: `@${newCampaign.asignado} te han asignado una nueva campaña para ${newCampaign.empresa}: "${newCampaign.titulo}"`, read: false, time: 'ahora', eventTitle: eventInfo.title }, ...prev]);
                                
                                setNewCampaign({ empresa: 'godzilla', calendario: 'contenido', asignado: '', titulo: '', fecha: '', plataforma: 'ALL', briefing: '', urlFoto: '', urlVideo: '', urlReferencia: '' });
                                setShowNewCampaignModal(false);
                            }} className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-black uppercase tracking-widest transition-all mt-4 border border-red-900/50 shadow-[0_4px_15px_rgba(204,0,0,0.5)]">
                                AGREGAR AL CALENDARIO ✔️
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
