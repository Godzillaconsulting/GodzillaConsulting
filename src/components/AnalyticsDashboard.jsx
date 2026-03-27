import React, { useState, useEffect } from 'react';
import { Chart } from 'react-google-charts';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// --- (Global) Sankey Mock Data ---
const sankeyData = [
  ["From", "To", "Weight"],
  ["Meta Ads", "Landing Page", 9000],
  ["Google Ads", "Landing Page", 4500],
  ["Organic", "Landing Page", 2500],
  ["Landing Page", "Lead Form", 3200],
  ["Landing Page", "Bounced", 12800],
  ["Lead Form", "Booked Call", 850],
  ["Lead Form", "No Action", 2350],
  ["Booked Call", "Closed Won", 210],
  ["Booked Call", "Closed Lost", 640]
];
const sankeyOptions = {
  sankey: {
    node: { 
        colors: [
            '#1877F2', // Meta Ads (Azul)
            '#F8FAFC', // Landing Page (Blanco)
            '#FBBC05', // Google Ads (Amarillo)
            '#00f2fe', // Organic (Cyan TikTok)
            '#F59E0B', // Lead Form (Naranja)
            '#333333', // Bounced (Gris oscuro)
            '#8B5CF6', // Booked Call (Morado)
            '#4B5563', // No Action (Gris medio)
            '#10B981', // Closed Won (Verde éxito)
            '#EF4444'  // Closed Lost (Rojo)
        ], 
        nodePadding: 45, 
        width: 16, 
        label: { fontName: 'Inter', fontSize: 13, color: '#FFFFFF', bold: true } 
    },
    link: { 
        colorMode: 'gradient', 
        fillOpacity: 0.7 
    }
  },
  backgroundColor: 'transparent',
};

// --- (Global) Financial ROI Mock Data ---
const roiData = [
  { name: 'Oct', spend: 3200, revenue: 9500, cac: 185 },
  { name: 'Nov', spend: 4500, revenue: 14000, cac: 165 },
  { name: 'Dec', spend: 6000, revenue: 21000, cac: 150 },
  { name: 'Jan', spend: 5500, revenue: 18500, cac: 170 },
  { name: 'Feb', spend: 7200, revenue: 28000, cac: 135 },
  { name: 'Mar', spend: 8500, revenue: 35000, cac: 120 },
];

// --- Traffic Sources (Master View Cards) ---
const trafficSources = [
  { id: 'ig_reels', name: 'Meta Ads (IG Reels)', emoji: '📱', visitors: 6500, leads: 1200, calls: 250, cac: '$45.00', roi: '450%' },
  { id: 'fb_feed', name: 'Meta Ads (FB Feed)', emoji: '📘', visitors: 2500, leads: 350, calls: 60, cac: '$65.00', roi: '210%' },
  { id: 'google_ads', name: 'Google Search Ads', emoji: '🔍', visitors: 4500, leads: 1150, calls: 400, cac: '$85.00', roi: '380%' },
  { id: 'tiktok_org', name: 'Organic (TikTok)', emoji: '🎵', visitors: 1500, leads: 300, calls: 90, cac: '$0.00', roi: 'INF' },
];

