import React, { useState, useEffect } from 'react';

export default function CMCalendar({ adminProfile }) {
    const [queue, setQueue] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [comment, setComment] = useState('');

    useEffect(() => {
        // En un entorno real hacemos fetch a /api/social/queue
        // Mostramos contenido Demostrativo para el diseño
        setQueue([
            {
                id: 1,
                status: 'pending_cm_approval',
                scheduled_for: '2026-04-10T10:00:00Z',
                caption: '🚀 El boca a boca no te va a pagar la nómina el mes que viene...',
                media_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80',
                provider: 'Nano Banana',
                media_type: 'image'
            }
        ]);
    }, []);

    const handleApprove = () => {
        alert('📅 ¡Post agendado! Se publicará automáticamente el 10 de Abril mediante Meta Graph API.');
        setSelectedTask(null);
    };

    const handleAddComment = () => {
        if(!comment.trim()) return;
        alert(`🔔 Notificación enviada a @Alex(Cockers) / @JareG: "${comment}"`);
        setComment('');
    };

    if (!selectedTask) {
        return (
            <div className="p-8 h-full bg-[#0a0a0a] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-widest uppercase">Calendario Editorial (Asana)</h2>
                        <p className="text-neutral-500 font-bold text-sm mt-1">Supervisión, Tareas y Programación de Redes</p>
                    </div>
                </div>

                {/* Panel Estilo Kanban / Trello */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Columna Pendientes */}
                    <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-4">
                        <h3 className="text-yellow-500 font-black text-xs uppercase tracking-widest mb-4 flex justify-between">
                            1. Revisión Pendiente <span>({queue.filter(q => q.status === 'pending_cm_approval').length})</span>
                        </h3>
                        <div className="space-y-4">
                            {queue.filter(q => q.status === 'pending_cm_approval').map(post => (
                                <div key={post.id} onClick={() => setSelectedTask(post)} className="bg-black border border-neutral-700 hover:border-[#CC0000] p-3 rounded-xl cursor-pointer group transition-all">
                                    <img src={post.media_url} className="w-full h-32 object-cover rounded-lg mb-3 opacity-80 group-hover:opacity-100 transition-all"/>
                                    <p className="text-xs text-white font-bold line-clamp-2">{post.caption}</p>
                                    <div className="flex justify-between mt-3 text-[10px] text-neutral-500 font-bold">
                                        <span>⚙️ Hecho por: {post.provider}</span>
                                        <span className="text-red-400">Sin agendar</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Columna Agendados */}
                    <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-4">
                        <h3 className="text-green-500 font-black text-xs uppercase tracking-widest mb-4 flex justify-between">
                            2. Agendados (Auto-Post) <span>(0)</span>
                        </h3>
                        <div className="border-2 border-dashed border-neutral-800 rounded-xl h-32 flex items-center justify-center">
                            <p className="text-neutral-600 text-xs font-bold">No hay posts agendados</p>
                        </div>
                    </div>

                    {/* Columna Publicados */}
                    <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-4">
                        <h3 className="text-neutral-500 font-black text-xs uppercase tracking-widest mb-4 flex justify-between">
                            3. Historial Publicado <span>(0)</span>
                        </h3>
                        <div className="border border-neutral-800 rounded-xl h-32 flex items-center justify-center opacity-50">
                            <p className="text-neutral-600 text-xs font-bold">Sin historial reciente</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#0a0a0a] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#0d0d0d] border-b border-neutral-800 flex justify-between items-center shrink-0">
                <button onClick={() => setSelectedTask(null)} className="text-neutral-400 hover:text-white font-bold px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors">
                    ← Volver al Tablero
                </button>
                <div className="text-right">
                    <p className="text-[#CC0000] font-black text-sm uppercase tracking-widest">Inspección de Contenido</p>
                    <p className="text-neutral-500 font-bold text-[10px] uppercase">Modo Community Manager</p>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Panel Central: Media & Copy */}
                <div className="flex-1 p-6 overflow-y-auto bg-black flex justify-center">
                    <div className="max-w-md w-full border border-neutral-800 rounded-2xl bg-[#0d0d0d] overflow-hidden shadow-2xl">
                        <img src={selectedTask.media_url} className="w-full h-auto aspect-square object-cover" />
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-neutral-200 whitespace-pre-line">{selectedTask.caption}</p>
                            <a href="#" className="text-[#CC0000] text-xs font-bold">#GodzillaConsulting #Tech #Software</a>
                        </div>
                    </div>
                </div>

                {/* Sidebar Derecho: Calendario & Asana Comments */}
                <div className="w-[350px] min-w-[350px] bg-[#0d0d0d] border-l border-neutral-800 p-6 overflow-y-auto flex flex-col">
                    
                    <div className="space-y-4 mb-8">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <span>📅 Configurar Lanzamiento</span>
                        </h4>
                        <input type="datetime-local" className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:border-[#CC0000] outline-none" defaultValue="2026-04-10T10:00" />
                        <button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] transition-all">
                            APROBAR Y AGENDAR POST ✔️
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col border-t border-neutral-800 pt-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>💬 Tareas y Correcciones (Asana)</span>
                        </h4>
                        
                        <div className="flex-1 border border-neutral-800 bg-black rounded-xl p-4 overflow-y-auto mb-4 opacity-50 flex items-center justify-center">
                            <p className="text-[10px] text-neutral-500 font-bold text-center">Inicia un hilo etiquetando a<br/>@Alex o @Jareg</p>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                            <textarea 
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Ej: @Alex cambia el filtro de la foto a uno más rojo..." 
                                className="w-full bg-transparent border-none text-white text-xs resize-none outline-none mb-2" 
                                rows="3"
                            ></textarea>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] bg-[#CC0000]/20 text-[#CC0000] px-2 py-1 rounded font-bold">@ Etiquetar</span>
                                <button onClick={handleAddComment} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all">Asignar Tarea</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
