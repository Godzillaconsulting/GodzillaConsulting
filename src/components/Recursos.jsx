import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, X, Check } from 'lucide-react';
import { useLeadCapture } from '../hooks/useLeadCapture';
import { useSiteData } from '../context/SiteContext';
import DynamicMedia from './DynamicMedia';
import { useTranslation } from 'react-i18next';
const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
const gifBot = '/assets/icons/Bot.gif';
const gifEmbudo = '/assets/icons/Embudo.gif';
const gifCrm = '/assets/icons/Estadistica.gif';

const defaultMagnets = [
    {
        id: 1,
        orden: 1,
        title: 'La bóveda de scripts de IA',
        description: 'Acceso a los 7 pasos estructurales que te permitirán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos. Incluye pautas fundamentales y la técnica de "Doble Opción" para incrementar considerablemente tus tasas de agendamiento sin perder la naturalidad humana.',
        image: gifBot,
    },
    {
        id: 2,
        orden: 2,
        title: 'El Protocolo Lázaro (resurrección de leads)',
        description: 'Accede a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días. Aplica una psicología defensiva de riesgo nulo que facilita retomar conversaciones atrapadas en el limbo de manera natural y sin fricciones.',
        image: gifEmbudo,
    },
    {
        id: 3,
        orden: 3,
        title: 'El Tablero de control de ventas',
        description: 'Este documento ha sido estructurado meticulosamente para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Incluye herramientas como el Semáforo de Leads para gestionar contactos oportunos antes de que se enfríen.',
        image: gifCrm,
    }
];

