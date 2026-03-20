import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * PrivateRoute — Protege rutas que requieren autenticación.
 * Verifica el token JWT contra el backend antes de renderizar.
 * Mientras verifica muestra una pantalla de carga.
 * Si el token es inválido o no existe → redirige a /login.
 */
export default function PrivateRoute({ children }) {
    const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'denied'

    useEffect(() => {
        const token = localStorage.getItem('adminToken');

        if (!token) {
            setStatus('denied');
            return;
        }

        // Verificar contra el backend que el token sea válido y no esté expirado
        fetch(`${API_BASE}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setStatus('ok');
                } else {
                    // Token inválido o expirado → limpiar y negar acceso
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    setStatus('denied');
                }
            })
            .catch(() => {
                // Si el servidor no responde en dev, permitir con token local
                // En producción sería más estricto; aquí optamos por denegar.
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                setStatus('denied');
            });
    }, []);

    if (status === 'checking') {
        return (
            <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 z-50">
                <span className="text-5xl animate-bounce">🦖</span>
                <p className="text-neutral-400 text-sm font-bold tracking-widest uppercase">
                    Verificando sesión...
                </p>
            </div>
        );
    }

    if (status === 'denied') {
        return <Navigate to="/login" replace />;
    }

    return children;
}
