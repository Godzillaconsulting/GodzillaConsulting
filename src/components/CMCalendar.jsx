import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configuración de localización en Español con Date-Fns
const locales = {
  'es': es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CMCalendar({ adminProfile }) {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activePlatform, setActivePlatform] = useState('ALL');

    useEffect(() => {
        // En un entorno real haríamos fetch a /api/social/queue
        // Estos son los eventos de prueba mapeados al formato del calendario
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 5);

        setEvents([
            {
                id: 1,
                title: '🔵 FB: El boca a boca no sirve',
                start: today,
                end: today,
                status: 'urgent', // urgent = rojo, warning = amarillo, success = verde
                caption: '🚀 El boca a boca no te va a pagar la nómina el mes que viene. Si tu empresa Tech sigue dependiendo de referidos, estás cediendo el control a la "suerte".',
                media_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80',
                provider: 'Nano Banana',
                platform: 'facebook'
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
                platform: 'tiktok'
            },
            {
                id: 3,
                title: '🟣 IG: Portafolio de Éxito',
                start: nextWeek,
                end: nextWeek,
                status: 'success',
                caption: 'Así escamos el B2B en Godzilla Consulting. Conoce el caso.',
                media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
                provider: 'Cockers Manual',
                platform: 'instagram'
            }
        ]);
    }, []);

    // Aplicar colores de Urgencia en el Calendario
    const eventStyleGetter = (event) => {
        let backgroundColor = '#333333'; // Default neutral
        let border = '1px solid #111111';

        if (event.status === 'urgent') {
            backgroundColor = '#CC0000'; // Rojo urgente (No aprobado)
            border = '1px solid #ff4444';
        } else if (event.status === 'warning') {
            backgroundColor = '#d97706'; // Naranja/Amarillo (Agendado pero cercano)
            border = '1px solid #f59e0b';
        } else if (event.status === 'success') {
            backgroundColor = '#15803d'; // Verde (Ya publicado o agendado seguro)
            border = '1px solid #22c55e';
        }

        return {
            style: {
                backgroundColor,
                border,
                borderRadius: '8px',
                opacity: 0.9,
                color: 'white',
                borderLeft: '4px solid white',
                display: 'block',
                fontWeight: 'bold',
                fontSize: '11px',
                padding: '2px 5px',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }
        };
    };

    // Estilos forzados oscuros para el calendario vía CSS inyectado
    const hackerCalendarStyles = `
      .rbc-calendar { font-family: 'Inter', sans-serif; min-height: 60vh; }
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

    const handleApprove = () => {
        alert('📅 ¡Estatus Actualizado! Se movió a la cola de publicación verde.');
        setSelectedEvent(null);
    };

    // Filtrar eventos por la pestaña activa
    const filteredEvents = activePlatform === 'ALL' 
        ? events 
        : events.filter(e => e.platform === activePlatform);

    return (
        <div className="h-full bg-[#0a0a0a] overflow-hidden flex flex-col relative text-white">
            <style>{hackerCalendarStyles}</style>

            {/* Cabecera & Pestañas */}
            <div className="px-8 py-6 bg-[#000000] border-b border-neutral-800 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-widest uppercase">Calendario Omnicanal</h2>
                        <p className="text-neutral-500 font-bold text-sm mt-1">
                            <span className="text-[#CC0000]">Rojo (Urgente / Pendiente)</span> • <span className="text-yellow-500">Amarillo (Agendado)</span> • <span className="text-green-500">Verde (Publicado)</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {[
                        { id: 'ALL', label: 'Toda la Red' },
                        { id: 'facebook', label: '🔵 Facebook' },
                        { id: 'instagram', label: '🟣 Instagram' },
                        { id: 'tiktok', label: '⚫ TikTok' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActivePlatform(tab.id)}
                            className={`px-5 py-2.5 rounded-full font-black text-xs transition-all flex items-center gap-2 ${
                                activePlatform === tab.id 
                                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                                : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vista Central: El Calendario Gigante */}
            <div className="flex-1 p-8 overflow-hidden bg-[#050505]">
                <Calendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={{
                        next: "Sig",
                        previous: "Ant",
                        today: "Hoy",
                        month: "Mes",
                        week: "Semana",
                        day: "Día",
                        agenda: "Agenda",
                        date: "Fecha",
                        time: "Hora",
                        event: "Publicación",
                        noEventsInRange: "No hay posts planificados en este rango."
                    }}
                    culture="es"
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={(event) => setSelectedEvent(event)}
                    views={['month', 'week', 'day', 'agenda']}
                    defaultView="month"
                    popup={true}
                />
            </div>

            {/* Modal Lateral / Popup Integrado al dar clic a un Post */}
            {selectedEvent && (
                <div className="absolute top-0 right-0 h-full w-[400px] bg-[#0d0d0d] border-l border-neutral-800 shadow-2xl flex flex-col z-50 transform transition-transform">
                    <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black">
                        <h3 className="font-black text-sm uppercase">{selectedEvent.title}</h3>
                        <button onClick={() => setSelectedEvent(null)} className="text-neutral-500 hover:text-white pb-1 font-bold text-xl">×</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black">
                            <img src={selectedEvent.media_url} className="w-full h-auto aspect-video object-cover" />
                        </div>
                        
                        <div>
                            <p className="text-xs font-black text-neutral-500 uppercase mb-2">Caption a Publicar:</p>
                            <div className="bg-neutral-900 p-4 rounded-xl text-sm whitespace-pre-line text-neutral-300">
                                {selectedEvent.caption}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-black text-neutral-500 uppercase mb-2">Modificar Fecha/Hora:</p>
                            <input type="datetime-local" className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:border-[#CC0000] outline-none" defaultValue="2026-04-10T10:00" />
                        </div>

                        {selectedEvent.status === 'urgent' && (
                            <button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] transition-all uppercase">
                                Aprobar / Eliminar Urgencia ✔️
                            </button>
                        )}
                        
                        <div className="pt-6 border-t border-neutral-800">
                            <p className="text-xs font-black text-neutral-500 uppercase mb-2">Dejar Corrección a Cockers:</p>
                            <textarea 
                                placeholder="Ej: @Alex cambia el texto a algo más agresivo..." 
                                className="w-full bg-black border border-neutral-800 p-3 text-white text-sm rounded-xl resize-none outline-none focus:border-blue-500 transition-colors mb-2" 
                                rows="3"
                            ></textarea>
                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs transition-all uppercase">Enviar Tarea al Diseñador</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
