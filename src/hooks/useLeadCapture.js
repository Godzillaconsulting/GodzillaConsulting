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
        const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api/leads';

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
                // Posible Status 400 o el servidor rebotó el request
                setStatus('error');
                setErrorMessage(data.message || 'Error al solicitar el contenido.');
            }

        } catch (error) {
            console.error('Fetch Lead Capture Error:', error);
            setStatus('error');
            setErrorMessage('Error de red. Asegúrate de tener conexión y vuelve a intentarlo.');
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
