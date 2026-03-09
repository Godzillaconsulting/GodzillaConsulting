import React, { useState } from 'react';
import { useLeadCapture } from '../hooks/useLeadCapture';

/**
 * Ejemplo Funcional de cómo utilizar tu Hook de Leads
 * Este componente es 100% reutilizable.
 * @param slug - El identificador ('prompts-ia-marketing' o 'leads-whatsapp') 
 */
const LeadMagnetBanner = ({ slug = 'prompts-ia-marketing', title = "7 Prompts de IA comprobados", subtitle = "Déjanos tu correo y recíbelos al instante." }) => {

    const [emailInput, setEmailInput] = useState('');
    const [website, setWebsite] = useState(''); // Estado para Honeypot

    // Invocamos el cerebro del Hook
    const { captureLead, status, errorMessage, resetStatus } = useLeadCapture();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!emailInput) return; // Validación básica UI

        // Mandamos el correo al hook junto al honeypot
        await captureLead(emailInput, slug, website);
    };

    const handleInputChange = (e) => {
        setEmailInput(e.target.value);
        if (status !== 'idle') resetStatus(); // Limpia alertas si intenta otra vez
    };

    // Mensajes de Exito Inteligentes
    const renderFeedback = () => {
        if (status === 'success') {
            return <p className="text-green-400 font-bold text-sm mt-3 animate-pulse">¡El recurso va en camino a tu bandeja de entrada!</p>;
        }
        if (status === 'already_sent') {
            return <p className="text-yellow-400 font-bold text-sm mt-3">¡Ya habíamos enviado este documento a tu correo antes! Revisa tu bandeja de spam.</p>;
        }
        if (status === 'error') {
            return <p className="text-red-400 font-bold text-sm mt-3">{errorMessage}</p>;
        }
        return null;
    };

    return (
        <div className="bg-[#18181b] p-8 md:p-12 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-white/10 text-center">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-2">{title}</h3>
            <p className="text-gray-400 mb-8">{subtitle}</p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto relative">

                {/* HONEYPOT INVISIBLE: Los bots lo llenarán, los humanos no lo verán */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
                    <input type="text" name="website" tabIndex="-1" autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <input
                    type="email"
                    placeholder="Tu mejor correo..."
                    className="flex-1 bg-black text-white px-6 py-4 rounded-full border border-gray-700 outline-none focus:border-[#CC0000] transition-colors shadow-inner"
                    value={emailInput}
                    onChange={handleInputChange}
                    disabled={status === 'loading'}
                    required
                />
                <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className={`px-8 py-4 rounded-full font-bold transition-all shadow-lg flex items-center justify-center min-w-[140px]
                        ${status === 'loading'
                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            : 'bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000]'
                        }`}
                >
                    {status === 'loading' ? 'Enviando...' : 'Descargar'}
                </button>
            </form>

            {renderFeedback()}
        </div>
    );
};

export default LeadMagnetBanner;
