import React, { useState, useEffect } from 'react';

export default function BugTrackerUI() {
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBug, setSelectedBug] = useState(null);
    const token = localStorage.getItem('adminToken');
    const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

    useEffect(() => {
        fetchBugs();
    }, []);

    const fetchBugs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/bugs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.bugs) {
                setBugs(json.bugs);
            } else {
                setError(json.error || 'Autenticación denegada para IT');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id, isResolved) => {
        try {
            const res = await fetch(`${API_BASE}/api/bugs/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolved: !isResolved })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setBugs(prev => prev.map(b => b.id === id ? { ...b, resolved: !isResolved, resolved_by: json.bug.resolved_by, resolved_at: json.bug.resolved_at } : b));
            } else {
                alert('Sin permisos para cambiar estado: ' + (json.error || ''));
            }
        } catch (e) {
            alert('Error red: ' + e.message);
        }
    };

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-red-500 font-mono">
                Error de Acceso: {error}
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full bg-[#050505] text-neutral-300 font-sans border-l border-neutral-900 overflow-hidden relative">
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black z-10 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <span className="text-red-600">IT</span> Bug Tracker
                    </h2>
                    <p className="text-xs text-neutral-500 font-bold mt-1">
                        Centro de operaciones para resolución de Tickets de <span className="text-white">JareG & Dani</span>
                    </p>
                </div>
                <button 
                    onClick={fetchBugs}
                    className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-xl text-xs font-bold text-neutral-300 transition-colors shadow-inner flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                    Sincronizar
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {loading && bugs.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <span className="animate-pulse text-red-500 font-bold tracking-widest text-sm">LEYENDO LOGS...</span>
                    </div>
                ) : bugs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-neutral-600">
                        <span className="material-symbols-outlined text-green-500 text-[48px] mb-4 select-none">check_circle</span>
                        <p className="font-bold">Sistema estable. No hay bugs reportados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {bugs.map(bug => (
                            <div key={bug.id} 
                                onClick={() => setSelectedBug(bug)}
                                className={`flex flex-col bg-[#111] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${bug.resolved ? 'border-green-900/30 opacity-70' : 'border-red-900/30 shadow-[0_4px_20px_rgba(204,0,0,0.1)] hover:-translate-y-1'}`}
                            >
                                
                                {bug.screenshot_url ? (
                                    <div className="h-40 bg-black relative border-b border-white/5 group">
                                        <img src={bug.screenshot_url} alt="Evidencia" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent"></div>
                                        <a href={bug.screenshot_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition opacity-0 group-hover:opacity-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        </a>
                                    </div>
                                ) : (
                                    <div className="h-20 bg-neutral-900 flex items-center justify-center border-b border-white/5">
                                        <span className="text-xs text-neutral-600 font-bold uppercase tracking-widest">Sin Captura</span>
                                    </div>
                                )}

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-3 gap-2">
                                        <div className="flex gap-2 items-center flex-wrap">
                                            <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${bug.priority === 'urgente' ? 'bg-red-500/10 text-red-500 border-red-500/50' : bug.priority === 'baja' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>
                                                {bug.priority}
                                            </span>
                                            {bug.resolved && <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-black">SOLUCIONADO</span>}
                                        </div>
                                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">#{bug.id}</span>
                                    </div>

                                    <p className="text-sm text-neutral-200 mt-2 flex-1 whitespace-pre-wrap">{bug.description}</p>

                                    <div className="mt-5 space-y-2 text-xs text-neutral-500 border-t border-white/5 pt-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-neutral-500 text-[16px] select-none w-4 flex items-center justify-center">person</span> 
                                            <span className="font-medium text-neutral-300">@{bug.reporter_username}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-neutral-500 text-[16px] select-none w-4 flex items-center justify-center">location_on</span> 
                                            <span className="font-mono truncate">{bug.path_url}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pb-1">
                                            <span className="material-symbols-outlined text-neutral-500 text-[16px] select-none w-4 flex items-center justify-center">calendar_month</span> 
                                            <span className="truncate">{new Date(bug.created_at).toLocaleString('es-MX')}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleStatus(bug.id, bug.resolved); }}
                                        className={`w-full mt-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${bug.resolved ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(204,0,0,0.3)]'}`}
                                    >
                                        {bug.resolved ? 'Reabrir Ticket' : 'Marcar Resuelto'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Modal de Detalle */}
            {selectedBug && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedBug(null)}
                >
                    <div 
                        className="bg-[#111] border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedBug(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center z-10 transition">✕</button>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {selectedBug.screenshot_url && (
                                <div className="w-full bg-black border-b border-white/5 relative group shrink-0">
                                    <img src={selectedBug.screenshot_url} alt="Evidencia" className="w-full max-h-[40vh] object-contain" />
                                    <a href={selectedBug.screenshot_url} target="_blank" rel="noreferrer" className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition text-xs font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 text-white">
                                        Abrir Original
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    </a>
                                </div>
                            )}
                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className={`text-xs uppercase font-black tracking-wider px-3 py-1 rounded-full border ${selectedBug.priority === 'urgente' ? 'bg-red-500/10 text-red-500 border-red-500/50' : selectedBug.priority === 'baja' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>
                                        {selectedBug.priority}
                                    </span>
                                    <span className="text-xs text-neutral-500 font-mono">TICKET #{selectedBug.id}</span>
                                    {selectedBug.resolved && <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-black ml-auto">SOLUCIONADO</span>}
                                </div>
                                
                                	<h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">Reporte del Usuario</h3>
                                <div className="bg-black/50 border border-white/5 rounded-xl p-6 mb-8 text-white font-sans whitespace-pre-wrap leading-relaxed">
                                    {selectedBug.description}
                                </div>
            
                                <div className="grid grid-cols-2 gap-4 text-sm text-neutral-400 border-t border-white/5 pt-6">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest mb-1">Reportado por</p>
                                        <p className="text-white font-medium flex items-center gap-2"><span className="material-symbols-outlined text-neutral-500 text-[16px] select-none">person</span> @{selectedBug.reporter_username}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest mb-1">Ubicación</p>
                                        <p className="text-white font-mono break-all flex items-center gap-2"><span className="material-symbols-outlined text-neutral-500 text-[16px] select-none">location_on</span> {selectedBug.path_url}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest mb-1">Fecha</p>
                                        <p className="text-white flex items-center gap-2"><span className="material-symbols-outlined text-neutral-500 text-[16px] select-none">calendar_month</span> {new Date(selectedBug.created_at).toLocaleString('es-MX')}</p>
                                    </div>
                                    {selectedBug.resolved && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest mb-1">Resuelto por</p>
                                            <p className="text-green-400 font-medium flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[16px] select-none">check_circle</span> @{selectedBug.resolved_by || 'AdminTI'} <br/><span className="text-[10px] text-neutral-500">({new Date(selectedBug.resolved_at).toLocaleString('es-MX')})</span></p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3 rounded-b-2xl shrink-0">
                            <button onClick={() => setSelectedBug(null)} className="px-5 py-2 hover:bg-white/5 rounded-xl font-bold text-sm text-neutral-400 transition">Cerrar</button>
                            <button 
                                onClick={() => {
                                    toggleStatus(selectedBug.id, selectedBug.resolved);
                                    setSelectedBug(prev => ({...prev, resolved: !prev.resolved, resolved_by: prev.resolved ? null : 'Tú', resolved_at: new Date().toISOString()}));
                                }}
                                className={`px-6 py-2 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${selectedBug.resolved ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(204,0,0,0.3)]'}`}
                            >
                                {selectedBug.resolved ? 'Reabrir Ticket' : 'Marcar Resuelto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
