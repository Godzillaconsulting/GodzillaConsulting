import React, { useState, useEffect } from 'react';

const API = import.meta.env.DEV ? 'http://localhost:3000' : '';

export default function AdminProfile({ profile, onProfileUpdate }) {
    const [subTab, setSubTab] = useState('personal'); // 'personal' | 'team'
    const [saving, setSaving] = useState(false);
    
    // --- Estado Personal ---
    const [username, setUsername] = useState(profile?.username || '');
    const [password, setPassword] = useState('');
    const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || '');
    const [personalMsg, setPersonalMsg] = useState({ text: '', type: '' });
    const [securityAlerts, setSecurityAlerts] = useState([]);

    // --- Estado de Tareas Personales (Live DB) ---
    const [allTasks, setAllTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchTasks = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API}/api/studio/tasks`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.tasks) {
                // Mapear de Postgres a la estructura UI
                const liveTasks = data.tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    deadline: t.generation_details?.deadline || 'Sin fecha',
                    source: t.creator_username || 'Sistema',
                    asignadoA: t.appointed_username || t.assigned_team || 'Equipo',
                    done: t.status === 'APPROVED',
                    why: t.description || 'Objetivo no especificado',
                    references: t.media_reference || '',
                    comments: t.generation_details?.technical_brief || ''
                }));
                setAllTasks(liveTasks);
                setMyTasks(liveTasks.filter(t => t.asignadoA?.toLowerCase() === profile?.username?.toLowerCase()));
            }
        } catch (e) {
            console.error('Error fetching tasks', e);
        }
    };

    const toggleTask = async (id) => {
        const tsk = allTasks.find(t => t.id === id);
        if(!tsk) return;
        const newStatus = tsk.done ? 'PENDING' : 'APPROVED';
        
        // Optimistic UI
        setAllTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
        setMyTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
        if (selectedTask && selectedTask.id === id) setSelectedTask(prev => ({...prev, done: !prev.done}));

        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${API}/api/studio/tasks/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
        } catch(e) {
            console.error('Error toggling status', e);
        }
    };

    // --- Estado de IT Bugs (Solo JareG/Dani) ---
    const [itBugs, setItBugs] = useState([]);
    const isIT = ['jareg', 'godzilla_admin', 'dani'].includes(profile?.username?.toLowerCase());

    const fetchBugs = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API}/api/bugs`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.bugs) setItBugs(data.bugs);
        } catch (e) {
            console.error('Error fetching bugs', e);
        }
    };

    const resolveBug = async (id, currentStatus) => {
        const token = localStorage.getItem('adminToken');
        try {
            await fetch(`${API}/api/bugs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ resolved: !currentStatus })
            });
            fetchBugs();
        } catch(e) {
            console.error('Error resolving bug', e);
        }
    };

    useEffect(() => {
        if (subTab === 'tasks') {
            fetchTasks();
            if (isIT) fetchBugs();
        }
    }, [subTab, isIT]);

    // --- Estado Equipo (SuperAdmin) ---
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const [masterPass, setMasterPass] = useState('');

    // Estado para Crear Usuario
    const [showCreate, setShowCreate] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('admin');

    useEffect(() => {
        if (profile) {
            setUsername(profile.username);
            setPhotoUrl(profile.photo_url || '');
        }
    }, [profile]);

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

    const canManageUsers = profile?.is_superadmin || profile?.role === 'admin' || ['jareg', 'oscar', 'godzilla_admin'].includes(profile?.username?.toLowerCase());

    useEffect(() => {
        if (subTab === 'team' && canManageUsers) {
            fetchTeamData();
        }
        if (subTab === 'personal' && canManageUsers) {
            fetchSecurityAlerts();
        }
    }, [subTab, profile, canManageUsers]);

    const fetchSecurityAlerts = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users/security-alerts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSecurityAlerts(data.alerts);
            }
        } catch (e) {
            console.error('Error fetching security alerts', e);
        }
    };

    const handleSavePersonal = async (e) => {
        e.preventDefault();
        if(!window.confirm("⚠️ ¿Estás totalmente seguro de aplicar los cambios a tu perfil maestro en la base de datos?")) return;
        
        setSaving(true);
        setPersonalMsg({ text: '', type: '' });
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/users/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password, photo_url: photoUrl })
            });
            const data = await res.json();
            if (data.success) {
                setPersonalMsg({ text: 'Perfil actualizado exitosamente.', type: 'success' });
                setPassword(''); // limpiar input
                if (onProfileUpdate) onProfileUpdate({ ...profile, username: data.newUsername, photo_url: photoUrl });
            } else {
                setPersonalMsg({ text: data.message || 'Error al guardar.', type: 'error' });
            }
        } catch (e) {
            setPersonalMsg({ text: 'Error de conexión.', type: 'error' });
        }
        setSaving(false);
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setSaving(true);
        setPersonalMsg({ text: 'Subiendo foto a la bóveda. No cierres...', type: '' });
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/media/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // REQUISITO DE SEGURIDAD
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                setPhotoUrl(data.url);
                setPersonalMsg({ text: 'Foto incrustada exitosamente. PRESIONA GUARDAR CAMBIOS.', type: 'success' });
            } else {
                setPersonalMsg({ text: data.error || 'Fallo de subida de seguridad.', type: 'error' });
            }
        } catch (err) {
            setPersonalMsg({ text: 'Falló la subida (Conexión)', type: 'error' });
        }
        setSaving(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if(!window.confirm("⚠️ ¿Confirmas la adición de un nuevo operario al sistema central?")) return;

        if (!masterPass) return alert("Se requiere tu Contraseña Maestra");
        setSaving(true);
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
        setSaving(false);
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
        if (!pass) return fetchTeamData(); // Restaurar select visual si cancela

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
                fetchTeamData(); // Restaurar select
            }
        } catch (e) {
            alert('Error en conexión');
            fetchTeamData();
        }
    };

    if (!profile) return <div className="p-10 flex justify-center"><p className="text-white">Cargando perfil...</p></div>;

    return (
        <div className="flex-1 flex flex-col bg-[#050505] overflow-y-auto">
            
            {/* Cabecera / Pestañas */}
            <div className="border-b border-neutral-800 bg-[#0d0d0d] px-8 pt-6 pb-0 flex gap-6">
                <button 
                    onClick={() => setSubTab('personal')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${subTab === 'personal' ? 'border-[#CC0000] text-white' : 'border-transparent text-neutral-500 hover:text-gray-300'}`}
                >
                    Mi Perfil Personal
                </button>
                <button 
                    onClick={() => setSubTab('tasks')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${subTab === 'tasks' ? 'border-sky-500 text-white' : 'border-transparent text-neutral-500 hover:text-gray-300'}`}
                >
                    ✅ Mis Tareas
                </button>
                {canManageUsers && (
                    <button 
                        onClick={() => setSubTab('team')}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${subTab === 'team' ? 'border-amber-500 text-white' : 'border-transparent text-neutral-500 hover:text-gray-300'}`}
                    >
                        👑 Panel Maestro de Equipo
                    </button>
                )}
            </div>

            <div className="p-8 max-w-5xl mx-auto w-full">
                {subTab === 'personal' && (
                    <div className="animate-in fade-in space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-white">Configuración de Perfil</h2>
                            <p className="text-sm text-neutral-400 mt-1">Edita tus credenciales de acceso al Admin Studio.</p>
                        </div>

                        <form onSubmit={handleSavePersonal} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 form-shadow">
                            
                            {/* Avatar Display */}
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl">🦖</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Foto de Perfil Oficial</label>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        disabled={saving}
                                        className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] outline-none transition file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700 file:cursor-pointer disabled:opacity-50"
                                    />
                                    <p className="text-[10px] text-neutral-500">Selecciona una imagen de tu computadora. Se subirá automáticamente y será encriptada.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre / Usuario</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:border-[#CC0000] outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nueva Contraseña</label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:border-[#CC0000] outline-none transition"
                                    />
                                    <p className="text-[10px] text-neutral-500">Déjalo en blanco para mantener la contraseña actual.</p>
                                </div>
                            </div>

                            {personalMsg.text && (
                                <div className={`p-4 rounded-xl text-sm font-bold border ${personalMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                    {personalMsg.text}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="bg-[#CC0000] hover:bg-red-600 text-white px-8 py-3 rounded-full font-black text-sm transition shadow-[0_4px_15px_rgba(204,0,0,0.4)] disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>

                        {/* Reporte de Intentos de Inyección (Solo SuperAdmins) */}
                        {canManageUsers && securityAlerts.length > 0 && (
                            <div className="mt-8 bg-red-950/20 border border-red-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(204,0,0,0.15)] animate-in fade-in slide-in-from-bottom-4">
                                <div className="px-6 py-4 border-b border-red-900/30 bg-[#CC0000]/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">🛡️</span>
                                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest">Reporte de Amenazas Detección de Intrusos</h3>
                                    </div>
                                    <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">{securityAlerts.length} Eventos</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-[#050505] text-xs text-red-500 font-black uppercase">
                                            <tr>
                                                <th className="px-6 py-4 border-b border-red-900/30">Fecha / Hora</th>
                                                <th className="px-6 py-4 border-b border-red-900/30">Intento de Payload</th>
                                                <th className="px-6 py-4 border-b border-red-900/30">IP Atacante</th>
                                                <th className="px-6 py-4 border-b border-red-900/30">Alerta</th>
                                                <th className="px-6 py-4 border-b border-red-900/30">Usuario Logeado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-900/20">
                                            {securityAlerts.map(alert => (
                                                <tr key={alert.id} className="hover:bg-red-900/10 transition">
                                                    <td className="px-6 py-3 text-neutral-400 text-xs font-mono">{new Date(alert.created_at).toLocaleString('es-MX')}</td>
                                                    <td className="px-6 py-3 font-mono text-xs text-red-300 max-w-[200px] truncate" title={alert.payload}>{alert.payload}</td>
                                                    <td className="px-6 py-3 font-mono text-rose-400 font-bold">{alert.ip_address}</td>
                                                    <td className="px-6 py-3 text-red-500 font-black text-[10px] uppercase tracking-widest">{alert.attempt_type}</td>
                                                    <td className="px-6 py-3 text-gray-300 font-bold">{alert.username}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {canManageUsers && securityAlerts.length === 0 && (
                            <div className="mt-8 bg-green-950/20 border border-green-500/30 rounded-2xl p-6 text-center animate-in fade-in">
                                <span className="text-2xl mb-2 block">✅</span>
                                <p className="text-green-500 text-sm font-bold uppercase tracking-widest">Sin amenazas de inyección SQL registradas</p>
                            </div>
                        )}
                    </div>
                )}
                {subTab === 'tasks' && (
                    <>
                    <div className="animate-in fade-in space-y-4 flex flex-col">
                        <div>
                            <h2 className="text-2xl font-black text-white">Tablero de Tareas</h2>
                            <p className="text-sm text-neutral-400 mt-1">Distribución y gestión detallada tipo Asana.</p>
                        </div>
                        
                        <div className="flex bg-[#050505] border border-neutral-800 rounded-2xl overflow-hidden h-[65vh] min-h-[500px] font-sans shadow-lg">
                            {/* PANE IZQUIERDO: LISTA */}
                            <div className="w-1/2 md:w-5/12 border-r border-neutral-800 flex flex-col bg-[#050505]">
                                {/* Toolbar Top Left */}
                                <div className="flex items-center px-4 py-3 border-b border-neutral-800 shrink-0">
                                    <button onClick={() => alert('Próximamente: Crear tarea desde aquí')} className="bg-[#CC0000] hover:bg-red-700 text-white rounded-md px-4 py-1.5 text-xs font-bold flex items-center shadow-md transition-all uppercase tracking-widest">
                                        <span className="mr-1 text-sm">+</span> Add Task

                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {/* Section Header */}
                                    <div className="px-4 py-3 flex items-center text-xs font-black uppercase tracking-widest text-neutral-500 mt-2 cursor-pointer hover:text-white transition">
                                        <span className="mr-2 text-[10px]">▼</span> My Tasks
                                    </div>
                                    <div className="flex flex-col mt-1">
                                        {myTasks.length === 0 ? (
                                           <p className="text-neutral-500 text-sm text-center py-6 font-bold uppercase tracking-widest">No hay tareas asignadas</p>
                                        ) : myTasks.map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => setSelectedTask(task)}
                                                className={`flex items-center border-b border-neutral-800/50 px-4 py-2.5 cursor-pointer hover:bg-neutral-900 transition-colors ${selectedTask?.id === task.id ? 'bg-neutral-900 border-l-2 border-l-[#CC0000]' : 'border-l-2 border-l-transparent'}`}
                                            >
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                                                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 cursor-pointer transition-all ${task.done ? 'bg-[#25c862] border-[#25c862] text-black shadow-[0_0_10px_rgba(37,200,98,0.5)]' : 'border-neutral-600 hover:border-[#CC0000]'}`}
                                                >
                                                    {task.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                </div>
                                                <div className={`flex-1 text-sm font-bold truncate ${task.done ? 'text-neutral-600 line-through' : 'text-gray-200'}`}>{task.title}</div>
                                                
                                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-black text-red-500 mr-3 shrink-0 uppercase border border-red-500/30" title={task.asignadoA}>
                                                    {task.asignadoA?.[0] || '?'}
                                                </div>
                                                
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 w-20 text-right truncate">
                                                    {task.deadline}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* PANE DERECHO: DETALLES */}
                            <div className="w-1/2 md:w-7/12 flex flex-col bg-[#0a0a0a]">
                                {selectedTask ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Top Action Bar */}
                                        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 shrink-0">
                                            <div className="flex items-center space-x-3 text-xs">
                                                <button 
                                                    onClick={() => {
                                                        toggleTask(selectedTask.id);
                                                        setSelectedTask({...selectedTask, done: !selectedTask.done});
                                                    }}
                                                    className={`border rounded-lg px-4 py-1.5 font-bold uppercase tracking-widest flex items-center transition-all ${selectedTask.done ? 'bg-[#25c862]/10 border-[#25c862]/30 text-[#25c862]' : 'border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white'}`}
                                                >
                                                    <span className={`mr-2 ${selectedTask.done ? 'text-[#25c862]':'text-neutral-500'}`}>✓</span> {selectedTask.done ? 'Completed' : 'Mark complete'}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                                            <div className="mb-8">
                                                <h1 className={`text-3xl font-black outline-none w-full bg-transparent ${selectedTask.done ? 'text-neutral-600 line-through' : 'text-white'}`}>
                                                    {selectedTask.title}
                                                </h1>
                                            </div>
                                            
                                            <div className="flex flex-col space-y-6 mb-8">
                                                <div className="flex items-center">
                                                    <div className="w-32 text-xs font-black uppercase tracking-widest text-neutral-500">Asignado a</div>
                                                    <div className="flex items-center text-sm font-bold text-gray-300">
                                                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] text-red-500 border border-red-500/30 uppercase mr-3">
                                                            {selectedTask.asignadoA?.[0] || '?'}
                                                        </div>
                                                        {selectedTask.asignadoA || 'Sin Asignar'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="w-32 text-xs font-black uppercase tracking-widest text-neutral-500">Cuándo</div>
                                                    <div className="flex items-center text-sm font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded border border-rose-500/20 uppercase tracking-widest">
                                                        {selectedTask.deadline}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col mt-6 gap-6">
                                                    <div>
                                                        <div className="text-[10px] font-black text-rose-500 mb-2 uppercase tracking-widest">¿Para qué?</div>
                                                        <div className="text-sm font-medium text-gray-300 bg-[#0d0d0d] p-4 rounded-xl border border-neutral-800 shadow-inner">
                                                            {selectedTask.why || 'Objetivo no especificado'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-rose-500 mb-2 uppercase tracking-widest">Referencias</div>
                                                        <div className="text-sm font-medium text-gray-300 bg-[#0d0d0d] p-4 rounded-xl border border-neutral-800 break-all shadow-inner">
                                                            {selectedTask.references ? <a href={selectedTask.references} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{selectedTask.references}</a> : <span className="text-neutral-600 italic">Ninguna referencia visual adjunta.</span>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-rose-500 mb-2 uppercase tracking-widest">Comentarios / Brief Técnico</div>
                                                        <div className="text-sm font-medium text-gray-300 flex-1 bg-black p-4 rounded-xl border border-neutral-800 min-h-[100px] whitespace-pre-wrap shadow-inner leading-relaxed">
                                                            {selectedTask.comments || <span className="text-neutral-600 italic">Sin instrucciones extra. Guíate con el "Qué" y "Para qué".</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 font-sans">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-neutral-800"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        <p className="text-sm font-bold uppercase tracking-widest">Selecciona una tarea para ver el brief</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {isIT && (
                        <div className="mt-12 animate-in fade-in space-y-4 flex flex-col pt-8 border-t border-neutral-800">
                            <div>
                                <h2 className="text-2xl font-black text-rose-500">🚨 IT Bugs & Sugerencias</h2>
                                <p className="text-sm text-neutral-400 mt-1">Reportes del sistema. Tablero exclusivo de JareG y Dani.</p>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                {itBugs.map(bug => (
                                    <div key={bug.id} className={`bg-[#0a0a0a] border ${bug.resolved ? 'border-green-500/30 opacity-60' : 'border-rose-500/30'} p-4 rounded-xl flex gap-4 items-start shadow-md`}>
                                        <div onClick={() => resolveBug(bug.id, bug.resolved)} className={`mt-1 cursor-pointer w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${bug.resolved ? 'bg-green-500 border-green-500 text-black' : 'border-neutral-500 hover:border-rose-500 bg-[#111]'}`}>
                                            {bug.resolved && <span className="text-[14px] font-black leading-none pb-0.5">✓</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                                <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded border ${bug.priority === 'urgente' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : bug.priority === 'media' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                                                    {bug.priority}
                                                </span>
                                                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                                                    Reportado por: <span className="text-white">{bug.reporter_username || '?'}</span>
                                                </span>
                                                <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[200px]">
                                                    {bug.path_url || '/'}
                                                </span>
                                            </div>
                                            <p className={`text-sm font-medium ${bug.resolved ? 'text-neutral-500 line-through' : 'text-gray-200'}`}>
                                                {bug.description}
                                            </p>
                                        </div>
                                        {bug.screenshot_url && (
                                            <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-neutral-700 hover:border-rose-500 transition-colors cursor-pointer" onClick={() => window.open(bug.screenshot_url, '_blank')}>
                                                <img src={bug.screenshot_url} alt="screenshot" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {itBugs.length === 0 && (
                                    <div className="border border-dashed border-neutral-700 bg-neutral-900/30 rounded-xl p-8 text-center">
                                        <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest">No hay bugs reportados en este momento</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                )}

                {subTab === 'team' && canManageUsers && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-10">
                        {/* Cabecera Equipo */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-amber-500">Jerarquía y Equipo</h2>
                                <p className="text-sm text-neutral-400 mt-1">Has entrado en modo Dios. Crea cuentas, resetea accesos y audita la actividad.</p>
                            </div>
                            <button 
                                onClick={() => setShowCreate(!showCreate)}
                                className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-full font-black text-xs transition shadow-[0_4px_15px_rgba(245,158,11,0.3)]"
                            >
                                {showCreate ? 'Cancelar Edición' : '➕ Añadir Nuevo Usuario'}
                            </button>
                        </div>

                        {/* Modal Creación Rápida */}
                        {showCreate && (
                            <form onSubmit={handleCreateUser} className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                                <h3 className="text-sm font-bold text-amber-400 mb-4 uppercase tracking-widest">Crear Nueva Cuenta</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Nombre/Usuario (Default: user)</label>
                                        <input type="text" required value={newUsername} onChange={e=>setNewUsername(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Contraseña</label>
                                        <input type="text" required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Rol / Nivel</label>
                                        <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 appearance-none cursor-pointer">
                                            <option value="superadmin">👑 SuperAdmin</option>
                                            <option value="admin">📝 Editor/Admin</option>
                                            <option value="cm">📱 Community Manager</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                                    <div className="flex flex-col gap-1 w-1/3">
                                        <label className="text-[10px] font-bold text-rose-500 uppercase">Firma con tu Pass Maestra</label>
                                        <input type="password" required value={masterPass} onChange={e=>setMasterPass(e.target.value)} placeholder="Tu contraseña..." className="w-full bg-black border border-rose-500/40 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-rose-500"/>
                                    </div>
                                    <button type="submit" disabled={saving} className="bg-amber-500 text-black px-8 py-2.5 rounded-xl font-black text-sm hover:scale-105 transition">Crear Estructura</button>
                                </div>
                            </form>
                        )}

                        {/* Listado de Equipo */}
                        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-neutral-800 bg-[#0d0d0d]">
                                <h3 className="text-sm font-bold text-gray-300">Cuentas Activas</h3>
                            </div>
                            {loadingTeam ? <p className="p-6 text-neutral-500">Cargando equipo...</p> : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#0a0a0a] text-xs text-neutral-500 uppercase font-black">
                                        <tr>
                                            <th className="px-6 py-3">ID / Perfil</th>
                                            <th className="px-6 py-3">Rol Jerárquico</th>
                                            <th className="px-6 py-3">Estado</th>
                                            <th className="px-6 py-3 text-right">Acciones Peligrosas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/60">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-neutral-800/30 transition-colors group">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                                                        {u.photo_url ? <img src={u.photo_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-xs">🦖</div>}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-white block leading-none">{u.username}</span>
                                                        <span className="text-[10px] text-neutral-500">ID: #{u.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.username === 'JareG' && profile.id !== 2 ? (
                                                        <span className="text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded text-[10px] uppercase w-[120px] inline-block text-center shrink-0 border border-amber-500/30">👑 Fundador</span>
                                                    ) : (
                                                        <select 
                                                            value={u.role || (u.is_superadmin ? 'superadmin' : 'admin')}
                                                            onChange={(e) => handleUpdateRole(u.id, u.username, u.role || (u.is_superadmin ? 'superadmin' : 'admin'), e.target.value)}
                                                            disabled={u.id === profile.id || (u.username === 'JareG' && profile.id !== 2)}
                                                            className={`text-[10px] font-bold px-2 py-1.5 rounded uppercase outline-none cursor-pointer border transition ${u.role === 'superadmin' || u.is_superadmin ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : (u.role === 'cm' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-neutral-800 text-gray-300 border-neutral-700 hover:border-neutral-500')}`}
                                                        >
                                                            <option value="superadmin">👑 SuperAdmin</option>
                                                            <option value="admin">📝 Editor Admin</option>
                                                            <option value="cm">📱 CM</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="flex items-center gap-2 text-green-500 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span> Activo</span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button onClick={() => handleResetPassword(u.id, u.username)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 rounded-md font-bold text-xs transition">Reset Pass</button>
                                                    {u.id !== profile.id && (u.username !== 'JareG' || profile.id === 2) && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-md font-bold text-xs transition">Eliminar</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Logs de Auditoría */}
                        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden mt-8 flex flex-col max-h-[400px]">
                            <div className="px-6 py-4 border-b border-neutral-800 bg-[#0d0d0d] sticky top-0">
                                <h3 className="text-sm font-bold text-gray-300">Auditoría / Registro de Actividad</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {logs.length === 0 ? <p className="p-4 text-neutral-500 text-sm">No hay registros de actividad aún.</p> : (
                                    <div className="space-y-1">
                                        {logs.map(l => (
                                            <div key={l.id} className="text-xs flex gap-4 px-4 py-2.5 rounded-lg hover:bg-neutral-800/50 transition-colors">
                                                <span className="text-neutral-500 font-mono shrink-0 w-[140px]">{new Date(l.created_at).toLocaleString('es-MX', {hour12:true, day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="font-bold text-gray-300 shrink-0 w-[120px]">{l.username || 'Desconocido'}</span>
                                                <span className="text-cyan-400 font-bold shrink-0 w-[120px]">{l.action}</span>
                                                <span className="text-neutral-400 truncate flex-1">{JSON.stringify(l.details)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