const Recursos = () => {
    const { t, i18n } = useTranslation();
    const isSpanish = i18n.resolvedLanguage?.startsWith('es') || !i18n.resolvedLanguage;
    const { getNodeData } = useSiteData();
    const nodeData = getNodeData('recursos') || {};

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState(''); // Honeypot trap
    const [activeItem, setActiveItem] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [magnetsState, setMagnetsState] = useState(defaultMagnets);

    // Importamos nuestra conexión hook al backend (Esto sustituye temporalmente o acompaña a la simulación visual)
    const { captureLead, status, errorMessage } = useLeadCapture();

    // ── Typewriter effect ──────────────────────────────────────────────────
    const rawTitle = isSpanish ? (nodeData.title || 'RECURSOS') : t('resources.titleRed');
    const [typedTitle, setTypedTitle] = useState('');
    const [startTyping, setStartTyping] = useState(false);
    const titleContainerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStartTyping(true);
                } else {
                    setStartTyping(false);
                    setTypedTitle('');
                }
            },
            { threshold: 0.3 }
        );
        if (titleContainerRef.current) observer.observe(titleContainerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!startTyping) return;
        let i = 0;
        let current = '';
        const interval = setInterval(() => {
            if (i < rawTitle.length) {
                current += rawTitle.charAt(i);
                setTypedTitle(current);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 120);
        return () => clearInterval(interval);
    }, [rawTitle, startTyping]);

    useEffect(() => {
        // Fallback or future resource logic
    }, []);

    const getImageSrc = (item) => {
        const isUploaded = typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('/api/media')) && !item.image.includes('/assets/');
        if (isUploaded) return item.image;
        
        // Fallback for stale local string hashes
        const fallback = defaultMagnets.find(m => m.id === item.id);
        return fallback ? fallback.image : item.image;
    };

    const displayMagnets = useMemo(() => {
        const mappedCases = [];
        let maxIdx = 0;
        Object.keys(nodeData).forEach(k => {
            if (k.startsWith('recurso') && k.endsWith('ImageUrl')) {
                const num = parseInt(k.replace('recurso', '').replace('ImageUrl', ''));
                if (num > maxIdx) maxIdx = num;
            }
        });

        if (maxIdx > 0) {
            for (let i = 1; i <= maxIdx; i++) {
                if (nodeData[`recurso${i}Nombre`]) {
                    mappedCases.push({
                        _id: `rec-${i}`,
                        id: i,
                        orden: i,
                        image: nodeData[`recurso${i}ImageUrl`],
                        title: nodeData[`recurso${i}Nombre`] || '',
                        description: nodeData[`recurso${i}Desc`] || ''
                    });
                }
            }
            return mappedCases;
        }

        if (magnetsState !== defaultMagnets && magnetsState.length > 0) return magnetsState;
        return defaultMagnets;
    }, [nodeData, magnetsState]);

    return (
        <section id="recursos" className="py-24 bg-[#111111] overflow-hidden">
            <div className="container mx-auto px-6 max-w-6xl">
                <div ref={titleContainerRef} className="text-center mb-20">
                    {nodeData.overline && (
                        <span className="block text-[#CC0000] font-bold tracking-[0.2em] uppercase mb-4 text-sm md:text-base drop-shadow-lg">
                            {nodeData.overline}
                        </span>
                    )}
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter inline-block animate-blink-cursor">
                        {typedTitle}
                    </h2>
                    <p className="text-xl text-gray-300 font-medium max-w-2xl mx-auto">
                        {isSpanish ? (nodeData.subtitle || 'Accede a recursos de IA y marketing listos para usar en tu día a día.') : t('resources.subtitle')}
                    </p>
                </div>

                <div className="space-y-16">
                    {displayMagnets.map((item, index) => (
                        <div key={item._id || item.id} className={`flex flex-col ${index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center group`}>

                            {/* Image Container with Custom Frame */}
                            <div className="w-full md:w-1/3 flex-shrink-0">
                                <div className="relative aspect-square rounded-[3rem] border bg-gray-900 border-gray-800 p-2 shadow-2xl overflow-hidden group-hover:border-[#CC0000] transition-colors duration-500">
                                    <DynamicMedia src={getImageSrc(item)} alt={item.title} className="w-full h-full object-cover rounded-[2.5rem] opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />

                                    {/* Hover Download Overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-[2.5rem]">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveItem(item);
                                                setIsModalOpen(true);
                                            }}
                                            className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                                        >
                                            {isSpanish ? (nodeData.ctaText || 'DESCARGAR') : t('resources.btn')} <Download size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="w-full md:w-2/3">
                                <h3 className="text-3xl font-bold text-white mb-6 leading-tight">
                                    {isSpanish ? item.title : (t(`resources.magnets`, { returnObjects: true })[index]?.title || item.title)}
                                </h3>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                    {isSpanish ? item.description : (t(`resources.magnets`, { returnObjects: true })[index]?.description || item.description)}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveItem(item);
                                        setIsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 text-[#CC0000] hover:text-red-400 font-bold text-lg border-b-2 border-transparent hover:border-[#CC0000] pb-1 transition-all"
                                >
                                    {isSpanish ? 'Haz clic aquí para descargar.' : t('resources.clickDownload')}
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Captura de Lead */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1c1c1c] border border-gray-800 p-8 rounded-[2rem] max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                setTimeout(() => {
                                    setIsSubmitted(false);
                                    setEmail('');
                                }, 300);
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {isSubmitted ? (
                            <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check size={32} className="text-white" strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">{isSpanish ? '¡Todo listo!' : t('resources.modalSuccess1')}</h3>
                                <p className="text-gray-300 text-base leading-relaxed mb-8">
                                    {isSpanish ? <>Hemos enviado "{activeItem?.title}" al correo <span className="text-white font-bold">{email}</span>.<br /><br />Por favor, espera un par de minutos y revisa tu bandeja de entrada (y la carpeta de spam por si acaso).</> : <>{t('resources.modalSuccess2')} "{activeItem?.title}" {t('resources.modalSuccess3')} <span className="text-white font-bold">{email}</span>.<br /><br />{t('resources.modalSuccess4')}</>}
                                </p>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setTimeout(() => {
                                            setIsSubmitted(false);
                                            setEmail('');
                                        }, 300);
                                    }}
                                    className="w-full bg-white hover:bg-gray-200 text-black py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                                >
                                    {isSpanish ? 'Entendido' : t('resources.modalUnderstood')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-white mb-2">{isSpanish ? '¡Recurso listo para descargar!' : t('resources.modalTitle')}</h3>
                                    <p className="text-gray-400 text-sm">
                                        {isSpanish ? <>Ingresa tu correo abajo. El archivo se descargará <b>inmediatamente</b> y también te enviaremos una copia de seguridad a tu bandeja de entrada.</> : t('resources.modalSubtitle')}
                                    </p>
                                </div>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (email.trim() === '') return;

                                    // Si un bot llenó el honeypot, lo dejamos pasar sin accionar nada (simulando éxito)
                                    if (website !== '') {
                                        setIsSubmitted(true);
                                        return;
                                    }

                                    // Para que esto funcione 100% el .env debe apuntar al servidor.
                                    // AHORA conectaremos el click con nuestro servidor real (Node.js)
                                    // Determinar slug para API basado en el ID
                                    let slug = `recurso${activeItem?.id || activeItem?.orden || 1}`; // Forzamos que siempre sea recursoX para Node.js // override from Sanity

                                    // EVITAMOS DESCARGA INMEDIATA AQUÍ, SE MOSTRARÁ EN EL MENSAJE DE ÉXITO
                                    if (slug) {
                                        // Mandamos al back el Lead para que mande el CORREO real (en segundo plano)
                                        captureLead(email, slug, website);
                                    }

                                    // Cambiamos el estado para mostrar UI de éxito en la pantalla al usuario
                                    setIsSubmitted(true);
                                }}>
                                    <div className="mb-4 relative">

                                        {/* HONEYPOT TRAP */}
                                        <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
                                            <input type="text" name="b_website" tabIndex="-1" value={website} onChange={(e) => setWebsite(e.target.value)} />
                                        </div>

                                        <input
                                            type="email"
                                            required
                                            placeholder={isSpanish ? "tu@correo.com" : "you@email.com"}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center
                                            ${status === 'loading'
                                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                                : 'bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] hover:shadow-xl'
                                            }`}
                                    >
                                        {status === 'loading'
                                          ? (isSpanish ? 'Enviando email...' : t('resources.modalSending'))
                                          : (isSpanish ? 'Enviar a mi correo' : t('resources.modalSend'))
                                        }
                                    </button>

                                    {/* Mostrar Errores de API si existieran sin trabar la UI */}
                                    {status === 'error' && (
                                        <p className="text-red-400 text-sm mt-3 text-center">{errorMessage || 'Error enviando correo'}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-4 text-center">
                                        {isSpanish ? 'Prometemos no enviarte spam. Puedes desuscribirte en cualquier momento.' : t('resources.modalSpam')}
                                    </p>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default Recursos;
