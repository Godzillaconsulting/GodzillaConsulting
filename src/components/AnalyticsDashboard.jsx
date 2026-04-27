import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Chart as GoogleChart } from "react-google-charts";
import { 
    Activity, ArrowUpRight, Users, MousePointerClick, 
    Smartphone, ArrowRight, DollarSign, Target, Orbit, Zap, Database, Bot, Cpu,
    X, MessageSquare, Heart, Clock, Eye, BarChart2, ChevronRight, Share2, PlayCircle, Globe, Edit2, Search
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [selectedNetwork, setSelectedNetwork] = useState(null);
    const [data, setData] = useState({
        kpis: {},
        trafficSources: [],
        sankeyData: [],
        webGraphData: [],
        pixelEvents: []
    });

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch(`${'' || ''}/api/analytics/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success) {
                    setData(json);
                }
            } catch (error) {
                console.error("No se pudieron cargar analíticas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    // Custom Tooltip for Area Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#111] border border-neutral-800 p-4 rounded-xl shadow-2xl">
                    <p className="font-bold text-neutral-300 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-neutral-400 capitalize">{entry.name}:</span>
                            <span className="font-bold text-white">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-20">
                <div className="w-16 h-16 border-4 border-neutral-800 border-t-[#CC0000] rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold tracking-widest text-neutral-400 animate-pulse uppercase">Extrayendo Datos...</h2>
            </div>
        );
    }

    // Sanitizador de texto para problemas de codificación de AnswerThePublic
    const sanitizeText = (txt) => {
        if (!txt) return "";
        return txt
            .replace(/cmo/gi, 'cómo').replace(/cmo/gi, 'cómo').replace(/cmo/gi, 'cómo')
            .replace(/qu/gi, 'qué').replace(/qu/gi, 'qué').replace(/qu/gi, 'qué')
            .replace(/ms/gi, 'más').replace(/ms/gi, 'más');
    };

    // Calculate aggregated totals based on traffic sources
    const totalVisits = data.trafficSources.reduce((acc, src) => acc + (src.visitors || 0), 0);
    const totalLeads = data.trafficSources.reduce((acc, src) => acc + (src.leads !== '-' ? src.leads : 0), 0);
    const totalCalls = data.trafficSources.reduce((acc, src) => acc + (src.calls !== '-' ? src.calls : 0), 0);

    return (
        <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center gap-4">
                        <Orbit className="text-[#CC0000]" size={40} />
                        Cerebro Analítico
                    </h1>
                    <p className="text-neutral-400 mt-2 font-light text-sm md:text-base max-w-2xl">
                        Monitor de conversión global y flujo de captura de usuarios. Todos los sistemas enviando biometría web.
                    </p>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full blur-2xl transition-all group-hover:bg-blue-500/20"></div>
                    <Users className="text-blue-500 mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Tráfico Global</p>
                    <h2 className="text-4xl font-black text-white">{totalVisits}</h2>
                </div>

                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF0055]/10 rounded-bl-full blur-2xl transition-all group-hover:bg-[#FF0055]/20"></div>
                    <Target className="text-[#FF0055] mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Leads Capturados</p>
                    <h2 className="text-4xl font-black text-white">{totalLeads}</h2>
                </div>

                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full blur-2xl transition-all group-hover:bg-green-500/20"></div>
                    <Smartphone className="text-green-500 mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Llamadas Agendadas</p>
                    <h2 className="text-4xl font-black text-white">{totalCalls}</h2>
                </div>

                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-bl-full blur-2xl transition-all group-hover:bg-yellow-500/20"></div>
                    <DollarSign className="text-yellow-500 mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Costo Adquisición</p>
                    <h2 className="text-4xl font-black text-white">{data.kpis.avgCac || '$0.00'}</h2>
                </div>

                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#9D00FF]/10 rounded-bl-full blur-2xl transition-all group-hover:bg-[#9D00FF]/20"></div>
                    <Cpu className="text-[#9D00FF] mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Inversión API IA</p>
                    <h2 className="text-4xl font-black text-white">${(data.totalApiCostUsd || 0).toFixed(4)}</h2>
                </div>
            </div>

            {/* BOT SUPERVISOR (Panel Biométrico de PM2) */}
            <div className="mb-10 bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative animate-in slide-in-from-bottom-8 duration-700 delay-[50ms] fill-mode-both">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent opacity-20"></div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                        <Bot size={20} className="text-[#10b981]" />
                        Biosensores de Agentes
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981]"></span>
                        </span>
                        <span className="text-xs font-bold text-neutral-500">CONECTADO AL NÚCLEO PM2</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.botHealth && data.botHealth.length > 0 ? (
                        data.botHealth.map((bot, i) => {
                            const isOnline = bot.status === 'online';
                            const targetOrigin = bot.name.includes('ig') ? 'instagram' : bot.name.includes('tiktok') ? 'tiktok' : bot.name.includes('whatsapp') ? 'whatsapp' : 'N/A';
                            const leadsGenerados = data.botProductivity ? (data.botProductivity[targetOrigin] || 0) : 0;
                            return (
                                <div key={i} className="bg-[#161615]/50 backdrop-blur-md border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-[#10b981]/50 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white">{bot.name}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                        <div className="bg-neutral-900 border border-neutral-800 p-1.5 rounded-lg flex flex-col items-center gap-1">
                                            <Cpu size={14} className="text-blue-500" />
                                            <span className="text-[10px] text-neutral-400 font-bold">{bot.cpuPercent}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-neutral-500">Memoria RAM</span>
                                            <span className="text-neutral-300 font-bold">{bot.memoryMb} MB</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-neutral-500">Reinicios (PM2)</span>
                                            <span className="text-neutral-300 font-bold">{bot.restarts}</span>
                                        </div>
                                        {targetOrigin !== 'N/A' && (
                                            <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-neutral-800/50">
                                                <span className="text-neutral-500 flex items-center gap-1.5">
                                                    <Activity size={12} className="text-purple-500"/>
                                                    Citas Cerradas
                                                </span>
                                                <span className="text-purple-400 font-black">{leadsGenerados}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-1 lg:col-span-4 p-8 text-center text-neutral-600 font-bold border border-dashed border-neutral-800 rounded-2xl">
                            Esperando telemetría de los bots...
                        </div>
                    )}
                </div>
            </div>

            {/* Main Graphs Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
                
                {/* Traffic Funnel Chart */}
                <div className="xl:col-span-2 bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative animate-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF0055] to-transparent opacity-20"></div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <Activity size={20} className="text-[#CC0000]" />
                        Embudo de Conversión (Funnel)
                    </h3>
                    
                    {data.funnelData && data.funnelData.length > 0 ? (
                        <div className="w-full h-[400px] bg-transparent rounded-2xl">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={data.funnelData}
                                    margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={true} vertical={false} />
                                    <XAxis type="number" stroke="#666" tick={{ fill: '#666' }} />
                                    <YAxis type="category" dataKey="stage" stroke="#A3A3A3" tick={{ fill: '#A3A3A3', fontSize: 14, fontWeight: 'bold' }} width={150} />
                                    <RechartsTooltip cursor={{fill: 'rgba(255, 0, 85, 0.05)'}} contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '10px', color: '#fff' }} />
                                    <Bar dataKey="count" name="Usuarios" radius={[0, 8, 8, 0]} barSize={40}>
                                        {data.funnelData.map((entry, index) => {
                                            const colors = ['#FF0055', '#9D00FF', '#00F0FF', '#00FF66'];
                                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                        })}
                                    </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="w-full h-[400px] flex items-center justify-center border border-dashed border-neutral-800 rounded-2xl bg-[#111]">
                            <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm text-center">Falta volumen de tráfico para mapear el flujo</p>
                        </div>
                    )}
                </div>

                {/* Pixel Events Breakdown */}
                <div className="xl:col-span-1 bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <Zap size={20} className="text-yellow-500" />
                        Trigger Events (Godzilla Pixel)
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                        {data.pixelEvents && data.pixelEvents.length > 0 ? (
                            data.pixelEvents.map((ev, i) => (
                                <div key={i} className="bg-[#161615]/50 backdrop-blur-md rounded-xl p-4 border border-white/5 flex justify-between items-center group hover:border-[#FF0055]/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors">
                                            <MousePointerClick size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-neutral-300 capitalize">{ev.name.replace(/_/g, ' ')}</span>
                                            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Actividad</span>
                                        </div>
                                    </div>
                                    <span className="font-black text-xl text-white">{ev.count}</span>
                                </div>
                            ))
                        ) : (
                             <p className="text-center text-neutral-600 mt-10">No hay señales capturadas hoy.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* API Cost Telemetry Panel */}
            <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                    <Cpu size={20} className="text-[#9D00FF]" />
                    Radiografía de Costos API (Telemetría)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.apiTelemetry && data.apiTelemetry.length > 0 ? (
                        data.apiTelemetry.map((apiItem, idx) => (
                            <div key={idx} className="bg-[#161615]/50 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <h4 className="text-white font-bold mb-1">{apiItem.service}</h4>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Consumo de Tokens</p>
                                </div>
                                <div className="mt-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-xs text-neutral-400">Input (Lectura)</span>
                                        <span className="text-xs font-bold text-[#00F0FF]">{(apiItem.inputTokens || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-xs text-neutral-400">Output (Escritura)</span>
                                        <span className="text-xs font-bold text-[#FF0055]">{(apiItem.outputTokens || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-800">
                                        <span className="text-xs font-bold text-neutral-500 uppercase">Costo USD</span>
                                        <span className="text-sm font-black text-[#9D00FF]">${(apiItem.costUsd || 0).toFixed(4)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 p-6 text-center text-neutral-600 font-bold border border-dashed border-neutral-800 rounded-2xl">
                            Aún no hay consumo registrado de API IA.
                        </div>
                    )}
                </div>
            </div>

            {/* Radar de Tendencias B2B (Godzilla AnswerThePublic Engine) */}
            <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                        <Globe size={20} className="text-[#00F0FF]" />
                        Radar de Tendencias B2B (Data Cruda Google)
                    </h3>
                    {data.searchTrends && (
                        <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                Última lectura: {new Date(data.searchTrends.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>

                {data.searchTrends ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-[#161615]/50 border border-white/5 p-5 rounded-2xl h-80 flex flex-col">
                            <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                                <Search size={16} className="text-neutral-500" /> Búsquedas Crudas en Tiempo Real
                            </h4>
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start">
                                {Object.keys(data.searchTrends.aggregated_questions).map((kw) => (
                                    data.searchTrends.aggregated_questions[kw].map((q, idx) => (
                                        <span key={`${kw}-${idx}`} className="bg-black/40 border border-white/5 text-xs text-neutral-300 px-3 py-1.5 rounded-full hover:border-[#00F0FF]/50 hover:text-[#00F0FF] transition-colors cursor-default">
                                            {sanitizeText(q)}
                                        </span>
                                    ))
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-1 bg-gradient-to-br from-[#161615] to-[#111] border border-[#00F0FF]/20 p-5 rounded-2xl flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00F0FF]/5 rounded-bl-full blur-xl"></div>
                            <h4 className="text-[#00F0FF] font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest relative z-10">
                                <Zap size={16} /> Síntesis IA Ejecutiva
                            </h4>
                            <div className="flex-1 overflow-y-auto custom-scrollbar text-sm text-neutral-300 leading-relaxed whitespace-pre-line relative z-10">
                                {data.searchTrends.summary && data.searchTrends.summary.includes("Fallo de API") 
                                    ? <span className="text-neutral-500 italic flex items-center gap-2 mt-4"><Bot size={16}/> Procesando síntesis de mercado... (Pendiente)</span>
                                    : sanitizeText(data.searchTrends.summary)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center text-neutral-600 font-bold border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center gap-3">
                        <Globe size={40} className="text-neutral-800" />
                        Aún no hay lecturas del algoritmo de tendencias.
                    </div>
                )}
            </div>

            {/* Performance Over Time (Area Chart) & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                
                {/* Evolution Graph */}
                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
                        <ArrowUpRight size={20} className="text-blue-500" />
                        Tránsito de los Últimos 7 Días
                    </h3>
                    <div className="w-full h-[300px]">
                        {data.webGraphData && data.webGraphData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.webGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FF0055" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#FF0055" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="views" name="Vistas" stroke="#00F0FF" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                    <Area type="monotone" dataKey="interactions" name="Eventos" stroke="#FF0055" strokeWidth={3} fillOpacity={1} fill="url(#colorInt)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex justify-center items-center">
                                <p className="text-neutral-600 font-bold">Analizando metadatos...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sources Table */}
                <div className="bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-700 delay-[250ms] fill-mode-both">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <Database size={20} className="text-green-500" />
                        Desglose de Orígenes
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800/50">
                                    <th className="pb-4 text-xs font-black text-neutral-500 uppercase tracking-widest pl-2">Fuente</th>
                                    <th className="pb-4 text-xs font-black text-neutral-500 uppercase tracking-widest text-center">Visitas</th>
                                    <th className="pb-4 text-xs font-black text-neutral-500 uppercase tracking-widest text-center">Leads</th>
                                    <th className="pb-4 text-xs font-black text-neutral-500 uppercase tracking-widest text-right pr-2">Costo (CAC)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.trafficSources && data.trafficSources.map((src, idx) => (
                                    <tr key={idx} onClick={() => setSelectedNetwork(src)} className="group hover:bg-[#161615]/80 cursor-pointer transition-colors relative overflow-hidden">
                                        <td className="py-4 pl-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl bg-neutral-900 w-10 h-10 flex items-center justify-center rounded-xl">{src.emoji}</span>
                                                <span className="font-bold text-neutral-300 group-hover:text-white transition-colors">{src.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center font-black text-neutral-400 group-hover:text-blue-500 transition-colors">
                                            {src.visitors || 0}
                                        </td>
                                        <td className="py-4 text-center font-black text-neutral-400 group-hover:text-green-500 transition-colors">
                                            {src.leads}
                                        </td>
                                        <td className="py-4 text-right pr-2">
                                            <span className="text-xs font-bold bg-neutral-900/50 backdrop-blur-md border border-white/5 text-neutral-400 px-3 py-1.5 rounded-lg group-hover:bg-[#FF0055]/10 group-hover:text-[#FF0055] group-hover:border-[#FF0055]/30 transition-all">
                                                {src.cac}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
            </div>
            {selectedNetwork && <SocialFunnelDeepDive network={selectedNetwork} onClose={() => setSelectedNetwork(null)} data={data} />}
        </div>
    );
}

const SocialFunnelDeepDive = ({ network, onClose, data }) => {
    // Dynamic content generator based on network ID
    const isVideo = network.id === 'tiktok' || network.id === 'ig' || network.id === 'ig_reels';
    
    // True funnel metrics mapped from DB/API
    const impressions = network.impressions || 0;
    const views = network.visitors || 0;
    const clicks = network.clicks || 0;
    const leads = network.leads !== '-' ? network.leads : 0;

    const [realPosts, setRealPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [apiError, setApiError] = useState(null);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoadingPosts(true);
            setApiError(null);
            try {
                const url = `/api/analytics/proxy-posts?network=${network.id}`;
                // El navegador maneja la cookie JWT de proxy de Vite automáticamente 
                // o usamos el localStorage adminToken
                const t = localStorage.getItem('adminToken');
                const authHeader = t ? { 'Authorization': `Bearer ${t}` } : {};
                
                const r = await fetch(url, { headers: authHeader });
                const j = await r.json();
                
                if (j.success) {
                    setRealPosts(j.posts || []);
                } else {
                    setApiError(j.error || 'No se pudieron obtener métricas reales');
                }
            } catch (e) {
                setApiError('Fallo en la conexión proxy de React');
            } finally {
                setLoadingPosts(false);
            }
        };

        if (network.id === 'web') {
            setLoadingPosts(false);
            setRealPosts([]);
        } else {
            fetchPosts();
        }
    }, [network.id]);

    const topComments = [
        { user: '@jare_dev22', txt: 'Bro la iluminación en este reel está brutal 🔥' },
        { user: '@cfo_latam', txt: '¿Tienen soporte para integración con SAP?' },
        { user: '@marketing_p', txt: 'Me acabo de registrar, ¡espero la llamada!' },
        { user: '@hater_01', txt: 'Otra herramienta más de IA...' },
    ];

    const peakHours = [
        { hour: '06:00', reach: 200 }, { hour: '09:00', reach: 600 },
        { hour: '13:00', reach: 1300 }, { hour: '16:00', reach: 850 },
        { hour: '19:00', reach: 2100 }, { hour: '22:00', reach: 1100 }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop Blur Area */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer animate-in fade-in duration-300" 
                onClick={onClose}
            ></div>

            {/* Slide Out Panel */}
            <div className="relative w-[95vw] max-w-[1400px] h-full bg-[#0a0a09]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-500 flex flex-col">
                
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#0a0a09]/90 backdrop-blur-xl border-b border-white/5 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl bg-[#111] w-14 h-14 flex items-center justify-center rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,0,85,0.2)]">
                            {network.emoji}
                        </span>
                        <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-2">
                                Análisis Forense: {network.name}
                            </h2>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Conectado a Nodo de Inteligencia Central</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-[#161615] hover:bg-[#CC0000] text-neutral-400 hover:text-white rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-10 flex flex-col gap-8 flex-1">

                    {/* Zone 1: Mini Funnel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex flex-col relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full blur-xl group-hover:bg-blue-500/20"></div>
                           <Eye className="text-blue-500 mb-2" size={20} />
                           <span className="text-xl font-black text-white">{impressions.toLocaleString()}</span>
                           <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Impresiones Globales</span>
                        </div>
                        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex flex-col relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-[#00F0FF]/10 rounded-bl-full blur-xl group-hover:bg-[#00F0FF]/20"></div>
                           <Activity className="text-[#00F0FF] mb-2" size={20} />
                           <span className="text-xl font-black text-white">{views.toLocaleString()}</span>
                           <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Vistas a Perfil</span>
                        </div>
                        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex flex-col relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-[#9D00FF]/10 rounded-bl-full blur-xl group-hover:bg-[#9D00FF]/20"></div>
                           <MousePointerClick className="text-[#9D00FF] mb-2" size={20} />
                           <span className="text-xl font-black text-white">{clicks.toLocaleString()}</span>
                           <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Clics Salientes</span>
                        </div>
                        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl flex flex-col relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FF66]/10 rounded-bl-full blur-xl group-hover:bg-[#00FF66]/20"></div>
                           <Target className="text-[#00FF66] mb-2" size={20} />
                           <span className="text-xl font-black text-white">{leads.toLocaleString()}</span>
                           <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Conversiones Totales</span>
                        </div>
                    </div>

                    {/* Zone 2: TABULAR DATA CREATOR STUDIO */}
                    <div className="flex-1 flex flex-col bg-[#111]/40 border border-white/5 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                        
                        {/* Filtros visuales MOCK */}
                        <div className="flex overflow-x-auto gap-2 p-5 border-b border-white/5 bg-black/20">
                            {[
                                { i: BarChart2, t: 'Métricas Generales', active: true },
                                { i: Eye, t: 'Visualizaciones', active: false },
                                { i: Heart, t: 'Me Gusta', active: false },
                                { i: MessageSquare, t: 'Comentarios', active: false }
                            ].map((tab, idx) => (
                                <button key={idx} className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${tab.active ? 'bg-white text-black' : 'bg-transparent text-neutral-500 hover:text-white border border-transparent hover:border-white/10'}`}>
                                    <tab.i size={14} /> {tab.t}
                                </button>
                            ))}
                            <div className="ml-auto w-64">
                                <div className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 flex items-center">
                                    <span className="text-neutral-500 text-xs mr-2">🔍</span>
                                    <input type="text" placeholder="Buscar contenido..." className="bg-transparent border-none outline-none text-xs text-white w-full h-full placeholder:text-neutral-600" />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor de Tabla */}
                        <div className="flex-1 overflow-auto rounded-b-3xl relative">
                            {network.id === 'web' ? (
                                // TABLA DE EVENTOS META PIXEL (WEB)
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                                        <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-neutral-500">
                                            <th className="py-4 px-6 w-[40%]">Evento Analizado</th>
                                            <th className="py-4 px-6">Fuente / Origen</th>
                                            <th className="py-4 px-6 text-center">Frecuencia</th>
                                            <th className="py-4 px-6 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm">
                                        {(!data.pixelEvents || data.pixelEvents.length === 0) ? (
                                            <tr><td colSpan="4" className="py-10 text-center text-neutral-600 font-bold">No hay eventos recientes capturados</td></tr>
                                        ) : (
                                            data.pixelEvents.map((ev, i) => (
                                                <tr key={i} className="hover:bg-neutral-900/50 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
                                                                <MousePointerClick size={18} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-white text-base capitalize">{ev.name.replace(/_/g, ' ')}</span>
                                                                <span className="text-[10px] text-[#00F0FF] uppercase tracking-widest bg-[#00F0FF]/10 px-2 py-0.5 rounded w-fit mt-1">META PIXEL EVENT</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                                                            <Globe className="w-3 h-3"/> website_root
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="font-black text-2xl text-white">{ev.count}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <button className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full transition-colors"><BarChart2 size={14}/></button>
                                                            <button className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full transition-colors">...</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                // TABLA ESTILO CREATOR STUDIO (REDES SOCIALES)
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                                        <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-neutral-500">
                                            <th className="py-4 px-6 w-[40%]">Contenido (Post / Reel)</th>
                                            <th className="py-4 px-6">Privacidad</th>
                                            <th className="py-4 px-6 text-center">Visualizaciones</th>
                                            <th className="py-4 px-6 text-center">Me Gusta</th>
                                            <th className="py-4 px-6 text-center">Comentarios</th>
                                            <th className="py-4 px-6 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm">
                                        {loadingPosts ? (
                                            <tr><td colSpan="6" className="py-20 text-center"><div className="mx-auto w-8 h-8 border-2 border-[#FF0055] border-t-transparent rounded-full animate-spin"></div></td></tr>
                                        ) : apiError ? (
                                            <tr><td colSpan="6" className="py-10 text-center text-[#FF0055] font-bold">{apiError}</td></tr>
                                        ) : (!realPosts || realPosts.length === 0) ? (
                                            <tr><td colSpan="6" className="py-10 text-center text-neutral-600 font-bold">Sin contenido emitido en este canal</td></tr>
                                        ) : (
                                            realPosts.map((post, i) => (
                                                <tr key={post.id || i} className="hover:bg-neutral-900/40 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="flex gap-4 items-center">
                                                            <div className="relative w-16 h-24 bg-neutral-900 rounded border border-white/10 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-[#FF0055]/50 transition-colors">
                                                                <PlayCircle className="text-white/30 absolute z-10" />
                                                                {/* Simulación de Asset miniatura */}
                                                                <div className="absolute bottom-1 left-1 bg-black/80 px-1 rounded text-[8px] font-black text-white z-10 tracking-widest">00:30</div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="font-bold text-neutral-200 text-sm line-clamp-2 hover:text-white hover:underline leading-snug">
                                                                    {post.title}
                                                                </a>
                                                                <span className="text-[10px] text-[#FF0055] mt-1.5 flex items-center gap-1 font-bold">
                                                                    📌 ACTIVO <span className="text-neutral-500 font-normal">| Dominio Público</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-neutral-400 font-bold text-xs">
                                                        <div className="flex items-center gap-1.5 bg-[#161615] border border-white/5 w-max px-3 py-1.5 rounded-lg hover:border-white/20 cursor-pointer transition-colors">
                                                            <Globe className="w-3 h-3 text-neutral-500" /> Todo el mundo v
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-black text-white">
                                                        {post.views}
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-bold text-neutral-400 group-hover:text-[#FF0055] transition-colors">
                                                        {post.likes}
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-bold text-neutral-400 group-hover:text-[#00F0FF] transition-colors">
                                                        {post.comments}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <button className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full transition-colors" title="Editar"><Edit2 size={14}/></button>
                                                            <button className="p-2 bg-neutral-800 hover:bg-[#00F0FF]/20 hover:text-[#00F0FF] text-neutral-300 rounded-full transition-colors" title="Ver comentarios"><MessageSquare size={14}/></button>
                                                            <button className="p-2 bg-neutral-800 hover:bg-[#FF0055]/20 hover:text-[#FF0055] text-neutral-300 rounded-full transition-colors" title="Promocionar"><Activity size={14}/></button>
                                                            <button className="p-2 bg-transparent text-neutral-500 hover:text-white transition-colors">...</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};
