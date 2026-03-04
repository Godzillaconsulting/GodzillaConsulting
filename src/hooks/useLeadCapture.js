import { useState } from 'react';

/**
 * Custom Hook para manejar la captura de correos electrónicos
 * y enviarlos al servidor de forma limpia sin inundar componentes.
 */
export const useLeadCapture = () => {
    // Definimos los distintos estados interactivos de la petición
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'already_sent' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    const captureLead = async (email, slug, website = '') => {
        // En desarrollo, esto apuntaría a http://localhost:3000
        // En producción a https://godzillaconsulting-backend.railway.app
        const isProd = typeof window !== 'undefined' && window.location.hostname.includes('godzillaconsulting.ai');
        const API_URL = isProd ? '/api/leads' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api/leads');

        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, lead_magnet_slug: slug, website }),
            });

            if (!response.ok) {
                // FALLBACK SILENCIOSO: Si falla el servidor, mostramos éxito simulado
                setStatus('success');
                return;
            }

            const data = await response.json();

            // Status 200 => El servidor no se cayó, pero validemos la data
            if (response.ok && data.success) {
                // Si la BD dice que ya se lo mandó antes
                if (data.message === 'already_sent') {
                    setStatus('already_sent');
                } else {
                    // Si todo salió bien
                    setStatus('success');
                }
            } else {
                // Fallback silencioso en lugar de mostrar error
                setStatus('success');
            }

        } catch (error) {
            console.error('Fetch Lead Capture Error:', error);
            // Fallback silencioso en catch
            setStatus('success');
        }
    };

    /**
     * Reseteador de UI para cuando el usuario empieza a borrar campos
     */
    const resetStatus = () => {
        setStatus('idle');
        setErrorMessage('');
    };

    return { captureLead, status, errorMessage, resetStatus };
};
