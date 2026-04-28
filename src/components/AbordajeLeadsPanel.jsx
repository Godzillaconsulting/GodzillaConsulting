import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader, RefreshCw, ShieldCheck, ExternalLink, Calendar as CalendarIcon, Copy, Building, Globe, Phone } from 'lucide-react';

export default function AbordajeLeadsPanel({ adminProfile }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visibleCreds, setVisibleCreds] = useState({});

    const API_BASE = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');

    const fetchLeads = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/api/abordaje/leads`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLeads(data.leads || []);
            } else {
                setError(data.error || 'Error desconocido.');
            }
        } catch (err) {
            setError('Error de conexión al servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const toggleCreds = (id) => {
        setVisibleCreds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-neutral-400">
                <Loader className="w-10 h-10 animate-spin text-[#CC0000] mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Desencriptando bóveda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-red-400">
                <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-6 text-center max-w-md">
                    <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">Acceso Denegado / Error</h3>
                    <p className="text-xs">{error}</p>
                    <button onClick={fetchLeads} className="mt-4 px-6 py-2 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] rounded-full font-bold text-xs uppercase transition-colors">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-6 lg:p-8 flex flex-col relative z-10 custom-scrollbar overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3 drop-shadow-sm mb-1 uppercase tracking-tight">
                        <span className="text-[#CC0000]">🎯</span> Leads de Abordaje
                    </h2>
                    <p className="text-sm text-white/50 font-bold max-w-xl">
                        Bóveda segura. Las credenciales se han desencriptado al vuelo (AES-256-GCM) utilizando la llave maestra del servidor.
                    </p>
                </div>
                <button 
                    onClick={fetchLeads}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black/50 hover:bg-[#CC0000]/20 text-white rounded-xl border border-white/10 hover:border-[#CC0000]/50 transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                >
                    <RefreshCw className="w-4 h-4" /> Refrescar
                </button>
            </div>

            {/* Listado */}
            {leads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-3xl bg-black/20">
                    <span className="text-5xl opacity-50 mb-4">📭</span>
                    <h3 className="text-white font-bold text-lg">No hay abordajes registrados</h3>
                    <p className="text-white/40 text-sm text-center max-w-sm mt-2">Los clientes que completen el formulario de abordaje aparecerán aquí de forma segura.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {leads.map((lead) => {
                        const showCreds = visibleCreds[lead.id];
                        const creds = lead.credenciales_desencriptadas || {};
                        const hasCreds = Object.keys(creds).length > 0;

                        return (
                            <div key={lead.id} className="bg-[#111111] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden group hover:border-[#CC0000]/30 transition-colors">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#CC0000] to-transparent opacity-50"></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                                            <Building className="w-5 h-5 text-[#CC0000]" />
                                            {lead.empresa}
                                        </h3>
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/50 font-mono">
                                            <span>{new Date(lead.created_at).toLocaleString('es-MX')}</span>
                                            <span className="text-white/30">•</span>
                                            <span>IP: {lead.ip_address || 'Desconocida'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        {lead.web && (
                                            <a href={lead.web.startsWith('http') ? lead.web : `https://${lead.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 transition-colors">
                                                <Globe className="w-3.5 h-3.5" /> Visitar Web
                                            </a>
                                        )}
                                        {lead.cita_fecha && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#34C759] bg-[#34C759]/10 px-3 py-1 rounded-full border border-[#34C759]/20">
                                                <CalendarIcon className="w-3.5 h-3.5" /> {lead.cita_fecha} {lead.cita_hora}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-1">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-[#CC0000] mb-1">Servicios de Interés</p>
                                            <p className="text-sm text-white/80 leading-relaxed">{lead.servicios || 'No especificado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-[#CC0000] mb-1">Metas</p>
                                            <p className="text-sm text-white/80 leading-relaxed">{lead.metas || 'No especificado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-[#CC0000] mb-1">Diferenciadores</p>
                                            <p className="text-sm text-white/80 leading-relaxed">{lead.diferenciadores || 'No especificado'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-3 flex items-center gap-2">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Accesos y Cuentas
                                        </p>
                                        
                                        <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                                            <span className="text-white/60 font-bold">Base de Datos:</span>
                                            <span className="text-white">{lead.db_option?.toUpperCase() || 'N/A'}</span>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-2">
                                            {lead.redes_meta_variant && (
                                                <div className="flex justify-between items-center text-xs bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                                                    <span className="text-blue-400 font-bold flex items-center gap-1.5">Meta</span>
                                                    <span className="text-white/70">{lead.redes_meta_variant} ({lead.meta_access_status})</span>
                                                </div>
                                            )}
                                            {lead.redes_google_variant && (
                                                <div className="flex justify-between items-center text-xs bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                                    <span className="text-red-400 font-bold flex items-center gap-1.5">Google</span>
                                                    <span className="text-white/70">{lead.redes_google_variant} ({lead.google_access_status})</span>
                                                </div>
                                            )}
                                            {lead.redes_tiktok_variant && (
                                                <div className="flex justify-between items-center text-xs bg-purple-500/5 p-2 rounded-lg border border-purple-500/10">
                                                    <span className="text-purple-400 font-bold flex items-center gap-1.5">TikTok</span>
                                                    <span className="text-white/70">{lead.redes_tiktok_variant} ({lead.tiktok_access_status})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Zona de Credenciales (Blindada) */}
                                {hasCreds ? (
                                    <div className={`mt-auto border rounded-2xl overflow-hidden transition-colors ${showCreds ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-[#CC0000]/20 bg-black/40'}`}>
                                        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Lock className={`w-4 h-4 ${showCreds ? 'text-yellow-500' : 'text-[#CC0000]'}`} />
                                                <span className={`text-xs font-black uppercase tracking-widest ${showCreds ? 'text-yellow-500' : 'text-white/60'}`}>
                                                    Bóveda de Credenciales
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => toggleCreds(lead.id)}
                                                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all ${showCreds ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400' : 'bg-transparent text-white/50 border-white/20 hover:text-white hover:border-white/50'}`}
                                            >
                                                {showCreds ? <><EyeOff className="w-3 h-3"/> Ocultar</> : <><Eye className="w-3 h-3"/> Revelar</>}
                                            </button>
                                        </div>

                                        {showCreds ? (
                                            <div className="p-4 flex flex-col gap-3 font-mono text-xs">
                                                {creds.googleUser && (
                                                    <div className="bg-black/60 p-3 rounded-xl border border-white/10 flex flex-col gap-1">
                                                        <span className="text-red-400 font-bold uppercase tracking-wider text-[10px] mb-1">Google Ads / Business</span>
                                                        <div className="flex justify-between items-center group/item cursor-pointer" onClick={() => copyToClipboard(creds.googleUser)}>
                                                            <span className="text-white/50">Usuario:</span>
                                                            <span className="text-white font-bold group-hover/item:text-[#CC0000]">{creds.googleUser}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center group/item cursor-pointer" onClick={() => copyToClipboard(creds.googlePass)}>
                                                            <span className="text-white/50">Password:</span>
                                                            <span className="text-white font-bold group-hover/item:text-[#CC0000]">{creds.googlePass}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {creds.tiktokUser && (
                                                    <div className="bg-black/60 p-3 rounded-xl border border-white/10 flex flex-col gap-1">
                                                        <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px] mb-1">TikTok Ads / Business</span>
                                                        <div className="flex justify-between items-center group/item cursor-pointer" onClick={() => copyToClipboard(creds.tiktokUser)}>
                                                            <span className="text-white/50">Usuario:</span>
                                                            <span className="text-white font-bold group-hover/item:text-[#CC0000]">{creds.tiktokUser}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center group/item cursor-pointer" onClick={() => copyToClipboard(creds.tiktokPass)}>
                                                            <span className="text-white/50">Password:</span>
                                                            <span className="text-white font-bold group-hover/item:text-[#CC0000]">{creds.tiktokPass}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-4">
                                                <p className="text-xs text-white/30 font-mono tracking-widest text-center">
                                                    ************************************
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-auto px-4 py-3 border border-white/5 bg-black/20 rounded-2xl text-center">
                                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Sin credenciales adjuntas</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
