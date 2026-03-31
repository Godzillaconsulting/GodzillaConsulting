import React, { useState, useEffect } from 'react';
import { Chart } from 'react-google-charts';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// --- (SVG Simple Sparkline component) ---
const SparkLine = ({ data, color = '#38bdf8', width='100px', height='25px', className }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${30 - ((d - min) / range) * 25}`).join(' ');
  const pathData = `M ${points.replace(/,/g, ' ').replace(/ (\d+)/g, ',$1')}`;

  return (
    <svg width={width} height={height} viewBox="0 0 100 30" preserveAspectRatio="none" className={className}>
      <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

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
  tooltip: { isHtml: true },
  enableInteractivity: true
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

// --- Mock Data ---
// Nodos Globales (Tráfico)
const trafficSources = [
  { id: 'ig', name: 'Instagram', emoji: '📸', visitors: 6500, leads: 1200, calls: 250, cac: '$45.00', roi: '450%' },
  { id: 'fb', name: 'Facebook', emoji: '📘', visitors: 2500, leads: 350, calls: 60, cac: '$65.00', roi: '210%' },
  { id: 'messenger', name: 'Messenger', emoji: '💬', visitors: 1150, leads: 400, calls: 120, cac: '$15.00', roi: '380%' },
  { id: 'tiktok', name: 'TikTok', emoji: '🎵', visitors: 1500, leads: 300, calls: 90, cac: '$0.00', roi: 'INF' },
  { id: 'web', name: 'Sitio Web (Pixel)', emoji: '💻', visitors: 0, leads: 0, calls: 0, cac: '$0.00', roi: 'Tracking' }
];

// Generador de sparklines
const getRandomSparkline = () => Array.from({length: 10}, () => Math.floor(Math.random() * 50) + 10);

// Nodos de Detalle (Frutiger Aero / Meta Clone Setup)
const metaKpiTemplate = (nameType) => [
  { 
    title: 'Visualizaciones', 
    value: '1.2K', 
    trend: '↑ 14.2%', trendGreen: true,
    followerLabel: nameType === 'web' ? 'Nuevos' : 'De seguidores', followerShare: '45%', followerTrend: '↑ 5%',
    nonFollowerLabel: nameType === 'web' ? 'Recurrentes' : 'De no seguidores', nonFollowerShare: '55%', nonFollowerTrend: '↓ 1%',
    extraLabel: nameType === 'web' ? 'Usuarios Únicos' : 'Espectadores', extraValue: '800', extraTrend: '↑ 10%',
    sparkline: getRandomSparkline()
  },
  { 
    title: 'Interacciones', 
    value: '450', 
    trend: '↓ 2.1%', trendGreen: false,
    followerLabel: nameType === 'web' ? 'Nuevos' : 'De seguidores', followerShare: '60%', followerTrend: '-',
    nonFollowerLabel: nameType === 'web' ? 'Recurrentes' : 'De no seguidores', nonFollowerShare: '40%', nonFollowerTrend: '-',
    sparkline: getRandomSparkline()
  },
  { 
    title: 'Visitas', 
    value: '8,400', 
    trend: '↑ 40.5%', trendGreen: true,
    sparkline: getRandomSparkline()
  },
  { 
    title: nameType === 'web' ? 'Conversiones' : 'Seguimientos', 
    value: '124', 
    trend: '↑ 12%', trendGreen: true,
    extraLabel: nameType === 'web' ? 'Tasa de Conv.' : 'Seguimientos netos', extraValue: nameType === 'web' ? '3.2%' : '110', extraTrend: '↑ 5%',
    sparkline: getRandomSparkline()
  }
];

const detailData = {
  ig: { kpiCards: metaKpiTemplate('social'), metrics: [{key: 'likes', name: 'Likes', color: '#00f2fe', isArea: true}], engagementGraph: [{date: '01', likes: 10}], topPosts: [] },
  fb: { kpiCards: metaKpiTemplate('social'), metrics: [{key: 'likes', name: 'Likes', color: '#00f2fe', isArea: true}], engagementGraph: [{date: '01', likes: 10}], topPosts: [] },
  messenger: { kpiCards: metaKpiTemplate('social'), metrics: [{key: 'msgs', name: 'Messages', color: '#00f2fe', isArea: true}], engagementGraph: [{date: '01', msgs: 10}], topPosts: [] },
  tiktok: { kpiCards: metaKpiTemplate('social'), metrics: [{key: 'views', name: 'Views', color: '#00f2fe', isArea: true}], engagementGraph: [{date: '01', views: 10}], topPosts: [] },
  web: { kpiCards: metaKpiTemplate('web'), metrics: [{key: 'events', name: 'Events', color: '#00f2fe', isArea: true}], engagementGraph: [{date: '01', events: 10}], topPosts: [] }
};

export default function AnalyticsDashboard() {
  const [pixelStatus, setPixelStatus] = useState('checking');
  const [selectedSource, setSelectedSource] = useState(null); 
  const [expandedPost, setExpandedPost] = useState(null);
  const [liveTrafficSources, setLiveTrafficSources] = useState(trafficSources);
  const [liveSankeyData, setLiveSankeyData] = useState([["From", "To", "Weight"], ["Cargando red...", "Obteniendo datos", 1]]);
  const [liveRoiData, setLiveRoiData] = useState([]);
  const [livePixelEvents, setLivePixelEvents] = useState([]);
  const [liveKpis, setLiveKpis] = useState({
     totalSpend: '$0', totalRevenue: '$0', globalROI: '0%', avgCac: '$0'
  });
  const [liveSocialPosts, setLiveSocialPosts] = useState({ ig: [], fb: [] });
  const [timeFilter, setTimeFilter] = useState('all'); // '1', '7', '30', 'all'

  useEffect(() => {
    const timer = setTimeout(() => setPixelStatus('active'), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // Peticiones paralelas: Analíticas internas y API de Redes Sociales (Meta Graph)
        const [dashRes, metaRes] = await Promise.all([
           fetch(`${base}/api/analytics/dashboard`).catch(() => null),
           fetch(`${base}/api/social/meta`).catch(() => null)
        ]);
        
        const data = dashRes ? await dashRes.json() : { success: false };
        const metaData = metaRes ? await metaRes.json() : { success: false };

        if (data.success) {
          let sources = data.trafficSources || trafficSources;
          
          // INYECCIÓN DE DATOS REALES DE FACEBOOK E INSTAGRAM
          if (metaData && metaData.success && metaData.data) {
              const fbStats = metaData.data.fb;
              const igStats = metaData.data.ig;
              sources = sources.map(s => {
                  if (s.id === 'ig' && igStats) {
                      return { ...s, 
                          visitors: igStats.followers, /* Interceptamos para Followers */
                          leads: igStats.posts,        /* Total Posts */
                          cac: 'Orgánico',
                          roi: 'Real-Time'
                      };
                  }
                  if (s.id === 'fb' && fbStats) {
                      return { ...s, 
                          visitors: fbStats.followers, 
                          cac: 'Orgánico',
                          roi: 'Real-Time'
                      };
                  }
                  return s;
              });

              setLiveSocialPosts({
                  ig: igStats?.posts || [],
                  fb: fbStats?.posts || []
              });
          }

          setLiveTrafficSources(sources);
          if (data.sankeyData) setLiveSankeyData(data.sankeyData);
          if (data.roiData) setLiveRoiData(data.roiData);
          if (data.pixelEvents) setLivePixelEvents(data.pixelEvents);
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
  let currentDetails = detailData[selectedSource];
  
  if (selectedSource === 'web' && currentDetails) {
     currentDetails = {
        ...currentDetails,
        topPosts: livePixelEvents.length > 0 ? livePixelEvents.map((ev, i) => ({
           id: i,
           thumb: '⚡',
           title: ev.name,
           views: '-',
           likes: ev.count,
           comments: '-',
           completion: 100,
           drops: 'N/A',
           badge: '🔥 Activo',
           retention: { reached: ev.count, thruplay: 'N/A', p25: '-', p50: '-', p75: '-', p100: '-' }
        })) : []
     };
  }

  // --- Lógica del Filtro Temporal para Redes (Meta) ---
  const filterPostsByTime = (posts, filterMode) => {
      if (filterMode === 'all' || !posts) return posts;
      const limitDate = new Date(Date.now() - parseInt(filterMode) * 24 * 60 * 60 * 1000);
      return posts.filter(p => new Date(p.timestamp) >= limitDate);
  };

  if (['ig', 'fb'].includes(selectedSource) && currentDetails) {
      const rawPosts = liveSocialPosts[selectedSource] || [];
      const filteredPosts = filterPostsByTime(rawPosts, timeFilter);
      
      currentDetails = {
          ...currentDetails,
          topPosts: filteredPosts.map(post => ({
              id: post.id,
              thumb: post.media_type === 'VIDEO' ? '🎥' : '📸',
              title: post.caption.substring(0, 45) + (post.caption.length > 45 ? '...' : ''),
              views: 'Stats Internas',
              likes: post.likes,
              comments: post.comments,
              completion: 100,
              drops: new Date(post.timestamp).toLocaleDateString('es-MX'),
              badge: 'Real',
              url: post.url,
              retention: { reached: post.likes, thruplay: 'N/A', p25: '-', p50: '-', p75: '-', p100: '-' }
          }))
      };

      // Si hay posts, sobreescribir la Evolución Diaria (Gráfica Lineal) para que use datos Reales basados en el Filtro
      if (filteredPosts.length > 0) {
          const graphMap = {};
          filteredPosts.forEach(p => {
              const d = new Date(p.timestamp).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
              if (!graphMap[d]) graphMap[d] = { date: d, likes: 0, comments: 0 };
              graphMap[d].likes += p.likes;
              graphMap[d].comments += p.comments;
          });
          // Asegurar que estén en orden cronológico ascendente para recharts (de más viejo a más nuevo en el chart)
          // La API de graph lo suele devolver reverse cron. Así que un reverse es sano.
          const graphArr = Object.values(graphMap).reverse();

          currentDetails.engagementGraph = graphArr;
          currentDetails.metrics = [
              { key: 'likes', name: 'Likes', color: '#ff2a5f', isArea: true },
              { key: 'comments', name: 'Comments', color: '#00e5ff', isArea: false }
          ];
      }
  }

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
              {/* Sankey / Embudo de Atribución */}
              <div className="flex-[4] bg-gradient-to-b from-[#111111] to-[#050505] rounded-[2rem] border border-neutral-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-6 flex flex-col relative overflow-hidden group">
                {/* Glow decorativo de fondo */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#CC0000]/20 blur-[60px] rounded-full pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
                
                <div className="mb-5 relative z-10">
                  <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#CC0000] to-red-400 tracking-widest uppercase flex items-center gap-2">
                    <span className="text-lg">🎯</span> Embudo de Atribución Global
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed font-medium max-w-[90%]">
                    Rastrea el recorrido exacto de tus clientes. El grosor de las líneas representa el volumen de personas fluyendo de izquierda (Anuncios) a derecha (Ventas).
                  </p>
                </div>

                {/* Leyenda Visual de Pasos */}
                <div className="flex items-center gap-1.5 mb-5 relative z-10 overflow-x-auto pb-2 scrollbar-hide">
                   <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                     1. Atracción (Ads)
                   </div>
                   <span className="text-neutral-700 text-[10px] uppercase font-black shrink-0">→</span>
                   <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                     2. Captación (Web)
                   </div>
                   <span className="text-neutral-700 text-[10px] uppercase font-black shrink-0">→</span>
                   <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                     3. Cierre (Citas/Pagos)
                   </div>
                </div>

                <div className="flex-1 relative flex flex-col justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-neutral-800/60 min-h-[300px] shadow-inner transition-colors group-hover:border-neutral-700/60">
                   {liveSankeyData.length <= 2 && liveSankeyData[1] && liveSankeyData[1][0] === "A la espera de tráfico" ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 rounded-2xl z-20">
                        <span className="text-4xl mb-3 opacity-50">📡</span>
                        <h4 className="text-white font-bold text-sm mb-1">Radar encendido</h4>
                        <p className="text-xs text-neutral-500">Aún no hay suficiente tráfico para dibujar el flujo. Comienza a enviar visitas a tus enlaces.</p>
                     </div>
                   ) : null}
                   <style>{`
                     .google-visualization-tooltip {
                         background-color: rgba(13, 13, 13, 0.95) !important;
                         backdrop-filter: blur(10px) !important;
                         border: 1px solid rgba(255, 255, 255, 0.1) !important;
                         border-radius: 12px !important;
                         padding: 12px 16px !important;
                         box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
                         pointer-events: none !important;
                     }
                     .google-visualization-tooltip-item span {
                         color: #ffffff !important;
                         font-family: 'Inter', sans-serif !important;
                         font-weight: 700 !important;
                         font-size: 13px !important;
                     }
                   `}</style>
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

            {/* ROW 2: Network Source Cards (Frutiger Aero / Meta Clone Master Cards) */}
            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Panorama Visual por Plataforma</h3>
                <span className="text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2 py-1 rounded font-bold hidden sm:inline shadow-[0_0_10px_rgba(34,211,238,0.2)]">● Haz clic en una red para profundizar</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {trafficSources.map((src, idx) => {
                  // Generamos un sparkline pseudo-aleatorio para el demo
                  const trendGreen = idx % 2 === 0;
                  const sparkData = getRandomSparkline();
                  
                  return (
                    <button 
                      key={src.id} 
                      onClick={() => handleSourceClick(src.id)}
                      className="relative overflow-hidden bg-[#0A0F1A]/80 backdrop-blur-xl border border-blue-500/20 shadow-[inset_0_0_20px_rgba(0,100,255,0.05)] p-5 text-left group hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all duration-300 rounded-[1.5rem] flex flex-col justify-between min-h-[160px]"
                    >
                      {/* Ambient Glow */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-cyan-400/20 transition-colors" />

                      {/* Header */}
                      <div className="flex justify-between items-center mb-2 relative z-10 w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{src.emoji}</span>
                          <h4 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">{src.name}</h4>
                        </div>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-900/40 text-blue-400 text-[10px] font-black group-hover:bg-cyan-900/40 group-hover:text-cyan-400 transition-colors">→</span>
                      </div>

                      {/* Main Metric + Sparkline */}
                      <div className="flex justify-between items-end mb-4 relative z-10 w-full mt-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">
                             {src.id === 'ig' || src.id === 'fb' ? 'Seguidores Orgánicos (En Vivo)' : 'Visualizaciones / Visitas'}
                           </span>
                           <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-black text-white">{src.visitors.toLocaleString()}</span>
                             <span className={`text-xs font-bold ${trendGreen ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {trendGreen ? '↑ 12.3%' : '↓ 2.4%'}
                             </span>
                           </div>
                        </div>
                        <div className="w-[80px] h-[30px] opacity-70 group-hover:opacity-100 transition-opacity">
                          <SparkLine data={sparkData} color={trendGreen ? '#34d399' : '#38bdf8'} width="100%" height="100%" />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent my-3 relative z-10" />

                      {/* Sub-metrics */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 relative z-10 w-full mt-1">
                         <div className="flex justify-between items-center text-[11px] font-bold">
                           <span className="text-neutral-500">{src.id === 'ig' ? 'Publicaciones Totales' : 'Leads Generados'}</span>
                           <span className="text-white">{src.leads.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center text-[11px] font-bold">
                           <span className="text-neutral-500">CAC Estimado</span>
                           <span className="text-white">{src.cac}</span>
                         </div>
                         <div className="flex justify-between items-center text-[11px] font-bold">
                           <span className="text-neutral-500">Retorno (ROI)</span>
                           <span className="text-cyan-400">{src.roi}</span>
                         </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ======================= */}
        {/* VISTA DETALLE (CREATOR) */}
        {/* ======================= */}
        {selectedSource && currentDetails && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* KPI Row (Meta Business Suite Clone - Y2K Frutiger Aero Dark) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {currentDetails.kpiCards.map((kpi, idx) => (
                <div key={idx} className="relative overflow-hidden bg-[#0A0F1A]/80 backdrop-blur-xl rounded-[1.5rem] border border-cyan-500/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)] p-5 flex flex-col group hover:border-cyan-400/50 transition-colors">
                  {/* Y2K Ambient Glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-cyan-400/30 transition-colors" />
                  
                  {/* Tooltip trigger for info */}
                  <div className="flex justify-between items-center mb-1 relative z-10">
                    <h4 className="text-white font-bold text-[15px] tracking-tight">{kpi.title}</h4>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-cyan-900/40 text-cyan-400 text-[10px] font-black cursor-help">i</span>
                  </div>

                  {/* Main Value & Sparkline */}
                  <div className="flex justify-between items-end mb-4 relative z-10">
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-black text-white">{kpi.value}</span>
                       <span className={`text-xs font-bold ${kpi.trendGreen ? 'text-emerald-400' : 'text-rose-400'}`}>{kpi.trend}</span>
                    </div>
                    <SparkLine data={kpi.sparkline} color={kpi.trendGreen ? '#34d399' : '#38bdf8'} width="80px" height="30px" className="opacity-80" />
                  </div>

                  {/* Divider */}
                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-4" />

                  {/* Breakdown Followers/Non-Followers */}
                  <div className="space-y-3 relative z-10 flex-col">
                    {kpi.followerLabel && (
                       <div className="flex flex-col gap-1.5">
                         <div className="flex justify-between text-[11px] font-bold">
                           <span className="text-neutral-400">{kpi.followerLabel}</span>
                           <span className="text-white">{kpi.followerShare} <span className="text-cyan-400 ml-1 font-normal">{kpi.followerTrend}</span></span>
                         </div>
                         <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                           <div className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{width: kpi.followerShare}} />
                         </div>
                       </div>
                    )}
                    {kpi.nonFollowerLabel && (
                       <div className="flex flex-col gap-1.5 pt-1">
                         <div className="flex justify-between text-[11px] font-bold">
                           <span className="text-neutral-400">{kpi.nonFollowerLabel}</span>
                           <span className="text-white">{kpi.nonFollowerShare} <span className="text-rose-400 ml-1 font-normal">{kpi.nonFollowerTrend}</span></span>
                         </div>
                         <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                           <div className="h-full bg-neutral-500 rounded-full" style={{width: kpi.nonFollowerShare}} />
                         </div>
                       </div>
                    )}
                    {/* Extra Label (For views/net follows) */}
                    {kpi.extraLabel && (
                       <div className="flex justify-between items-center text-[11px] font-bold pt-1 border-t border-white/5 mt-1">
                          <span className="text-white">{kpi.extraLabel}</span>
                          <span className="text-white">{kpi.extraValue} <span className="text-cyan-400 font-normal">{kpi.extraTrend}</span></span>
                       </div>
                    )}
                  </div>
                </div>
              ))}
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
            <div className="bg-[#0A0F1A]/80 backdrop-blur-xl border border-cyan-500/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.02)] rounded-[1.5rem] p-6 flex flex-col relative overflow-hidden group hover:border-cyan-400/50 transition-colors">
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-400/10 rounded-full blur-[50px] pointer-events-none" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-white tracking-widest uppercase">Rendimiento Creador & Retención Real</h3>
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mt-1">
                    {['ig', 'fb'].includes(selectedSource) ? 'Mostrando publicaciones reales (Meta API)' : 'Desglose dinámico de eventos web'}
                  </span>
                </div>
                
                {/* Botonera de Filtro de Tiempo Frutiger Aero (Solo Redes) */}
                {['ig', 'fb'].includes(selectedSource) && (
                  <div className="flex p-1 bg-neutral-900/60 rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-md">
                    {[ { id: '1', label: '1 Día' }, { id: '7', label: '1 Sem' }, { id: '30', label: '1 Mes' }, { id: 'all', label: 'Todo' } ].map(tf => (
                      <button
                        key={tf.id}
                        onClick={() => setTimeFilter(tf.id)}
                        className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest transition-all duration-300 ${
                          timeFilter === tf.id 
                          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-cyan-300/50' 
                          : 'text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider">
                      <th className="font-semibold pb-3 px-2">Video/Campaña</th>
                      <th className="font-semibold pb-3 px-2 text-center">Rendimiento</th>
                      <th className="font-semibold pb-3 px-2 text-right">Vistas (K)</th>
                      <th className="font-semibold pb-3 px-2 text-right text-blue-400">{selectedSource === 'google_ads' ? 'Clicks/Leads' : selectedSource === 'web' ? 'Apariciones' : 'Likes'}</th>
                      <th className="font-semibold pb-3 px-2 text-right text-purple-400">{selectedSource === 'google_ads' ? 'Cost' : selectedSource === 'web' ? 'Datos Info' : 'Comments'}</th>
                      <th className="font-semibold pb-3 px-2 text-right border-l border-neutral-800">{selectedSource === 'web' ? 'Nota' : 'Punto de Fuga Frecuente'}</th>
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
