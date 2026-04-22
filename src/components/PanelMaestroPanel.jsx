import React, { useState, useEffect } from 'react';

const API = import.meta.env.DEV ? 'http://localhost:3000' : '';

export default function PanelMaestroPanel({ adminProfile }) {
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const [masterPass, setMasterPass] = useState('');

    // Estado para Crear Usuario
    const [showCreate, setShowCreate] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('admin');

    const usernameStr = adminProfile?.username?.toLowerCase() || '';
    const isSuperAdmin = adminProfile?.is_superadmin === true;
    const canManageUsers = isSuperAdmin || adminProfile?.role === 'admin' || ['jareg', 'oscar', 'godzilla_admin', 'dani'].includes(usernameStr);

    const fetchTeamData = async () => {
        setLoadingTeam(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
                setLogs(data.logs);
            }
        } catch (e) {
            console.error('Error cargando equipo', e);
        }
        setLoadingTeam(false);
    };

    useEffect(() => {
        if (canManageUsers) {
            fetchTeamData();
        }
    }, [canManageUsers]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if(!window.confirm("⚠️ ¿Confirmas la adición de un nuevo operario al sistema central?")) return;

        if (!masterPass) return alert("Se requiere tu Contraseña Maestra");
        setLoadingTeam(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    superadminPassword: masterPass, 
                    newUsername, 
                    newPassword, 
                    isSuperadmin: newRole === 'superadmin',
                    role: newRole
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Usuario creado');
                setShowCreate(false);
                setNewUsername('');
                setNewPassword('');
                setNewRole('admin');
                fetchTeamData();
            } else {
                alert(data.message || 'Error al crear');
            }
        } catch (e) {
            alert('Error de conexión');
        }
        setLoadingTeam(false);
    };

    const handleDeleteUser = async (targetId) => {
        if(!window.confirm("⚠️ PELIGRO: ¿Estás seguro de ELIMINAR permanentemente a este usuario? Esto destruirá su cuenta.")) return;
        
        const pass = prompt('Por seguridad, ingresa tu Contraseña Maestra para ELIMINAR este usuario:');
        if (!pass) return;

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users/${targetId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ superadminPassword: pass })
            });
            const data = await res.json();
            if (data.success) {
                alert('Usuario eliminado');
                fetchTeamData();
            } else {
                alert(data.message || 'Error al eliminar');
            }
        } catch (e) {
            alert('Error en conexión');
        }
    };

    const handleResetPassword = async (targetId, currentUsername) => {
        const pass = prompt(`Estás a punto de reescribir la contraseña de ${currentUsername}.\nIngresa tu Contraseña Maestra actual para autorizar:`);
        if (!pass) return;

        const newPass = prompt(`Ingresa la NUEVA CONTRASEÑA para ${currentUsername}:`);
        if (!newPass) return;

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ superadminPassword: pass, newPassword: newPass, username: currentUsername })
            });
            const data = await res.json();
            if (data.success) {
                alert('Contraseña actualizada correctamente.');
                fetchTeamData();
            } else {
                alert(data.message || 'Error al actualizar');
            }
        } catch (e) {
            alert('Error en conexión');
        }
    };

    const handleUpdateRole = async (targetId, currentUsername, currentRole, newRole) => {
        if (currentRole === newRole) return;
        const actionText = newRole === 'superadmin' ? 'ASCENDER a 👑 SuperAdmin' : (newRole === 'admin' ? 'ASIGNAR a Editor/Admin' : 'DEGRADAR a Community Manager');
        const pass = prompt(`Estás a punto de ${actionText} a ${currentUsername}.\nIngresa tu Contraseña Maestra actual para autorizar el nombramiento:`);
        if (!pass) return fetchTeamData();

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ superadminPassword: pass, isSuperadmin: newRole === 'superadmin', role: newRole })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Jerarquía actualizada exitosamente.`);
                fetchTeamData();
            } else {
                alert(data.message || 'Error al actualizar jerarquía');
                fetchTeamData();
            }
        } catch (e) {
            alert('Error en conexión');
            fetchTeamData();
        }
    };

    if (!canManageUsers) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-[#050505] text-white">
                <div className="text-center space-y-4 max-w-md">
                    <span className="text-6xl mx-auto block mb-6">⛔</span>
                    <h2 className="text-2xl font-black text-rose-500 uppercase tracking-widest">Acceso Restringido</h2>
                    <p className="text-neutral-400 font-bold text-sm">No posees la jerarquía necesaria para visualizar el Panel Maestro y auditar al equipo.</p>
                </div>
            </div>
        );
    }

    const superAdminsCount = users.filter(u => u.role === 'superadmin' || u.is_superadmin).length;
    const cmsCount = users.filter(u => u.role === 'cm').length;

    return (
        <div className="flex-1 flex flex-col p-6 md:p-10 bg-gradient-to-br from-black via-neutral-950 to-amber-950/20 text-white overflow-y-auto">
            <div className="mb-8 border-b border-amber-500/30 pb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-widest text-[#fbbf24] drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] flex items-center gap-3">
                        <span>👑</span> PANEL MAESTRO DE EQUIPO
                    </h2>
                    <p className="text-sm text-amber-200/50 mt-2 tracking-wide">Visión General Ejecutiva y Control de Operaciones.</p>
                </div>
                <button 
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-full font-black text-xs transition shadow-[0_4px_15px_rgba(245,158,11,0.3)] hidden md:block"
                >
                    {showCreate ? 'Cancelar Edición' : '➕ Añadir Nuevo Usuario'}
                </button>
            </div>

            {/* Métricas Reales Dinámicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Cuentas Activas', value: users.length, icon: '👥' },
                    { label: 'Super Administradores', value: superAdminsCount, icon: '👑' },
                    { label: 'Community Managers', value: cmsCount, icon: '📱' },
                    { label: 'Acciones Auditadas', value: logs.length, icon: '👁️' },
                ].map(stat => (
                    <div key={stat.label} className="bg-neutral-900/50 backdrop-blur-md border border-amber-500/20 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-amber-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-2xl">{stat.icon}</span>
                        </div>
                        <p className="text-[10px] text-amber-100/60 font-bold uppercase tracking-widest">{stat.label}</p>
                        <p className="text-3xl font-black mt-1 text-white">{loadingTeam ? '-' : stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Panel Principal */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Gestión de Equipo: Tabla y Creación */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Botón en Mobile */}
                    <button 
                        onClick={() => setShowCreate(!showCreate)}
                        className="w-full mb-4 bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl font-black text-xs transition shadow-[0_4px_15px_rgba(245,158,11,0.3)] md:hidden"
                    >
                        {showCreate ? 'Cerrar Panel' : '➕ Añadir Nuevo Usuario'}
                    </button>

                    {showCreate && (
                        <form onSubmit={handleCreateUser} className="bg-neutral-900/80 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-2xl">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                            <h3 className="text-sm font-black text-amber-400 mb-4 uppercase tracking-widest flex items-center gap-2"><span>🛡️</span> Registrar Operario</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Nombre / Usuario</label>
                                    <input type="text" required value={newUsername} onChange={e=>setNewUsername(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500 shadow-inner"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Contraseña</label>
                                    <input type="text" required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500 shadow-inner"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Jerarquía Autorizada</label>
                                    <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500 appearance-none cursor-pointer shadow-inner">
                                        <option value="superadmin">👑 SuperAdmin</option>
                                        <option value="admin">📝 Editor/Admin</option>
                                        <option value="cm">📱 Community Manager</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-neutral-800 pt-5 mt-2 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                                <div className="flex flex-col gap-1 w-full md:w-1/2">
                                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Protocolo de Seguridad: Ingresa tu Pass Maestra</label>
                                    <input type="password" required value={masterPass} onChange={e=>setMasterPass(e.target.value)} placeholder="Firma de autorización..." className="w-full bg-black border border-rose-500/40 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-rose-500 focus:shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all"/>
                                </div>
                                <button type="submit" disabled={loadingTeam} className="w-full md:w-auto bg-amber-500 text-black px-8 py-3 rounded-xl font-black text-sm hover:scale-105 transition shadow-lg active:scale-95 disabled:opacity-50">Autenticar y Crear</button>
                            </div>
                        </form>
                    )}

                    <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="px-6 py-4 border-b border-neutral-800 bg-[#0d0d0d] flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-300 tracking-widest uppercase">Directorio de Usuarios Activos</h3>
                            <div className="text-[10px] font-bold text-neutral-500 bg-neutral-800/50 px-2.5 py-1 rounded-full uppercase border border-neutral-700/50">Base de Datos Viva</div>
                        </div>
                        {loadingTeam && users.length === 0 ? <p className="p-8 text-neutral-500 text-center text-sm font-bold tracking-widest uppercase">Sincronizando registros...</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#0a0a0a] text-[10px] text-amber-500/60 uppercase font-black tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">ID / Operario</th>
                                            <th className="px-6 py-4">Nivel de Acceso</th>
                                            <th className="px-6 py-4 text-center">Estado de Enlace</th>
                                            <th className="px-6 py-4 text-right">Controles de Fuerza</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/60 font-medium">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-neutral-800/20 transition-colors group">
                                                <td className="px-6 py-4 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-black border border-neutral-800 overflow-hidden shrink-0 shadow-inner">
                                                        {u.photo_url ? <img src={u.photo_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-sm bg-neutral-900">🦖</div>}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-white block text-sm">{u.username}</span>
                                                        <span className="text-[10px] text-neutral-500 font-mono">UID: #{u.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.username === 'JareG' && adminProfile?.id !== 2 ? (
                                                        <span className="text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded text-[10px] uppercase w-[120px] inline-flex items-center justify-center shrink-0 border border-amber-500/30"><span className="text-xs mr-1 leading-none">👑</span> Fundador</span>
                                                    ) : (
                                                        <select 
                                                            value={u.role || (u.is_superadmin ? 'superadmin' : 'admin')}
                                                            onChange={(e) => handleUpdateRole(u.id, u.username, u.role || (u.is_superadmin ? 'superadmin' : 'admin'), e.target.value)}
                                                            disabled={u.id === adminProfile?.id || (u.username === 'JareG' && adminProfile?.id !== 2)}
                                                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded uppercase outline-none cursor-pointer border transition shadow-sm ${u.role === 'superadmin' || u.is_superadmin ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 focus:border-amber-400' : (u.role === 'cm' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 focus:border-sky-400' : 'bg-black text-gray-300 border-neutral-700 hover:border-neutral-500 focus:border-neutral-500')}`}
                                                        >
                                                            <option value="superadmin">👑 SuperAdmin</option>
                                                            <option value="admin">📝 Editor Admin</option>
                                                            <option value="cm">📱 CM</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full text-green-500 font-black text-[10px] uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse"></span> Activo
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button onClick={() => handleResetPassword(u.id, u.username)} className="px-3 py-1.5 bg-black hover:bg-neutral-800 border border-neutral-800 hover:border-blue-500 text-blue-400 rounded-lg font-bold text-[10px] uppercase tracking-widest transition shadow-sm">Reset Pass</button>
                                                    {u.id !== adminProfile?.id && (u.username !== 'JareG' || adminProfile?.id === 2) && usernameStr !== 'dani' && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition shadow-sm">Eliminar</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Logs de Auditoría */}
                <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
                    <div className="px-6 py-5 border-b border-neutral-800 bg-[#0d0d0d] flex items-center justify-between sticky top-0 shrink-0">
                        <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><span>🛡️</span> Radar de Auditoría</h3>
                        <div className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded text-[10px] font-black">{logs.length} Eventos</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {logs.length === 0 ? <p className="text-center py-10 text-neutral-600 text-sm font-bold uppercase tracking-widest">Registros limpios.</p> : (
                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-800 before:to-transparent">
                                {logs.map(l => (
                                    <div key={l.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-neutral-700 bg-[#0a0a0a] text-neutral-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 text-[9px] group-hover:border-amber-500 transition-colors">
                                           ●
                                        </div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-black border border-neutral-800 shadow-sm group-hover:border-neutral-600 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-black text-amber-100 text-[11px] truncate block pr-2">{l.username || 'System'}</span>
                                                <time className="text-[9px] uppercase tracking-widest font-mono text-neutral-500 shrink-0">{new Date(l.created_at).toLocaleString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</time>
                                            </div>
                                            <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider mb-1">{l.action}</div>
                                            <div className="text-[10px] font-medium text-neutral-400 line-clamp-2 break-all">{JSON.stringify(l.details)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
