import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Verificamos si el usuario ya aceptó o cerró el aviso previamente
    const hasConsented = localStorage.getItem('cookieConsent');
    if (!hasConsented) {
      // Un pequeño retraso para que no aparezca de golpe al cargar la página
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('cookieConsent', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-3xl bg-[#CC0000] text-white z-[9999] py-4 px-6 rounded-2xl shadow-[0_8px_30px_rgba(204,0,0,0.3)] animate-fade-in-up">
      <div className="relative flex flex-row items-center justify-center text-center sm:text-left">
        <div className="text-sm sm:text-base font-medium leading-snug pr-2">
          {t('cookieConsent.text')}
          <Link to="/politica-cookies" className="underline hover:text-gray-200 transition-colors font-bold">
            {t('cookieConsent.link')}
          </Link>.
        </div>
      </div>
      
      {/* Botón flotante en la esquina superior derecha */}
      <button
        onClick={handleClose}
        className="absolute -top-3 -right-3 bg-[#050505] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-800 transition-all shadow-lg border border-neutral-700 group focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
        aria-label={t('cookieConsent.close')}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="group-hover:scale-110 transition-transform"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export default CookieConsent;
