import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle, Loader, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/Godzilla Consulting.png';

const API_BASE = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
const MAX_ATTEMPTS = 5; // Reflejado también en backend

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockCountdown, setLockCountdown] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const lockTimerRef = useRef(null);
    const navigate = useNavigate();

    // ── Verificar sesión existente ────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) { setChecking(false); return; }

        fetch(`${API_BASE}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => {
                if(r.status === 401) {
                    return r.json().then(data => ({ ...data, _authFail: true }));
                }
                if(!r.ok) {
                    return { success: true, _serverError: true }; // Ignora fallos de red locales (5xx)
                }
                return r.json();
            })
            .then(data => {
                if (data.success && !data._authFail) {
                    const savedUser = localStorage.getItem('adminUser') || '';
                    if (savedUser.toLowerCase() === 'judith') {
                        navigate('/cm');
                    } else {
                        navigate('/admin');
                    }
                } else if (data._authFail) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    setChecking(false);
                } else {
                    setChecking(false);
                }
            })
            .catch(() => setChecking(false)); // Error de fetch no borra caché, solo corta checking
    }, []);

    // ── Restaurar intentos del localStorage ──────────────────
    useEffect(() => {
        const savedAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        const savedLockTime = parseInt(localStorage.getItem('lockUntil') || '0');
        if (savedAttempts) setAttempts(savedAttempts);
        if (savedLockTime && Date.now() < savedLockTime) {
            setIsLocked(true);
            const remaining = Math.ceil((savedLockTime - Date.now()) / 1000);
            setLockCountdown(remaining);
        } else if (savedLockTime && Date.now() >= savedLockTime) {
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lockUntil');
        }
    }, []);

    // ── Countdown timer cuando está bloqueado ─────────────────
    useEffect(() => {
        if (isLocked && lockCountdown > 0) {
            lockTimerRef.current = setInterval(() => {
                setLockCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(lockTimerRef.current);
                        setIsLocked(false);
                        setAttempts(0);
                        localStorage.removeItem('loginAttempts');
                        localStorage.removeItem('lockUntil');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(lockTimerRef.current);
    }, [isLocked, lockCountdown]);

    if (checking) {
        return (
            <div className="fixed inset-0 bg-[#111111] flex flex-col items-center justify-center gap-4">
                <span className="text-5xl animate-bounce">🦖</span>
                <p className="text-neutral-400 text-sm font-bold tracking-widest">Verificando sesión...</p>
            </div>
        );
    }

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (isLocked) return;
        setError('');

        // Validación básica del lado del cliente
        if (!username.trim() || !password.trim()) {
            setError('Por favor ingresa usuario y contraseña.');
            return;
        }
        if (username.length > 60 || password.length > 128) {
            setError('Datos inválidos.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: username.trim().toLowerCase(), 
                    password 
                }),
            });

            const data = await res.json();

            if (res.ok && data.success && data.token) {
                // Login exitoso: limpiar intentos
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('lockUntil');
                setAttempts(0);

                localStorage.setItem('adminToken', data.token);
                const loggedUser = data.username || username;
                localStorage.setItem('adminUser', loggedUser);
                localStorage.setItem('adminRole', data.role || 'user');

                // Redirigir según rol/username
                if (loggedUser.toLowerCase() === 'judith') {
                    navigate('/cm');
                } else {
                    navigate('/admin');
                }
            } else {
                // Contar intento fallido
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                localStorage.setItem('loginAttempts', String(newAttempts));

                if (data.blocked || data.locked || newAttempts >= MAX_ATTEMPTS) {
                    // Bloquear cliente por 15 minutos
                    const lockUntil = Date.now() + 15 * 60 * 1000;
                    localStorage.setItem('lockUntil', String(lockUntil));
                    setIsLocked(true);
                    setLockCountdown(15 * 60);
                    setIsBlocked(data.blocked || false);
                    setError(data.message || 'Cuenta bloqueada por múltiples intentos fallidos.');
                } else {
                    const remaining = MAX_ATTEMPTS - newAttempts;
                    setError(data.message || `Credenciales incorrectas. Intentos restantes: ${remaining}`);
                }
            }
        } catch (err) {
            setError('No se pudo conectar al servidor. Intenta más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const strengthLevel = attempts === 0 ? null : attempts <= 2 ? 'low' : attempts <= 4 ? 'med' : 'high';

    return (
        <section className="min-h-screen bg-[#111111] flex flex-col items-center justify-center pt-24 pb-12 px-6 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC0000] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#CC0000] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
            {isLocked && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0 pointer-events-none" />}

            <div className="w-full max-w-md relative z-10 bg-[#1a1a1a] p-10 rounded-[30px] border border-gray-800 shadow-2xl">
                <div className="flex justify-center mb-8">
                    <img src={logo} alt="Godzilla Consulting" className="h-12 object-contain" />
                </div>

                <h2 className="text-3xl font-black text-center text-white mb-2">Bienvenido</h2>
                <p className="text-gray-400 text-center mb-8 text-sm">Portal de administración • Acceso seguro</p>

                {/* ESTADO DE BLOQUEO */}
                {isLocked ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-20 h-20 rounded-full bg-red-900/20 border-2 border-red-500/30 flex items-center justify-center">
                            <ShieldAlert className="text-red-500 w-10 h-10" />
                        </div>
                        <div className="text-center">
                            <p className="text-red-400 font-black text-lg uppercase tracking-widest mb-2">
                                {isBlocked ? 'IP Bloqueada' : 'Cuenta Bloqueada'}
                            </p>
                            <p className="text-neutral-400 text-sm font-bold">
                                Demasiados intentos fallidos. El sistema registró esta actividad.
                            </p>
                        </div>
                        {lockCountdown > 0 && (
                            <div className="bg-black/60 border border-red-900/30 rounded-2xl px-8 py-4 text-center">
                                <p className="text-xs text-neutral-500 font-bold mb-2 uppercase">Desbloqueo en:</p>
                                <p className="text-4xl font-black text-[#CC0000] tabular-nums">{formatTime(lockCountdown)}</p>
                            </div>
                        )}
                        <p className="text-[11px] text-neutral-600 text-center">
                            Este intento ha sido registrado. Si eres del equipo, contacta a JareG.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Error banner */}
                        {error && (
                            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm
                                ${attempts >= 3 
                                    ? 'bg-red-900/30 border border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(204,0,0,0.2)]' 
                                    : 'bg-red-900/20 border border-red-500/30 text-red-400'}`}>
                                <AlertCircle size={16} className="shrink-0 animate-pulse" />
                                <span className="font-bold">{error}</span>
                            </div>
                        )}

                        {/* Barra de advertencia de intentos */}
                        {attempts > 0 && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] text-neutral-600 font-bold uppercase">Intentos de acceso</p>
                                    <p className={`text-[10px] font-black ${
                                        strengthLevel === 'high' ? 'text-red-500' : 
                                        strengthLevel === 'med' ? 'text-yellow-500' : 'text-green-500'
                                    }`}>{attempts} / {MAX_ATTEMPTS}</p>
                                </div>
                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            strengthLevel === 'high' ? 'bg-[#CC0000]' : 
                                            strengthLevel === 'med' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                        style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
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
                                        maxLength={60}
                                    />
                                </div>
                            </div>

                            {/* Contraseña con toggle visibility */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-500" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="admin-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-[#111] border border-gray-700 rounded-xl pl-12 pr-12 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        disabled={loading}
                                        maxLength={128}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || isLocked}
                                className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-3.5 rounded-xl font-black transition-all shadow-lg hover:shadow-xl mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading
                                    ? <><Loader size={18} className="animate-spin" /> Verificando...</>
                                    : <>Iniciar Sesión <ArrowRight size={18} /></>
                                }
                            </button>
                        </form>

                        <p className="text-xs text-gray-600 text-center mt-6">
                            🔒 Todos los intentos de acceso son registrados y monitoreados.
                        </p>
                    </>
                )}
            </div>
        </section>
    );
};

export default Login;
