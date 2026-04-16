import React from 'react';

export default function PanelMaestroPanel({ adminProfile }) {
  return (
    <div className="flex-1 flex flex-col p-6 bg-gradient-to-br from-black via-neutral-950 to-amber-950/20 text-white overflow-y-auto">
      <div className="mb-8 border-b border-amber-500/30 pb-6">
        <h2 className="text-3xl font-black tracking-widest text-[#fbbf24] drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] flex items-center gap-3">
          <span>👑</span> PANEL MAESTRO DE EQUIPO
        </h2>
        <p className="text-sm text-amber-200/50 mt-2 tracking-wide">Visión General Ejecutiva y Control de Operaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Empleados Activos', value: '14', trend: '+2', icon: '👤' },
          { label: 'Tareas Atrasadas', value: '3', trend: '-1', icon: '⚠️' },
          { label: 'Eficiencia Global', value: '94%', trend: '+1.2%', icon: '📈' },
          { label: 'Ingreso Estimado Mensual', value: '$45,200', trend: '+12%', icon: '💰' },
        ].map(stat => (
          <div key={stat.label} className="bg-neutral-900/50 backdrop-blur-md border border-amber-500/20 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-amber-500/50 transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded bg-black/50 border ${stat.trend.startsWith('+') ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-xs text-amber-100/60 font-bold uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black mt-1 text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-neutral-900/40 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 min-h-[300px]">
          <h3 className="text-lg font-bold text-amber-400 mb-4 tracking-widest">Actividad del Equipo (Última Semana)</h3>
          <div className="flex-1 flex items-center justify-center h-[200px] border border-dashed border-amber-500/20 rounded-xl bg-black/30">
            <p className="text-neutral-500 font-mono text-xs">Módulo Gráfico Interactivo en Construcción...</p>
          </div>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-amber-400 mb-4 tracking-widest">Acceso Rápido</h3>
          <div className="space-y-3">
            {['Gestionar Permisos', 'Reporte Financiero', 'Auditoría de Acciones'].map(btn => (
               <button key={btn} className="w-full py-3 px-4 bg-black/40 border border-amber-500/30 text-amber-100 font-bold text-sm rounded-xl hover:bg-amber-500 hover:text-black transition-all text-left">
                  {btn} →
               </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
