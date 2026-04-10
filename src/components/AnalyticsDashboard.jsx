import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Chart as GoogleChart } from "react-google-charts";
import { 
    Activity, ArrowUpRight, Users, MousePointerClick, 
    Smartphone, ArrowRight, DollarSign, Target, Orbit, Zap, Database, Bot, Cpu,
    X, MessageSquare, Heart, Clock, Eye, BarChart2, ChevronRight, Share2, PlayCircle
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

    const sankeyOptions = {
        sankey: {
            node: {
                colors: ['#FF0055', '#00F0FF', '#9D00FF', '#00FF66', '#FFEA00', '#FF0055'],
                label: { fontName: 'Inter', fontSize: 14, color: '#A3A3A3', bold: true },
                nodePadding: 60,
                width: 12
            },
            link: {
                colorMode: 'gradient',
                colors: ['#FF0055', '#9D00FF', '#111111']
            }
        },
        backgroundColor: 'transparent'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Costo de Adquisición</p>
                    <h2 className="text-4xl font-black text-white">{data.kpis.avgCac || '$0.00'}</h2>
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
                                                                <div className="space-y-3 min-h-[150px]">
                                {loadingPosts ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-500 py-6">
                                        <div className="w-6 h-6 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-[#00F0FF]">Extrayendo Red...</span>
                                    </div>
                                ) : apiError ? (
                                    <div className="bg-[#111]/60 backdrop-blur-md border border-[#FF0055]/30 p-4 rounded-xl text-center shadow-[0_0_15px_rgba(255,0,85,0.1)]">
                                        <p className="text-sm text-[#FF0055] font-bold pb-1">⚠️ Conexión API Denegada</p>
                                        <p className="text-[11px] text-neutral-400 leading-snug">{apiError}</p>
                                    </div>
                                ) : realPosts.length === 0 ? (
                                    <div className="bg-[#111]/40 border border-white/5 p-4 rounded-xl text-center">
                                        <p className="text-xs text-neutral-500 font-bold uppercase">No hay contenido recuperable por API</p>
                                    </div>
                                ) : (
                                    realPosts.map((post, index) => (
                                        <a href={post.url} target="_blank" rel="noopener noreferrer" key={post.id || index} className="bg-[#111]/60 backdrop-blur-md border border-white/5 p-4 rounded-xl hover:border-[#FF0055]/30 hover:bg-[#161615] transition-all flex justify-between items-center cursor-pointer group shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-500 group-hover:text-[#FF0055] transition-colors relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-[#FF0055]/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                                    <PlayCircle size={18} className="relative z-10" />
                                                </div>
                                                <div className="flex flex-col flex-1 max-w-[140px] lg:max-w-[200px]">
                                                    <span className="text-sm font-bold text-white line-clamp-1 group-hover:underline">{post.title}</span>
                                                    <span className="text-[10px] text-[#00F0FF] tracking-widest uppercase">{post.views}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold text-neutral-500">
                                                <div className="flex items-center gap-1.5 group-hover:text-white transition-colors"><Heart size={14} className="text-[#FF0055]" />{post.likes}</div>
                                                <div className="flex items-center gap-1.5 group-hover:text-white transition-colors"><MessageSquare size={14} className="text-[#FFEA00]" />{post.comments}</div>
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Zone 3: Peak Hours Heatmap mock */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} className="text-[#00F0FF]" />
                                Frecuencia Activa (Horas Pico)
                            </h3>
                            <div className="bg-[#111]/40 border border-white/5 p-4 rounded-xl h-[230px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={peakHours} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                        <XAxis dataKey="hour" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip cursor={{ fill: '#161615' }} contentStyle={{ backgroundColor: '#0a0a09', borderColor: '#333', borderRadius: '12px' }} />
                                        <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
                                            {peakHours.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.reach > 1500 ? '#FF0055' : entry.reach > 800 ? '#9D00FF' : '#333'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Zone 4: Sentinel Comments Feed */}
                    <div className="flex flex-col gap-4 pb-10">
                         <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#FFEA00]" />
                            Radar Semántico (Últimas Interacciones)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {topComments.map((comment, i) => (
                                <div key={i} className="bg-[#161615] border-l-2 border-[#FF0055] p-4 rounded-r-xl">
                                    <p className="text-xs font-bold text-neutral-500 mb-1">{comment.user}</p>
                                    <p className="text-sm text-neutral-300 italic">"{comment.txt}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};
