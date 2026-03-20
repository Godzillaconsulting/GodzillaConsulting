import React, { useState, useEffect } from'react';
import { useNavigate } from'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle, Loader } from'lucide-react';
import logo from'../assets/Godzilla Consulting.png';

const API_BASE = import.meta.env.DEV ?'http://localhost:3000' :'';

const Login = () => {
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const [checking, setChecking] = useState(true); // Verificar sesión existente
 const navigate = useNavigate();

 // Al cargar: verificar si ya hay una sesión JWT válida
 useEffect(() => {
 const token = localStorage.getItem('adminToken');
 if (!token) { setChecking(false); return; }

 fetch(`${API_BASE}/api/auth/verify`, {
 headers: { Authorization: `Bearer ${token}` },
 })
 .then(r => r.json())
 .then(data => {
 if (data.success) {
 navigate('/admin', { replace: true });
 } else {
 localStorage.removeItem('adminToken');
 localStorage.removeItem('adminUser');
 setChecking(false);
 }
 })
 .catch(() => setChecking(false));
 }, []);

 if (checking) {
 return (
 <div className="fixed inset-0 bg-[#111111] flex flex-col items-center justify-center gap-4">
 <span className="text-5xl animate-bounce">🦖</span>
 <p className="text-neutral-400 text-sm font-bold tracking-widest">Cargando...</p>
 </div>
 );
 }

 const handleLogin = async (e) => {
 e.preventDefault();
 setError('');

 if (!username.trim() || !password.trim()) {
 setError('Por favor ingresa usuario y contraseña.');
 return;
 }

 setLoading(true);
 try {
 const res = await fetch(`${API_BASE}/api/auth/login`, {
 method:'POST',
 headers: {'Content-Type':'application/json' },
 body: JSON.stringify({ username: username.trim(), password }),
 });

 const data = await res.json();

 if (res.ok && data.success && data.token) {
 localStorage.setItem('adminToken', data.token);
 localStorage.setItem('adminUser', data.username || username);
 navigate('/admin');
 } else {
 setError(data.message ||'Credenciales incorrectas. Intenta de nuevo.');
 }
 } catch (err) {
 setError('No se pudo conectar al servidor. ¿Está activo el servidor local?');
 } finally {
 setLoading(false);
 }
 };

 return (
 <section className="min-h-screen bg-[#111111] flex flex-col items-center justify-center pt-24 pb-12 px-6 relative overflow-hidden">
 {/* Background blobs */}
 <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC0000] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none" />
 <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#CC0000] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />

 <div className="w-full max-w-md relative z-10 bg-[#1a1a1a] p-10 rounded-[30px] border border-gray-800 shadow-2xl">
 <div className="flex justify-center mb-8">
 <img src={logo} alt="Godzilla Consulting" className="h-12 object-contain" />
 </div>

 <h2 className="text-3xl font-black text-center text-white mb-2">Bienvenido</h2>
 <p className="text-gray-400 text-center mb-8">Portal de administración</p>

 {error && (
 <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
 <AlertCircle size={16} className="shrink-0" />
 {error}
 </div>
 )}

 <form onSubmit={handleLogin} className="space-y-6">
 {/* Usuario */}
 <div>
 <label className="block text-sm font-bold text-gray-300 mb-2">Usuario</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <User size={18} className="text-gray-500" />
 </div>
 <input
 type="text"
 id="admin-username"
 value={username}
 onChange={e => setUsername(e.target.value)}
 className="w-full bg-[#111] border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
 placeholder="godzilla_admin"
 autoComplete="username"
 disabled={loading}
 />
 </div>
 </div>

 {/* Contraseña */}
 <div>
 <label className="block text-sm font-bold text-gray-300 mb-2">Contraseña</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <Lock size={18} className="text-gray-500" />
 </div>
 <input
 type="password"
 id="admin-password"
 value={password}
 onChange={e => setPassword(e.target.value)}
 className="w-full bg-[#111] border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
 placeholder="••••••••"
 autoComplete="current-password"
 disabled={loading}
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-3 rounded-xl font-black transition-all shadow-lg hover:shadow-xl mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {loading
 ? <><Loader size={18} className="animate-spin" /> Verificando...</>
 : <>Iniciar Sesión <ArrowRight size={18} /></>
 }
 </button>

 <p className="text-xs text-gray-500 text-center mt-6">
 Acceso exclusivo para el equipo de Godzilla Consulting.
 </p>
 </form>
 </div>
 </section>
 );
};

export default Login;
