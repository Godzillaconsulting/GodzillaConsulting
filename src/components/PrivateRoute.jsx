import React, { useState, useEffect } from'react';
import { Navigate } from'react-router-dom';

const API_BASE = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');

/**
 * PrivateRoute — Protege rutas que requieren autenticación.
 * Verifica el token JWT contra el backend antes de renderizar.
 * Mientras verifica muestra una pantalla de carga.
 *
 * Lógica de fallo:
 * - 401 (Unauthorized) → token realmente inválido → borra sesión → /login
 * - 429 / 500 / error de red → NO borrar sesión → dejar pasar con token local
 * (evitar que un rate-limit o cold-start bloquee usuarios legítimos)
 */
export default function PrivateRoute({ children }) {
 const [status, setStatus] = useState('checking'); //'checking' |'ok' |'denied'

 useEffect(() => {
 const token = localStorage.getItem('adminToken');

 if (!token) {
 setStatus('denied');
 return;
 }

 fetch(`${API_BASE}/api/auth/verify`, {
 headers: { Authorization: `Bearer ${token}` },
 })
 .then((res) => {
 // Solo el 401 significa que el token es genuinamente inválido
 if (res.status === 401) {
 return res.json().then(data => ({ ...data, _authFail: true }));
 }
 // 429 rate-limit, 500 server error, etc → no es fallo de auth
 if (!res.ok) {
 return { success: true, _serverError: true };
 }
 return res.json();
 })
 .then((data) => {
 if (data._authFail) {
 // Token expirado o inválido → limpiar y redirigir
 localStorage.removeItem('adminToken');
 localStorage.removeItem('adminUser');
 setStatus('denied');
 } else {
 // Válido, o error de servidor que no es de auth → dejar pasar
 setStatus('ok');
 }
 })
 .catch(() => {
 // Error de red / timeout → dejar pasar con token local
 console.warn('[PrivateRoute] Error de red al verificar token. Usando token local.');
 setStatus('ok');
 });
 }, []);

 if (status ==='checking') {
 return (
 <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 z-50">
 <span className="text-5xl animate-bounce">🦖</span>
 <p className="text-neutral-400 text-sm font-bold tracking-widest">
 Verificando sesión...
 </p>
 </div>
 );
 }

 if (status ==='denied') {
 return <Navigate to="/login" replace />;
 }

 return children;
}
