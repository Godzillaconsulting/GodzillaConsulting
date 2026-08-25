import React, { useState, useEffect } from 'react';

export default function SqlAtaquesPanel({ adminProfile }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total24h: 0, ipsBlocked: 0, firewallLoad: 0 });

  useEffect(() => {
    // Polling en vivo hacia el WAF
    const fetchWafLogs = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch('/api/admin/waf/live', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setLogs(data.data.logs);
          setStats(data.data.stats);
        }
      } catch (err) {
        console.error("WAF Polling error", err);
      }
    };

    fetchWafLogs(); // Ejecutar inmediatamente
    const liveInterval = setInterval(fetchWafLogs, 4000); // Refrescar cada 4 segundos
    return () => clearInterval(liveInterval);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 bg-black text-red-500 font-mono overflow-y-auto">
      <div className="mb-6 flex justify-between items-end border-b border-red-900/50 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-widest text-[#ef4444] drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ef4444] text-[28px] select-none flex items-center justify-center animate-pulse">security</span> CENTRO DE MONITOREO WAF
          </h2>
          <p className="text-xs text-red-400 mt-1 uppercase tracking-widest">Ataques SQL y Prevención de Intrusiones</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-red-900/40 border border-red-500/50 rounded text-xs font-bold animate-pulse">ESTADO: ALERTA ROJA</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-neutral-900 border border-red-900/50 p-4 rounded-xl flex flex-col justify-center items-center shadow-[inset_0_0_20px_rgba(255,0,0,0.1)]">
          <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2">Ataques Bloqueados (En Vivo)</p>
          <p className="text-4xl font-black text-white">{stats.total24h.toLocaleString()}</p>
        </div>
        <div className="bg-neutral-900 border border-red-900/50 p-4 rounded-xl flex flex-col justify-center items-center shadow-[inset_0_0_20px_rgba(255,0,0,0.1)]">
           <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2">IPs Bloqueadas</p>
          <p className="text-4xl font-black text-white">{stats.ipsBlocked}</p>
        </div>
         <div className="bg-neutral-900 border border-red-900/50 p-4 rounded-xl flex flex-col justify-center items-center shadow-[inset_0_0_20px_rgba(255,0,0,0.1)]">
           <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2">Carga de Firewall</p>
          <p className="text-4xl font-black text-white">{stats.firewallLoad}%</p>
        </div>
      </div>

      <div className="flex-1 bg-black/60 border border-red-900/30 rounded-xl overflow-hidden flex flex-col relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20"></div>
        <div className="p-3 border-b border-red-900/50 bg-red-900/10">
          <p className="text-xs font-bold flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] animate-pulse">sensors</span> REGISTRO EN TIEMPO REAL</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {logs.map(log => (
            <div key={log.id} className="text-[11px] flex items-start gap-4 border-b border-red-900/30 pb-2">
              <span className="text-red-400/50 shrink-0">[{new Date(log.id).toLocaleTimeString()}]</span>
              <span className={`px-2 py-0.5 rounded text-black font-bold shrink-0 ${log.risk === 'Crítico' ? 'bg-red-500' : log.risk === 'Alto' ? 'bg-orange-500' : 'bg-yellow-500'}`}>{log.risk}</span>
              <span className="text-white shrink-0 w-24">{log.ip}</span>
              <span className="text-red-300 font-mono truncate" title={log.query}>{log.query}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-neutral-500 text-xs italic">Iniciando escaneo interceptor... (Ningún ataque reciente)</p>}
        </div>
      </div>
    </div>
  );
}