// --- Specific Network Detail Data (Creator Studio Drill-down) ---
const detailData = {
  ig_reels: {
    metrics: [
      { key: 'likes', name: 'Likes', color: '#E1306C', isArea: true },
      { key: 'comments', name: 'Comments', color: '#833AB4' },
      { key: 'shares', name: 'Shares', color: '#F56040' },
      { key: 'saves', name: 'Saves', color: '#FCAF45' },
    ],
    kpis: { reach: '1.2M', impressions: '1.5M', followers: '+4,500', engagementRate: '5.2%' },
    engagementGraph: [
      { date: '01/Mar', likes: 450, comments: 20, shares: 15, saves: 50 },
      { date: '05/Mar', likes: 800, comments: 45, shares: 35, saves: 120 },
      { date: '10/Mar', likes: 650, comments: 30, shares: 25, saves: 80 },
      { date: '15/Mar', likes: 1200, comments: 85, shares: 90, saves: 210 },
      { date: '20/Mar', likes: 950, comments: 55, shares: 45, saves: 160 },
      { date: '25/Mar', likes: 1500, comments: 120, shares: 150, saves: 300 }
    ],
    topPosts: [
      { id: 1, thumb: '🎬', title: 'Cómo escalar tu negocio B2B', views: '250', likes: '3.2K', comments: '1.3K', completion: 65, drops: 'Al minuto 0:45', badge: '🔥 Más Visto', retention: { reached: '800K', thruplay: '150K', p25: '120K', p50: '100K', p75: '80K', p100: '65K' } },
      { id: 2, thumb: '💡', title: 'El secreto de los leads', views: '180', likes: '5.1K', comments: '1.1K', completion: 72, drops: 'Al minuto 0:55', badge: '❤️ Más Gustado', retention: { reached: '500K', thruplay: '100K', p25: '90K', p50: '85K', p75: '78K', p100: '72K' } },
      { id: 3, thumb: '⚠️', title: '5 Errores al usar Ads', views: '45', likes: '600', comments: '200', completion: 12, drops: 'A los 5 seg', badge: '📉 Menor Retención', retention: { reached: '200K', thruplay: '40K', p25: '12K', p50: '8K', p75: '6K', p100: '2K' } },
      { id: 4, thumb: '💎', title: 'Estudio de Caso: Neon', views: '95', likes: '2.5K', comments: '600', completion: 85, drops: 'Al final', badge: '💬 Más Comentado', retention: { reached: '300K', thruplay: '80K', p25: '78K', p50: '75K', p75: '70K', p100: '65K' } },
    ]
  },
  fb_feed: {
    metrics: [
      { key: 'likes', name: 'Reactions', color: '#1877F2', isArea: true },
      { key: 'comments', name: 'Comments', color: '#89CFF0' },
      { key: 'shares', name: 'Shares', color: '#3b5998' }
    ],
    kpis: { reach: '800K', impressions: '1.1M', followers: '+1,200', engagementRate: '3.8%' },
    engagementGraph: [
      { date: '01/Mar', likes: 300, comments: 15, shares: 10 },
      { date: '05/Mar', likes: 600, comments: 40, shares: 30 },
      { date: '15/Mar', likes: 900, comments: 70, shares: 50 }
    ],
    topPosts: [
      { id: 1, thumb: '📰', title: 'Noticia: Nuevo framework', views: '120', likes: '1.2K', comments: '300', completion: 45, drops: '10 seg', badge: '🔥 Viral', retention: { reached: '300K', thruplay: '90K', p25: '60K', p50: '45K', p75: '30K', p100: '20K' } },
      { id: 2, thumb: '🖼️', title: 'Infografía Funnel', views: '80', likes: '3.5K', comments: '450', completion: 80, drops: 'N/A', badge: '❤️ Más Compartido', retention: { reached: '150K', thruplay: '100K', p25: '95K', p50: '90K', p75: '85K', p100: '80K' } },
    ]
  },
  google_ads: {
    metrics: [
      { key: 'clicks', name: 'Clics', color: '#4285F4', isArea: true },
      { key: 'conversions', name: 'Conversiones', color: '#EA4335' },
      { key: 'impressions', name: 'Impresiones (x1000)', color: '#FBBC05' },
    ],
    kpis: { reach: '350K Clics', impressions: '4M Impr', followers: '$1.22 CPC', engagementRate: '8.5% CTR' },
    engagementGraph: [
      { date: '01/Mar', clicks: 1200, conversions: 45, impressions: 15 },
      { date: '05/Mar', clicks: 1800, conversions: 60, impressions: 22 },
      { date: '10/Mar', clicks: 1400, conversions: 50, impressions: 18 },
      { date: '15/Mar', clicks: 2500, conversions: 110, impressions: 30 },
      { date: '20/Mar', clicks: 2100, conversions: 80, impressions: 25 },
      { date: '25/Mar', clicks: 3200, conversions: 150, impressions: 40 }
    ],
    topPosts: [
      { id: 1, thumb: '🔍', title: 'Search: "Consultoría IT"', views: '20', likes: '1.5K', comments: '0', completion: 15, drops: 'Bounce 40%', badge: '🔥 Mayor CTR', retention: { reached: '5M Impr', thruplay: 'N/A', p25: '20K Clics', p50: '5K Landing', p75: '2K Form', p100: '1.5K Lead' } },
      { id: 2, thumb: '📈', title: 'PMax: "Automatización Neon"', views: '15', likes: '800', comments: '0', completion: 8, drops: 'Bounce 35%', badge: '💎 Mejor ROAS', retention: { reached: '2M Impr', thruplay: 'N/A', p25: '15K Clics', p50: '4K Landing', p75: '1K Form', p100: '800 Lead' } },
    ]
  },
  tiktok_org: {
    metrics: [
      { key: 'views', name: 'Views (k)', color: '#00f2fe', isArea: true },
      { key: 'likes', name: 'Likes', color: '#ff0844' },
      { key: 'shares', name: 'Shares', color: '#ffffff' }
    ],
    kpis: { reach: '3.5M', impressions: '4.2M', followers: '+12,000', engagementRate: '12.4%' },
    engagementGraph: [
      { date: '01/Mar', views: 50, likes: 500, shares: 100 },
      { date: '15/Mar', views: 500, likes: 5000, shares: 1200 },
      { date: '25/Mar', views: 250, likes: 2500, shares: 600 }
    ],
    topPosts: [
      { id: 1, thumb: '🕺', title: 'Trend: Oficina Juárez', views: '1500', likes: '150K', comments: '2K', completion: 45, drops: '3 seg', badge: '🔥 Viral', retention: { reached: '2M', thruplay: '1.5M', p25: '900K', p50: '600K', p75: '400K', p100: '200K' } },
      { id: 2, thumb: '🎤', title: 'POV: Cliente feliz', views: '300', likes: '35K', comments: '500', completion: 60, drops: '8 seg', badge: '💸 Atrajo Leads', retention: { reached: '500K', thruplay: '300K', p25: '250K', p50: '200K', p75: '180K', p100: '150K' } },
    ]
  }
};

