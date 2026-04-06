import React, { useState, useEffect } from 'react';

export default function AdminProfile({ profile, onProfileUpdate }) {
    const [subTab, setSubTab] = useState('personal'); // 'personal' | 'team'
    const [saving, setSaving] = useState(false);
    
    // --- Estado Personal ---
    const [username, setUsername] = useState(profile?.username || '');
    const [password, setPassword] = useState('');
    const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || '');
    const [personalMsg, setPersonalMsg] = useState({ text: '', type: '' });

    // --- Estado de Tareas Personales (Mock UI) ---
    const [myTasks, setMyTasks] = useState([
        { id: 1, title: 'Oscurecer imagen y subir contraste (Post Hero)', deadline: 'Hoy 5:00 PM', source: 'Oscar', done: false },
        { id: 2, title: 'Corregir copy Accrual para TikTok', deadline: 'Mañana AM', source: 'Judith', done: false },
        { id: 3, title: 'Renderizar video Kling V3 de Cripto', deadline: 'Ayer', source: 'JareG', done: true }
    ]);

    const toggleTask = (id) => {
        setMyTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
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
        if (subTab === 'team' && profile?.is_superadmin) {
            fetchTeamData();
        }
    }, [subTab, profile]);

    const handleSavePersonal = async (e) => {
        e.preventDefault();
        if(!window.confirm("⚠️ ¿Estás totalmente seguro de aplicar los cambios a tu perfil maestro en la base de datos?")) return;
        
        setSaving(true);
        setPersonalMsg({ text: '', type: '' });
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/profile`, {
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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/media/upload`, {
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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/${targetId}`, {
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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/${targetId}`, {
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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/${targetId}`, {
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
                {profile.is_superadmin && (
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
                    </div>
                )}

                {subTab === 'tasks' && (
                    <div className="animate-in fade-in space-y-6">
                        <div>
                            <h2 className="text-2xl font-black text-white">Bandeja de Tareas</h2>
                            <p className="text-sm text-neutral-400 mt-1">Checklist de operaciones pendientes asignadas a ti.</p>
                        </div>
                        
                        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden p-6">
                            <div className="space-y-3">
                                {myTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${task.done ? 'bg-black/30 border-neutral-800/50 opacity-50' : 'bg-[#111] border-neutral-700 hover:border-sky-500/50 hover:bg-[#1a1a1a] shadow-lg hover:shadow-sky-900/10'}`}
                                    >
                                        <div 
                                            onClick={() => toggleTask(task.id)}
                                            className={`w-6 h-6 rounded-md flex justify-center items-center shrink-0 border-2 transition-colors cursor-pointer ${task.done ? 'bg-sky-500/20 border-sky-500 text-sky-400' : 'bg-black border-neutral-500 hover:border-sky-400 text-transparent'}`}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={task.done ? 'scale-100' : 'scale-50 opacity-0'}><polyline points="20 6 9 17 4 12"/></svg>
                                        </div>
                                        <div 
                                            className="flex-1 cursor-pointer"
                                            onClick={() => {
                                                // Manda a calendario si es CM o al origen del comentario. Por default al Calendar / Inbox
                                                window.location.href = '/cm'; 
                                            }}
                                        >
                                            <p className={`text-sm font-black tracking-wide transition-colors group-hover:text-sky-400 ${task.done ? 'text-neutral-500 line-through group-hover:text-neutral-400' : 'text-white'}`}>{task.title}</p>
                                            <div className="flex gap-3 mt-1.5 opacity-80">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${task.done ? 'bg-neutral-800 text-neutral-600' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>Ref: {task.source}</span>
                                                <span className={`text-[10px] font-bold ${task.done ? 'text-neutral-600' : 'text-neutral-400'}`}>🏁 {task.deadline}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'team' && profile?.is_superadmin && (
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
