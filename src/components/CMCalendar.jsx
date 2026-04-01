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

export default function CMCalendar({ adminProfile }) {
    const isJudith = adminProfile?.role === 'cm' || adminProfile?.username?.toLowerCase() === 'judith';
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activePlatform, setActivePlatform] = useState('ALL');

    useEffect(() => {
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 5);

        setEvents([
            {
                id: 1,
                title: '🔵 FB: El boca a boca no sirve',
                start: today,
                end: today,
                status: 'urgent', 
                caption: '🚀 El boca a boca no te va a pagar la nómina el mes que viene. Si tu empresa Tech sigue dependiendo de referidos, estás cediendo el control a la "suerte".',
                media_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80',
                provider: 'Nano Banana',
                platform: 'facebook',
                judith_task: 'Alex, por favor haz la imagen menos oscura. Se pierde el logo de Godzilla.'
            },
            {
                id: 2,
                title: '⚫ TK: Trend de Programación',
                start: tomorrow,
                end: tomorrow,
                status: 'warning',
                caption: '🎶 Si tu backend hace esto en 2026... (Baila) 🦖',
                media_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
                provider: 'Kling AI',
                platform: 'tiktok',
                judith_task: null
            },
            {
                id: 3,
                title: '🟣 IG: Portafolio de Éxito',
                start: nextWeek,
                end: nextWeek,
                status: 'success',
                caption: 'Así escamos el B2B en Godzilla Consulting. Conoce el caso de éxito corporativo.',
                media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
                provider: 'Cockers Manual',
                platform: 'instagram',
                judith_task: null
            }
        ]);
    }, []);

    const eventStyleGetter = (event) => {
        let backgroundColor = '#333333'; let border = '1px solid #111111';
        if (event.status === 'urgent') { backgroundColor = '#CC0000'; border = '1px solid #ff4444'; } 
        else if (event.status === 'warning') { backgroundColor = '#d97706'; border = '1px solid #f59e0b'; } 
        else if (event.status === 'success') { backgroundColor = '#15803d'; border = '1px solid #22c55e'; }
        
        // Efecto parpadeo para tareas asignadas al diseñador
        const isAssignedToAlex = event.judith_task && !isJudith;

        return {
            style: {
                backgroundColor, border, borderRadius: '8px', opacity: 0.9, color: 'white',
                borderLeft: '4px solid white', display: 'block', fontWeight: 'bold', fontSize: '11px',
                padding: '2px 5px', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                boxShadow: isAssignedToAlex ? '0 0 10px rgba(204,0,0,0.8)' : 'none'
            }
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
      .rbc-time-header.rbc-overflowing { border-right: 1px solid #222; }
    `;

    const filteredEvents = activePlatform === 'ALL' ? events : events.filter(e => e.platform === activePlatform);

    // Módulos Laterales (Visto solo por Judith vs Visto por Alex)
    const renderSidebar = () => {
        if (isJudith) {
            return (
                <div className="w-[300px] border-l border-white/10 bg-black/40 backdrop-blur-2xl border border-white/5 shadow-lg flex flex-col">
                    <div className="p-5 border-b border-white/10 bg-black/60 backdrop-blur-xl border-white/10 shadow-md hover:bg-white/80">
                        <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                            <span>🔥 Tradings & Hashtags</span>
                        </h3>
                        <p className="text-xs text-neutral-500 font-bold">Datos en tiempo real para SEO</p>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-5">
                        <div className="bg-black/50 backdrop-blur-xl border border-white/10 focus:bg-black/70 focus:border-[#CC0000]/50 shadow-inner text-white focus:bg-white p-4 rounded-xl">
                            <h4 className="text-[#CC0000] font-black text-xs uppercase mb-3">Trending B2B Tech hoy:</h4>
                            <div className="flex flex-wrap gap-2">
                                {['#AI', '#TechAgency', '#B2BGrowth', '#VentasB2B', '#SaaS', '#EscalarNegocios'].map(tag => (
                                    <span key={tag} className="text-xs font-bold text-neural-300 bg-black/60 backdrop-blur-xl border-white/10 shadow-md hover:bg-white/80 px-2 py-1 rounded cursor-pointer hover:bg-gradient-to-r from-[#CC0000] to-red-800 transition-colors">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-black/50 backdrop-blur-xl border border-white/10 focus:bg-black/70 focus:border-[#CC0000]/50 shadow-inner text-white focus:bg-white p-4 rounded-xl">
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
            return (
                <div className="w-[300px] border-l border-white/10 bg-black/40 backdrop-blur-2xl border border-white/5 shadow-lg flex flex-col">
                    <div className="p-5 border-b border-red-900/50 bg-gradient-to-r from-[#CC0000] to-red-800/10">
                        <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest flex items-center gap-2">
                            <span>🔔 Peticiones de la CM</span>
                        </h3>
                        <p className="text-xs text-red-500/70 font-bold">Correcciones de Judith para ti</p>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-4">
                        {events.filter(e => e.judith_task).map(t => (
                            <div key={t.id} onClick={() => setSelectedEvent(t)} className="bg-black/30 backdrop-blur-lg border border-white/5 border border-red-900 hover:border-red-500 p-4 rounded-xl cursor-pointer transition-colors shadow-[0_0_15px_rgba(204,0,0,0.1)]">
                                <p className="text-[10px] text-neutral-500 font-black uppercase mb-1">Para: Hoy • Red: {t.platform}</p>
                                <p className="text-xs font-bold text-white mb-2">"{t.judith_task}"</p>
                                <div className="text-right">
                                    <button onClick={(e) => { e.stopPropagation(); navigate('/studio'); }} className="text-[10px] bg-black/60 backdrop-blur-xl border-white/10 shadow-md hover:bg-white/80 border border-neutral-700 text-[#CC0000] px-3 py-1.5 rounded-lg font-black hover:bg-gradient-to-r from-[#CC0000] to-red-800 hover:text-white transition-all">Corregir Obra en el Estudio ➔</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="h-full bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,0,0,0.15),rgba(255,255,255,0))] relative overflow-hidden flex text-white relative">
            <style>{hackerCalendarStyles}</style>

            {/* Zona Principal: Tracker & Calendario */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 py-6 bg-[#000000] border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-widest uppercase">
                                {isJudith ? "Control de Emisión CM" : "Seguimiento y Campañas (Editor)"}
                            </h2>
                            <p className="text-neutral-500 font-bold text-sm mt-1">Conexión en Tiempo Real: Cockers ⇄ Judith</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {[{ id: 'ALL', label: 'Todas las Campañas' }, { id: 'facebook', label: '🔵 Facebook' }, { id: 'instagram', label: '🟣 Instagram' }, { id: 'tiktok', label: '⚫ TikTok' }].map(tab => (
                            <button key={tab.id} onClick={() => setActivePlatform(tab.id)} className={`px-5 py-2 rounded-full font-black text-xs transition-all ${activePlatform === tab.id ? 'bg-white text-black' : 'bg-black/60 backdrop-blur-xl border-white/10 shadow-md hover:bg-white/80 border border-white/10 text-neutral-500 hover:text-white'}`}>{tab.label}</button>
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

            {/* Sidebar Contextual */}
            {renderSidebar()}

            {/* POPUP DE INSPECCIÓN */}
            {selectedEvent && (
                <div className="absolute top-0 right-0 h-full w-[400px] bg-black/40 backdrop-blur-2xl border border-white/5 shadow-lg border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col z-50 transform transition-transform">
                    <div className={`p-4 border-b flex justify-between items-center ${selectedEvent.status === 'urgent' ? 'bg-gradient-to-r from-[#CC0000] to-red-800 border-red-900' : 'bg-black/30 backdrop-blur-lg border border-white/5 border-white/10'}`}>
                        <h3 className="font-black text-sm uppercase text-white tracking-widest">{selectedEvent.title}</h3>
                        <button onClick={() => setSelectedEvent(null)} className="text-white hover:text-black font-black text-xl">×</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <img src={selectedEvent.media_url} className="w-full h-48 object-cover rounded-xl border border-white/10" />
                        
                        <div>
                            <p className="text-xs font-black text-neutral-500 uppercase mb-2">Copy / Caption (Modificable por ti):</p>
                            <textarea defaultValue={selectedEvent.caption} className="w-full bg-black/60 backdrop-blur-xl border-white/10 shadow-md hover:bg-white/80 border border-white/10 p-4 rounded-xl text-sm whitespace-pre-line text-white shadow-inner font-bold outline-none focus:border-yellow-500 transition-colors" rows="4"></textarea>
                        </div>

                        {/* Controles para Judith */}
                        {isJudith && selectedEvent.status === 'urgent' && (
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs font-black text-neutral-500 uppercase mb-2">Devolver Tarea a Cockers (Diseño):</p>
                                <textarea placeholder="Ej: @Alex cambia los colores de la foto, ponla más oscura HD..." className="w-full bg-black/30 backdrop-blur-lg border border-white/5 border border-red-900/50 p-3 text-white text-sm rounded-xl resize-none outline-none focus:border-[#CC0000] mb-2" rows="3"></textarea>
                                <button className="w-full bg-gradient-to-r from-[#CC0000] to-red-800 hover:bg-red-600 text-white font-black py-3 rounded-xl text-xs transition-all uppercase shadow-[0_4px_15px_rgba(204,0,0,0.4)]">Mandar a Corregir ➔</button>
                            </div>
                        )}
                        {/* Controles Compartidos */}
                        <div className="pt-4 border-t border-white/10">
                            <button className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] transition-all uppercase text-sm tracking-widest">Aprobar y Agendar ✔️</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