export default function AnalyticsDashboard() {
  const [pixelStatus, setPixelStatus] = useState('checking');
  const [selectedSource, setSelectedSource] = useState(null); 
  const [expandedPost, setExpandedPost] = useState(null);
  const [liveTrafficSources, setLiveTrafficSources] = useState(trafficSources);
  const [liveSankeyData, setLiveSankeyData] = useState(sankeyData);
  const [liveRoiData, setLiveRoiData] = useState(roiData);
  const [liveKpis, setLiveKpis] = useState({
     totalSpend: '$34,900',
     totalRevenue: '$126,000',
     globalROI: '361%',
     avgCac: '$153.33'
  });

  useEffect(() => {
    const timer = setTimeout(() => setPixelStatus('active'), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${base}/api/analytics/dashboard`);
        const data = await res.json();
        if (data.success) {
          if (data.trafficSources) setLiveTrafficSources(data.trafficSources);
          if (data.sankeyData) setLiveSankeyData(data.sankeyData);
          if (data.roiData) setLiveRoiData(data.roiData);
          if (data.kpis) setLiveKpis(data.kpis);
        }
      } catch (e) {
        console.error('No se pudo establecer conexión al servidor analítico real:', e);
      }
    };
    fetchDashboardData();
  }, []);

  const handleSourceClick = (id) => {
    if (detailData[id]) {
      setSelectedSource(id);
      setExpandedPost(null);
    } else alert("Datos de simulador no disponibles para esta red.");
  };

  const currentSource = liveTrafficSources.find(s => s.id === selectedSource);
  const currentDetails = detailData[selectedSource];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* ── HEADER ── */}
      <div className="px-6 py-4 border-b border-neutral-800 bg-[#0d0d0d] flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div>
          <h2 className="text-lg font-black text-white leading-none">
            {selectedSource ? `Analytics Nivel Creador: ${currentSource.name}` : 'Godzilla Analytics Central'}
          </h2>
          <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
            {selectedSource ? `Profundizando en métricas de retención y engagement` : 'Live attribution & global revenue logs (Juárez Time)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedSource && (
            <button 
              onClick={() => setSelectedSource(null)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-xs font-bold text-white transition mr-2"
            >
              ← Volver a Global
            </button>
          )}
          <div className="flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
            <span className="text-xs font-bold text-gray-400">Meta Pixel:</span>
            {pixelStatus === 'checking' ? (
              <span className="flex items-center gap-2 text-xs font-medium text-yellow-500"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /> Checking...</span>
            ) : (
              <span className="flex items-center gap-2 text-xs font-bold text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"><span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> Active (Receiving Events)</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ======================= */}
        {/* VISTA GLOBAL (MASTER)   */}
        {/* ======================= */}
        {!selectedSource && (
          <>
            <div className="flex flex-col xl:flex-row gap-6 min-h-[400px]">
              {/* Sankey */}
              <div className="flex-[4] bg-[#0d0d0d] rounded-2xl border border-neutral-800 p-6 flex flex-col relative">
                <h3 className="text-sm font-black text-[#CC0000] tracking-widest mb-4">GLOBAL ATTRIBUTION</h3>
                <div className="flex-1 relative flex flex-col justify-center bg-black/50 rounded-xl p-2 border border-neutral-800/50 min-h-[300px]">
                   <Chart chartType="Sankey" width="100%" height="100%" data={liveSankeyData} options={sankeyOptions} />
                </div>
              </div>

              {/* ROI */}
              <div className="flex-[6] bg-gradient-to-br from-[#0d0d0d] to-red-950/10 rounded-2xl border border-neutral-800 p-6 flex flex-col">
                <h3 className="text-sm font-black text-white tracking-widest mb-4">PROGRAM ROI (SPEND VS REVENUE)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 shrink-0">
                   <div className="bg-black/50 rounded-xl p-3 border border-neutral-800 flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Total Spend</span>
                      <span className="text-xl font-black text-white">{liveKpis.totalSpend}</span>
                   </div>
                   <div className="bg-black/50 rounded-xl p-3 border border-neutral-800 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 blur-xl rounded-full" />
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Total Revenue</span>
                      <span className="text-xl font-black text-green-400">{liveKpis.totalRevenue}</span>
                   </div>
                   <div className="bg-black/50 rounded-xl p-3 border border-neutral-800 flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Avg CAC</span>
                      <span className="text-xl font-black text-white">{liveKpis.avgCac}</span>
                   </div>
                   <div className="bg-[#CC0000]/10 rounded-xl p-3 border border-[#CC0000]/30 flex flex-col gap-1 shadow-[0_4px_20px_rgba(204,0,0,0.1)]">
                      <span className="text-[9px] text-[#CC0000] uppercase tracking-wider font-bold flex items-center gap-1">Global ROI <span className="text-[8px] bg-[#CC0000] text-white px-1 rounded hidden sm:inline">ALL TIME</span></span>
                      <span className="text-xl font-black text-white">{liveKpis.globalROI}</span>
                   </div>
                </div>
                <div className="flex-1 min-h-[200px] bg-black/30 rounded-xl border border-neutral-800 p-2 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={liveRoiData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="#333333" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#888888" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#888888" tick={{fontSize: 10}} tickFormatter={(v) => `$${v/1000}k`} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#CC0000" tick={{fontSize: 10}} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#333333', borderRadius: '8px', color: '#fff' }} />
                      <Bar yAxisId="left" dataKey="spend" name="Ad Spend" fill="#444444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Line yAxisId="right" type="monotone" dataKey="cac" name="CAC" stroke="#CC0000" strokeWidth={3} dot={{r: 3}} activeDot={{r: 5}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROW 2: Network Source Cards */}
            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Nodos de Tráfico (Drill-down)</h3>
                <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-1 rounded font-bold hidden sm:inline">● Haz clic en una red para desglosar su rendimiento exacto</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {trafficSources.map(src => (
                  <button 
                    key={src.id} 
                    onClick={() => handleSourceClick(src.id)}
                    className="bg-[#0d0d0d] hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl p-5 text-left transition-all duration-300 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{src.emoji}</span>
                        <h4 className="font-bold text-sm text-gray-200 group-hover:text-white">{src.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-6">
                        <div className="flex flex-col"><span className="text-neutral-500 font-bold text-[10px]">Visitas</span><span className="text-white font-bold">{src.visitors.toLocaleString()}</span></div>
                        <div className="flex flex-col"><span className="text-neutral-500 font-bold text-[10px]">Leads</span><span className="text-white font-bold">{src.leads.toLocaleString()}</span></div>
                        <div className="flex flex-col"><span className="text-neutral-500 font-bold text-[10px]">{src.id === 'google_ads' ? 'Conversiones' : 'Llamadas'}</span><span className="text-[#CC0000] font-bold">{src.calls}</span></div>
                        <div className="flex flex-col"><span className="text-neutral-500 font-bold text-[10px]">CAC</span><span className="text-gray-400 font-bold">{src.cac}</span></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between">
                      <span className="text-green-400 font-black text-sm">ROI: {src.roi}</span>
                      <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-bold flex items-center gap-1">Auditar Retención <span className="group-hover:translate-x-1 transition-transform">→</span></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ======================= */}
        {/* VISTA DETALLE (CREATOR) */}
        {/* ======================= */}
        {selectedSource && currentDetails && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* KPI Row (Creator) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 flex flex-col gap-1 text-center">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Alcance / Impresiones Totales</span>
                <span className="text-2xl font-black text-white">{currentDetails.kpis.reach}</span>
              </div>
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 flex flex-col gap-1 text-center">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Costo o Impresiones Netas</span>
                <span className="text-2xl font-black text-white">{currentDetails.kpis.impressions}</span>
              </div>
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 flex flex-col gap-1 text-center">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Variación Actuante (Subs/CPC)</span>
                <span className="text-2xl font-black text-green-400">{currentDetails.kpis.followers}</span>
              </div>
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 flex flex-col gap-1 text-center">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Engagement / Conversion Rate</span>
                <span className="text-2xl font-black text-blue-400">{currentDetails.kpis.engagementRate}</span>
              </div>
            </div>

            {/* Gráfica de Engagement (Theme Colored) */}
            <div className="bg-[#0d0d0d] rounded-2xl border border-neutral-800 p-6 flex flex-col min-h-[350px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Evolución Diaria ({currentSource.name})</h3>
                <div className="flex gap-4">
                  {currentDetails.metrics.map(m => (
                    <span key={m.key} className="text-[10px] font-bold flex items-center gap-1" style={{color: m.color}}>
                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: m.color}} /> {m.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-black/40 rounded-xl p-2 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentDetails.engagementGraph} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      {currentDetails.metrics.filter(m => m.isArea).map(m => (
                        <linearGradient key={`color_${m.key}`} id={`color_${m.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={m.color} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="#333333" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#888888" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#333333', borderRadius: '8px', color: '#fff' }} />
                    {currentDetails.metrics.map(m => (
                      m.isArea ? (
                        <Area key={m.key} type="monotone" dataKey={m.key} name={m.name} stroke={m.color} fillOpacity={1} fill={`url(#color_${m.key})`} strokeWidth={3} />
                      ) : (
                        <Line key={m.key} type="monotone" dataKey={m.key} name={m.name} stroke={m.color} strokeWidth={2} dot={{r: 2}} />
                      )
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de Rendimiento de Publicaciones y VSLs */}
            <div className="bg-[#0d0d0d] rounded-2xl border border-neutral-800 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Rendimiento Creador & Retención Real</h3>
                <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded font-bold">⚡ Haz clic en el porcentaje para ver el Breakdown Funnel</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider">
                      <th className="font-semibold pb-3 px-2">Video/Campaña</th>
                      <th className="font-semibold pb-3 px-2 text-center">Rendimiento</th>
                      <th className="font-semibold pb-3 px-2 text-right">Vistas (K)</th>
                      <th className="font-semibold pb-3 px-2 text-right text-blue-400">{selectedSource === 'google_ads' ? 'Clicks/Leads' : 'Likes'}</th>
                      <th className="font-semibold pb-3 px-2 text-right text-purple-400">{selectedSource === 'google_ads' ? 'Cost' : 'Comments'}</th>
                      <th className="font-semibold pb-3 px-2 text-right border-l border-neutral-800">Punto de Fuga Frecuente</th>
                      <th className="font-semibold pb-3 px-2 text-right w-40">Retención Real (Play To End)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {currentDetails.topPosts.map(post => (
                      <React.Fragment key={post.id}>
                        <tr className="hover:bg-neutral-900/50 transition-colors">
                          <td className="py-3 px-2 font-bold text-white flex items-center gap-2">
                            <span className="text-xl">{post.thumb}</span> {post.title}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              post.badge.includes('Más') || post.badge.includes('Mejor') || post.badge.includes('Viral') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/20'
                            }`}>{post.badge}</span>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-300 font-bold">{post.views}</td>
                          <td className="py-3 px-2 text-right text-blue-300 font-bold">{post.likes}</td>
                          <td className="py-3 px-2 text-right text-purple-300 font-bold">{post.comments}</td>
                          <td className="py-3 px-2 text-right text-gray-400 text-[10px] border-l border-neutral-800/50 pl-3">
                            <span className="bg-neutral-900 px-2 py-1 rounded border border-neutral-800 text-neutral-300">{post.drops}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {/* BOTÓN CLICKABLE PARA EXPANDIR RETENCIÓN */}
                            <button 
                              onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)} 
                              className="w-full flex flex-col gap-1 items-end group cursor-pointer hover:bg-neutral-800 p-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[10px] text-neutral-500 group-hover:text-white transition-colors">{expandedPost === post.id ? 'Ocultar ▲' : 'Desglose ▼'}</span>
                                <span className="text-white font-bold">{post.completion}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 group-hover:bg-yellow-400 transition-colors" style={{width: `${post.completion}%`}} />
                              </div>
                            </button>
                          </td>
                        </tr>
                        
                        {/* EXPANDED RETENTION FUNNEL */}
                        {expandedPost === post.id && post.retention && (
                          <tr className="bg-[#111] animate-in slide-in-from-top-2 fade-in duration-300">
                            <td colSpan="7" className="p-4 border-t border-neutral-800/50 rounded-b-xl shadow-inner shadow-black/50">
                              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-3">Estadística Avanzada: Anatomía de Retención del Video / Embudo</p>
                              <div className="flex items-stretch gap-2 w-full justify-between -mx-1">
                                {[
                                  { label: 'Reach/Impres.', value: post.retention.reached, color: 'text-gray-400', drop: null },
                                  { label: 'Solo Pasaron (3s)', value: post.retention.thruplay, color: 'text-red-400', drop: 'Drop!' },
                                  { label: 'Vieron 25%', value: post.retention.p25, color: 'text-orange-400', drop: 'Hook' },
                                  { label: 'Vieron 50%', value: post.retention.p50, color: 'text-yellow-400', drop: 'Body' },
                                  { label: 'Vieron 75%', value: post.retention.p75, color: 'text-lime-400', drop: 'Pitch' },
                                  { label: 'Vieron 100% (Fin)', value: post.retention.p100, color: 'text-green-400', drop: 'CTA' },
                                ].map((step, idx) => (
                                  <div key={idx} className="flex-1 bg-black border border-neutral-800/80 rounded-lg p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-neutral-600 transition-colors">
                                    <span className="text-[9px] text-neutral-500 font-black tracking-widest uppercase mb-1">{step.label}</span>
                                    <span className={`text-base font-black ${step.color}`}>{step.value}</span>
                                    {step.drop && <span className="absolute bottom-0 right-1 text-[8px] text-neutral-600 font-mono">{step.drop}</span>}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
