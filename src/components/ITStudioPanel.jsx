import React, { useState, useEffect } from 'react';
import DBStudioPanel from './DBStudioPanel';
import CeoEstudioPanel from './CeoEstudioPanel';
import PanelMaestroPanel from './PanelMaestroPanel';
import SqlAtaquesPanel from './SqlAtaquesPanel';
import AbordajeLeadsPanel from './AbordajeLeadsPanel';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ITStudioPanel({ adminProfile, activeTabInitial = 'db' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(activeTabInitial);

    // Lógica de Permisos de roles para ver pestañas
    const canSeeDBEstudio    = true;
    const canSeePanelMaestro = true;
    const canSeeSqlAtaques   = true;
    const canSeeCeoEstudio   = true;

    // Permitir deep linking si es necesario
    useEffect(() => {
        let reqTab = 'db';
        if (location.pathname.includes('/admin/it/db')) reqTab = 'db';
        else if (location.pathname.includes('/admin/it/leads')) reqTab = 'leads';
        else if (location.pathname.includes('/admin/it/ceo')) reqTab = 'ceo';
        else if (location.pathname.includes('/admin/it/maestro')) reqTab = 'maestro';
        else if (location.pathname.includes('/admin/it/sql')) reqTab = 'sql';
        
        const canSeeReq = (reqTab === 'db' && canSeeDBEstudio) ||
                          (reqTab === 'ceo' && canSeeCeoEstudio) ||
                          (reqTab === 'maestro' && canSeePanelMaestro) ||
                          (reqTab === 'sql' && canSeeSqlAtaques) ||
                          (reqTab === 'leads' && canSeeDBEstudio); // Tech Admin solo
                          
        if (canSeeReq) {
            setActiveTab(reqTab);
        } else {
            if (canSeeDBEstudio) { setActiveTab('db'); navigate('/admin/it/db', { replace: true }); }
            else if (canSeeCeoEstudio) { setActiveTab('ceo'); navigate('/admin/it/ceo', { replace: true }); }
            else if (canSeePanelMaestro) { setActiveTab('maestro'); navigate('/admin/it/maestro', { replace: true }); }
            else if (canSeeSqlAtaques) { setActiveTab('sql'); navigate('/admin/it/sql', { replace: true }); }
        }
    }, [location.pathname, canSeeDBEstudio, canSeeCeoEstudio, canSeePanelMaestro, canSeeSqlAtaques, navigate]);

    const tabs = [
        ...(canSeeDBEstudio ? [{ id: 'db', label: '🗄️ DB Studio', color: 'text-[#00ff88]', border: 'border-[#00ff88]', bg: 'bg-[#00ff88]' }] : []),
        ...(canSeeDBEstudio ? [{ id: 'leads', label: '🎯 Leads Abordaje', color: 'text-[#CC0000]', border: 'border-[#CC0000]', bg: 'bg-[#CC0000]' }] : []),
        ...(canSeeCeoEstudio ? [{ id: 'ceo', label: '👑 CEO Estudio', color: 'text-[#d946ef]', border: 'border-[#d946ef]', bg: 'bg-[#d946ef]' }] : []),
        ...(canSeePanelMaestro ? [{ id: 'maestro', label: '🏛️ Panel Maestro', color: 'text-[#fbbf24]', border: 'border-[#fbbf24]', bg: 'bg-[#fbbf24]' }] : []),
        ...(canSeeSqlAtaques ? [{ id: 'sql', label: '🛡️ Ataques SQL', color: 'text-[#ef4444]', border: 'border-[#ef4444]', bg: 'bg-[#ef4444]' }] : [])
    ];

    if (tabs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
                <span className="text-6xl mb-4">🦖</span>
                <h2 className="text-xl font-bold">Acceso Denegado</h2>
                <p className="text-sm mt-2">No tienes permisos para ver el Centro Técnico.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#050505]">
            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#CC0000]/50 hover:[&::-webkit-scrollbar-thumb]:bg-[#CC0000]/80 [&::-webkit-scrollbar-track]:bg-transparent">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            navigate(`/admin/it/${tab.id}`);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-sm border ${
                            activeTab === tab.id 
                                ? `bg-neutral-900 ${tab.color} ${tab.border}/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]` 
                                : 'bg-black/40 text-neutral-400 hover:text-white hover:bg-neutral-800 border-transparent'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto w-full relative">
                {activeTab === 'db' && canSeeDBEstudio && <DBStudioPanel adminProfile={adminProfile} />}
                {activeTab === 'leads' && canSeeDBEstudio && <AbordajeLeadsPanel adminProfile={adminProfile} />}
                {activeTab === 'ceo' && canSeeCeoEstudio && <CeoEstudioPanel adminProfile={adminProfile} />}
                {activeTab === 'maestro' && canSeePanelMaestro && <PanelMaestroPanel adminProfile={adminProfile} />}
                {activeTab === 'sql' && canSeeSqlAtaques && <SqlAtaquesPanel adminProfile={adminProfile} />}
            </div>
        </div>
    );
}
