import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Chart as GoogleChart } from "react-google-charts";
import { 
    Activity, ArrowUpRight, Users, MousePointerClick, 
    Smartphone, ArrowRight, DollarSign, Target, Orbit, Zap, Database, Bot, Cpu
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
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
                <div className="bg-gradient-to-br from-[#161615] to-[#111] border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full blur-2xl transition-all group-hover:bg-blue-500/20"></div>
                    <Users className="text-blue-500 mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Tráfico Global</p>
                    <h2 className="text-4xl font-black text-white">{totalVisits}</h2>
                </div>

                <div className="bg-gradient-to-br from-[#161615] to-[#111] border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#CC0000]/10 rounded-bl-full blur-2xl transition-all group-hover:bg-[#CC0000]/20"></div>
                    <Target className="text-[#CC0000] mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Leads Capturados</p>
                    <h2 className="text-4xl font-black text-white">{totalLeads}</h2>
                </div>

                <div className="bg-gradient-to-br from-[#161615] to-[#111] border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full blur-2xl transition-all group-hover:bg-green-500/20"></div>
                    <Smartphone className="text-green-500 mb-4" size={28} />
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Llamadas Agendadas</p>
                    <h2 className="text-4xl font-black text-white">{totalCalls}</h2>
                </div>

                <div className="bg-gradient-to-br from-[#161615] to-[#111] border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group">
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
                        Biosensores de Agentes (El Bebé)
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
                
                {/* Traffic Flow Sankey Chart */}
                <div className="xl:col-span-2 bg-[#111]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative animate-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF0055] to-transparent opacity-20"></div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <Activity size={20} className="text-[#CC0000]" />
                        Matriz de Conversión (Sankey Flow)
                    </h3>
                    
                    {data.sankeyData && data.sankeyData.length > 2 ? (
                        <div className="w-full h-[400px] bg-transparent rounded-2xl">
                             <GoogleChart
                                chartType="Sankey"
                                width="100%"
                                height="100%"
                                data={data.sankeyData}
                                options={sankeyOptions}
                             />
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
                                    <tr key={idx} className="group hover:bg-[#161615]/50 transition-colors">
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
        </div>
    );
}
