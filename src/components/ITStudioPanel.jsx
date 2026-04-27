import React, { useState, useEffect } from 'react';
import DBStudioPanel from './DBStudioPanel';
import CeoEstudioPanel from './CeoEstudioPanel';
import PanelMaestroPanel from './PanelMaestroPanel';
import SqlAtaquesPanel from './SqlAtaquesPanel';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ITStudioPanel({ adminProfile, activeTabInitial = 'db' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(activeTabInitial);

    // Permitir deep linking si es necesario
    useEffect(() => {
        if (location.pathname.includes('/admin/it/db')) setActiveTab('db');
        else if (location.pathname.includes('/admin/it/ceo')) setActiveTab('ceo');
        else if (location.pathname.includes('/admin/it/maestro')) setActiveTab('maestro');
        else if (location.pathname.includes('/admin/it/sql')) setActiveTab('sql');
    }, [location.pathname]);

    // Lógica de Permisos de roles para ver pestañas
    const username = adminProfile?.username?.toLowerCase() || '';
    const isSuperAdmin = adminProfile?.is_superadmin === true;
    
    // JareG, Godzilla_admin, Dani y Oscar ven absolutamente todo (incluyendo DB, Master, SQL)
    const isTechAdmin = isSuperAdmin || username === 'godzilla_admin' || username === 'jareg' || ['dani', 'oscar'].includes(username); 
    
    // Alex es un CEO de contenido, pero no ve las bases de datos técnicas
    const isCEO = isTechAdmin || ['alex'].includes(username);
    
    const isEditor = adminProfile?.role === 'admin' || isCEO || ['judith'].includes(username);

    const canSeeDBEstudio    = isTechAdmin;
    const canSeePanelMaestro = isTechAdmin;
    const canSeeSqlAtaques   = isTechAdmin;
    const canSeeCeoEstudio   = isEditor;

    const tabs = [
        ...(canSeeDBEstudio ? [{ id: 'db', label: '🗄️ DB Studio', color: 'text-[#00ff88]', border: 'border-[#00ff88]', bg: 'bg-[#00ff88]' }] : []),
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
                {activeTab === 'ceo' && canSeeCeoEstudio && <CeoEstudioPanel adminProfile={adminProfile} />}
                {activeTab === 'maestro' && canSeePanelMaestro && <PanelMaestroPanel adminProfile={adminProfile} />}
                {activeTab === 'sql' && canSeeSqlAtaques && <SqlAtaquesPanel adminProfile={adminProfile} />}
            </div>
        </div>
    );
}
