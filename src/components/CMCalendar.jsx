import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';

const locales = { 'es': es }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// ─── ROLES ───────────────────────────────────────────────────────────────────
// canAssign: Oscar, Judith, o el Super Admin absoluto (JareG)
// canComplete: Todos (marcar como hecha)
// canCreate: Oscar, Judith, JareG
const canAssign = (profile) => {
    if (!profile) return false;
    const usr = profile.username?.toLowerCase() || '';
    return profile.role === 'admin' || 
           profile.role === 'cm' ||
           usr === 'jareg' ||
           usr === 'oscar' ||
           usr === 'judith' ||
           profile.id === 1 || 
           profile.id === 4;
};

const isJudithOrAdmin = (profile) => canAssign(profile);

export default function CMCalendar({ adminProfile }) {
    const navigate = useNavigate();
    const canCreate = canAssign(adminProfile);

    // ─── Estado del Calendario (Posts programados) ─────────────────────────
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activePlatform, setActivePlatform] = useState('ALL');
    const [activeHashtag, setActiveHashtag] = useState(null);
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);

    // ─── Estado del Sistema de Tareas ──────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [taskView, setTaskView] = useState('pendientes'); // 'pendientes' | 'realizadas'
    const [showNewAssignModal, setShowNewAssignModal] = useState(false);
    const [newTask, setNewTask] = useState({ que: '', para: '', referencias: '', deadline: '' });

    // Datos iniciales de ejemplo
    useEffect(() => {
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 5);

        setEvents([
            { id: 1, title: '🔵 FB: El boca a boca no sirve', start: today, end: today, status: 'urgent', caption: '🚀 El boca a boca no te va a pagar la nómina el mes que viene.', media_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80', provider: 'Nano Banana', platform: 'facebook' },
            { id: 2, title: '⚫ TK: Trend de Programación', start: tomorrow, end: tomorrow, status: 'warning', caption: '🎶 Si tu backend hace esto en 2026... (Baila) 🦖', media_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80', provider: 'Kling AI', platform: 'tiktok' },
            { id: 3, title: '🟣 IG: Portafolio de Éxito', start: nextWeek, end: nextWeek, status: 'success', caption: 'Así escalamos el B2B en Godzilla Consulting.', media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80', provider: 'Cockers Manual', platform: 'instagram' }
        ]);

        setTasks([
            { id: 1, que: 'Hacer la imagen menos oscura. Se pierde el logo de Godzilla.', para: 'Alex', referencias: 'https://godzillaconsulting.ai/admin', deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], done: false, asignadoPor: 'Judith', createdAt: new Date().toISOString() },
            { id: 2, que: 'Crear carrusel de 5 slides para campaña TikTok', para: 'Alex', referencias: 'Usa el brief del Brief compartido de S3', deadline: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0], done: false, asignadoPor: 'Oscar', createdAt: new Date().toISOString() },
        ]);
    }, []);

    // ─── Estilos del Calendario ────────────────────────────────────────────
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
    const pendingTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);

    // ─── Sidebar ───────────────────────────────────────────────────────────
    const renderSidebar = () => {
        if (isJudithOrAdmin(adminProfile)) {
            return (
                <div className="w-[300px] border-l border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col">
                    <div className="p-5 border-b border-white/10 bg-black/60">
                        <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">🔥 Trends & Hashtags</h3>
                        <p className="text-xs text-neutral-500 font-bold">Datos en tiempo real para SEO</p>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-5">
                        <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-4 rounded-xl">
                            <h4 className="text-[#CC0000] font-black text-xs uppercase mb-3">Trending B2B Tech hoy:</h4>
                            <div className="flex flex-wrap gap-2">
                                {['#AI', '#TechAgency', '#B2BGrowth', '#VentasB2B', '#SaaS', '#EscalarNegocios'].map(tag => (
                                    <span key={tag} onClick={() => setActiveHashtag(activeHashtag === tag ? null : tag)} className={`text-xs font-bold px-2 py-1 rounded cursor-pointer transition-colors shadow-md ${activeHashtag === tag ? 'bg-gradient-to-r from-[#CC0000] to-red-800 text-white' : 'text-neutral-300 bg-black/60 border border-white/10 hover:bg-white/20'}`}>{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-4 rounded-xl">
                            <h4 className="text-neutral-500 font-black text-xs uppercase mb-3">Hooks Sugeridos:</h4>
                            <ul className="text-xs text-neutral-300 space-y-3 font-bold">
                                <li>👉 "3 Errores que tu agencia comete..."</li>
                                <li>👉 "Cómo pasamos de 0 a 100k con..."</li>
                                <li>👉 "El secreto del código limpio..."</li>
                            </ul>
                        </div>
                    </div>
                </div>
            );
        } else {
            // Vista de Alex/Diseñador: Mis Tareas
            return (
                <div className="w-[320px] border-l border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col">
                    <div className="p-5 border-b border-red-900/50 bg-gradient-to-r from-[#CC0000]/10 to-transparent">
                        <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest">🔔 Mis Tareas</h3>
                        <p className="text-xs text-red-500/70 font-bold">Asignadas por CM / Dirección</p>
                    </div>

                    {/* Tabs Por Realizar / Realizado */}
                    <div className="flex border-b border-white/10">
                        {[['pendientes', 'Por Realizar'], ['realizadas', 'Realizadas']].map(([key, label]) => (
                            <button key={key} onClick={() => setTaskView(key)}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${taskView === key ? 'text-[#CC0000] border-b-2 border-[#CC0000]' : 'text-neutral-600 hover:text-neutral-400'}`}>
                                {label} {key === 'pendientes' ? `(${pendingTasks.filter(t => t.para?.toLowerCase() === adminProfile?.username?.toLowerCase()).length})` : `(${doneTasks.filter(t => t.para?.toLowerCase() === adminProfile?.username?.toLowerCase()).length})`}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {taskView === 'pendientes' && (
                            pendingTasks.filter(t => t.para?.toLowerCase() === adminProfile?.username?.toLowerCase()).length === 0
                                ? <p className="text-neutral-600 text-xs font-bold text-center py-8">✅ Sin tareas pendientes</p>
                                : pendingTasks.filter(t => t.para?.toLowerCase() === adminProfile?.username?.toLowerCase()).map(task => (
                                    <div key={task.id} className="bg-black/30 border border-red-900/40 hover:border-red-500/60 p-4 rounded-xl transition-colors shadow-[0_0_12px_rgba(204,0,0,0.08)]">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="text-xs font-black text-white leading-snug">{task.que}</p>
                                            <button
                                                onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true } : t))}
                                                className="shrink-0 w-6 h-6 rounded-full border-2 border-neutral-700 hover:border-green-500 hover:bg-green-500/20 transition-all flex items-center justify-center"
                                                title="Marcar como realizada"
                                            >
                                                <span className="text-[10px]">✔</span>
                                            </button>
                                        </div>
                                        <div className="space-y-1 mt-2 border-t border-white/5 pt-2">
                                            <p className="text-[10px] text-neutral-500 font-bold">📎 Ref: <span className="text-neutral-400">{task.referencias}</span></p>
                                            <p className="text-[10px] text-neutral-500 font-bold">📅 Para: <span className="text-yellow-400">{task.deadline}</span></p>
                                            <p className="text-[10px] text-neutral-500 font-bold">👤 Asignó: <span className="text-[#CC0000]">{task.asignadoPor}</span></p>
                                        </div>
                                        <button onClick={() => navigate('/studio')} className="mt-3 w-full text-[10px] bg-black/60 border border-neutral-700 text-[#CC0000] px-3 py-1.5 rounded-lg font-black hover:bg-[#CC0000] hover:text-white transition-all">
                                            Ir al Estudio ➔
                                        </button>
                                    </div>
                                ))
                        )}
                        {taskView === 'realizadas' && (
                            doneTasks.filter(t => t.para?.toLowerCase() === adminProfile?.username?.toLowerCase()).length === 0
                                ? <p className="text-neutral-600 text-xs font-bold text-center py-8">Aún no hay tareas completadas</p>
                                : doneTasks.filter(t => t.para?.toLowerCase() === adminProfile?.username?.toLowerCase()).map(task => (
                                    <div key={task.id} className="bg-green-950/10 border border-green-900/30 p-4 rounded-xl opacity-70">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-green-500 text-sm">✅</span>
                                            <p className="text-xs font-bold text-neutral-400 line-through">{task.que}</p>
                                        </div>
                                        <p className="text-[10px] text-neutral-600 font-bold">Completada • Asignó: {task.asignadoPor}</p>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="h-full bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,0,0,0.15),rgba(255,255,255,0))] relative overflow-hidden flex text-white">
            <style>{hackerCalendarStyles}</style>

            {/* Zona Principal */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 py-6 bg-[#000000] border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-widest uppercase">
                                {canCreate ? "Control de Emisión" : "Calendario de Campañas"}
                            </h2>
                            <p className="text-neutral-500 font-bold text-sm mt-1">
                                {canCreate
                                    ? `Asignar y gestionar • ${adminProfile?.username || 'Director'}`
                                    : `Solo lectura y tareas asignadas • ${adminProfile?.username || 'Editor'}`}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {/* Solo Oscar y Judith pueden asignar tareas */}
                            {canCreate && (
                                <button onClick={() => setShowNewAssignModal(true)}
                                    className="px-5 py-2.5 bg-black/60 border border-[#CC0000]/40 hover:border-[#CC0000] text-[#CC0000] rounded-xl font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2">
                                    📋 Asignar Tarea
                                </button>
                            )}
                            {canCreate && (
                                <button onClick={() => setShowNewCampaignModal(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-[#CC0000] to-red-800 hover:from-white hover:to-white hover:text-[#CC0000] text-white rounded-xl font-black text-xs transition-all shadow-[0_4px_15px_rgba(204,0,0,0.5)] border border-red-900/50 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-lg">➕</span> Programar Campaña
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {[{ id: 'ALL', label: 'Todas' }, { id: 'facebook', label: '🔵 Facebook' }, { id: 'instagram', label: '🟣 Instagram' }, { id: 'tiktok', label: '⚫ TikTok' }].map(tab => (
                            <button key={tab.id} onClick={() => setActivePlatform(tab.id)} className={`px-5 py-2 rounded-full font-black text-xs transition-all ${activePlatform === tab.id ? 'bg-white text-black' : 'bg-black/60 border border-white/10 text-neutral-500 hover:text-white'}`}>{tab.label}</button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4 md:p-6 overflow-hidden bg-[#050505] min-h-[500px]">
                    <Calendar
                        localizer={localizer}
                        events={filteredEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        messages={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día", next: "Sig", previous: "Ant" }}
                        culture="es"
                        eventPropGetter={eventStyleGetter}
                        onSelectEvent={(event) => setSelectedEvent(event)}
                    />
                </div>
            </div>

            {/* Sidebar */}
            {renderSidebar()}

            {/* POPUP DE INSPECCIÓN DE POST */}
            {selectedEvent && (
                <div className="absolute top-0 right-0 h-full w-[400px] bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col z-50">
                    <div className={`p-4 border-b flex justify-between items-center ${selectedEvent.status === 'urgent' ? 'bg-gradient-to-r from-[#CC0000] to-red-800 border-red-900' : 'bg-black/30 border-white/10'}`}>
                        <h3 className="font-black text-sm uppercase text-white tracking-widest">{selectedEvent.title}</h3>
                        <button onClick={() => setSelectedEvent(null)} className="text-white hover:text-black font-black text-xl">×</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Mockup redes */}
                        <div className="bg-white rounded-xl overflow-hidden shadow-xl text-black font-sans border border-white/20">
                            {selectedEvent.platform === 'instagram' && (
                                <div>
                                    <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                                            <div className="w-full h-full rounded-full bg-white border-2 border-white overflow-hidden"><img src="/logo192.png" alt="Godzilla" className="w-full h-full object-cover bg-black" /></div>
                                        </div>
                                        <p className="font-bold text-sm">godzillaconsulting</p>
                                    </div>
                                    <img src={selectedEvent.media_url} className="w-full aspect-square object-cover" />
                                    <div className="p-3">
                                        <div className="flex gap-4 mb-2"><span className="text-xl">❤️</span><span className="text-xl">💬</span><span className="text-xl">↗️</span></div>
                                        <p className="font-bold text-sm mb-1">1,234 Me gusta</p>
                                        <p className="text-sm"><span className="font-bold mr-1">godzillaconsulting</span><span className="text-gray-700">{selectedEvent.caption.substring(0, 50)}...</span></p>
                                    </div>
                                </div>
                            )}
                            {selectedEvent.platform === 'facebook' && (
                                <div>
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="w-10 h-10 rounded-full bg-black overflow-hidden relative"><img src="/logo192.png" alt="Godzilla" className="w-full h-full object-cover absolute top-0 left-0" /></div>
                                        <div><p className="font-bold text-[15px] leading-tight">Godzilla Consulting</p><p className="text-xs text-gray-500">Publicado • Hace 2 min • 🌎</p></div>
                                    </div>
                                    <div className="px-3 pb-3 text-[14px] text-gray-800"><p className="whitespace-pre-wrap line-clamp-3">{selectedEvent.caption}</p></div>
                                    <img src={selectedEvent.media_url} className="w-full h-64 object-cover" />
                                    <div className="p-3 border-t border-gray-200 flex justify-between text-gray-500 text-sm font-semibold"><span>👍 Me gusta</span><span>💬 Comentar</span><span>↪️ Compartir</span></div>
                                </div>
                            )}
                            {selectedEvent.platform === 'tiktok' && (
                                <div className="relative bg-black text-white h-[400px] flex items-center justify-center overflow-hidden">
                                    <img src={selectedEvent.media_url} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                                    <div className="absolute right-2 bottom-12 flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden shadow-lg"><img src="/logo192.png" className="w-full h-full object-cover bg-black" /></div>
                                        <div className="flex flex-col items-center"><span className="text-3xl drop-shadow-md">❤️</span><span className="text-xs font-bold drop-shadow-md">124K</span></div>
                                        <div className="flex flex-col items-center"><span className="text-3xl drop-shadow-md">💬</span><span className="text-xs font-bold drop-shadow-md">1,024</span></div>
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-16">
                                        <p className="font-bold text-sm drop-shadow-md">@godzillaconsulting</p>
                                        <p className="text-xs mt-1 line-clamp-2 drop-shadow-md leading-tight">{selectedEvent.caption}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-black text-neutral-500 uppercase mb-2">Copy / Caption:</p>
                            <textarea defaultValue={selectedEvent.caption} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-yellow-500 transition-colors resize-none" rows="4" />
                        </div>

                        {/* Solo Oscar/Judith pueden asignar correcciones al diseñador */}
                        {canCreate && (
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs font-black text-neutral-500 uppercase mb-2">Asignar corrección al diseñador:</p>
                                <textarea placeholder="Ej: @Alex oscurece la imagen y sube el contraste..." className="w-full bg-black/30 border border-red-900/50 p-3 text-white text-sm rounded-xl resize-none outline-none focus:border-[#CC0000] mb-2" rows="3" />
                                <button className="w-full bg-gradient-to-r from-[#CC0000] to-red-800 text-white font-black py-3 rounded-xl text-xs uppercase shadow-[0_4px_15px_rgba(204,0,0,0.4)] transition-all hover:from-red-700">Mandar a Corregir ➔</button>
                            </div>
                        )}
                        <div className="pt-4 border-t border-white/10">
                            <button className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] transition-all uppercase text-sm tracking-widest">Aprobar y Agendar ✔️</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ASIGNAR TAREA (Solo Oscar y Judith) */}
            {showNewAssignModal && canCreate && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111111] border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
                        <button onClick={() => setShowNewAssignModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2"><span className="text-[#CC0000]">📋</span> Asignar Tarea al Equipo</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Qué se debe hacer? *</label>
                                <textarea value={newTask.que} onChange={e => setNewTask({...newTask, que: e.target.value})} placeholder="Ej: Hacer la imagen menos oscura y subir contraste..." rows="3" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para quién? *</label>
                                <select value={newTask.para} onChange={e => setNewTask({...newTask, para: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                    <option value="">— Selecciona diseñador —</option>
                                    <option value="Alex">Alex (Diseñador)</option>
                                    <option value="Judith">Judith (CM)</option>
                                    <option value="Oscar">Oscar (Director)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Referencias (link, brief, nota)</label>
                                <input type="text" value={newTask.referencias} onChange={e => setNewTask({...newTask, referencias: e.target.value})} placeholder="Ej: https://drive.google.com/... o 'Ver brief de TikTok'" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para cuándo? *</label>
                                <input type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors [color-scheme:dark]" />
                            </div>
                            <div className="pt-2">
                                <button onClick={() => {
                                    if (!newTask.que || !newTask.para || !newTask.deadline) return alert('Completa los campos obligatorios (*)')
                                    setTasks(prev => [...prev, { id: Date.now(), ...newTask, done: false, asignadoPor: adminProfile?.username || 'Dirección', createdAt: new Date().toISOString() }]);
                                    setNewTask({ que: '', para: '', referencias: '', deadline: '' });
                                    setShowNewAssignModal(false);
                                }} className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(204,0,0,0.3)]">
                                    Asignar Tarea ✔️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: NUEVA CAMPAÑA (Solo Oscar y Judith) */}
            {showNewCampaignModal && canCreate && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111111] border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
                        <button onClick={() => setShowNewCampaignModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2"><span className="text-[#CC0000]">🎯</span> Programar Campaña</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Título Interno</label>
                                <input type="text" placeholder="Ej: Video explicativo Godzilla SaaS..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Fecha Estimada</label>
                                    <input type="date" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors [color-scheme:dark]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Plataforma</label>
                                    <select className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="ALL">Multicanal</option>
                                        <option value="tiktok">⚫ TikTok</option>
                                        <option value="instagram">🟣 Instagram</option>
                                        <option value="facebook">🔵 Facebook</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Briefing para el Diseñador</label>
                                <textarea placeholder="Explica la visión, tono y activos necesarios..." rows="4" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                            </div>
                            <div className="pt-2">
                                <button onClick={() => setShowNewCampaignModal(false)} className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-black uppercase tracking-widest transition-all">Agregar al Calendario ✔️</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
