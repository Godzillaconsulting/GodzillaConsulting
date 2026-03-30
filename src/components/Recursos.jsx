import React, { useState, useEffect, useMemo } from 'react';
import { Download, X, Check } from 'lucide-react';
import { useLeadCapture } from '../hooks/useLeadCapture';
import whatsapp3d from '../assets/images/whatsapp_3d_icon.png';
import { client, urlFor } from '../sanityClient';
import { useSiteData } from '../context/SiteContext';
import DynamicMedia from './DynamicMedia';
const defaultMagnets = [
    {
        id: 1,
        orden: 1,
        title: '7 prompts de IA para marketing que sí funcionan',
        description: 'El contenido de calidad ya no tiene que consumir horas de tu equipo. Esta colección de 7 prompts especializados te da las herramientas exactas que necesitas para crear copy, estrategias y análisis de nivel profesional en minutos. Acelera tu producción sin sacrificar calidad.',
        image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80',
    },
    {
        id: 2,
        orden: 2,
        title: 'Cómo generar leads en WhatsApp sin spam',
        description: 'WhatsApp se ha consolidado como el canal de comunicación preferido en México, con más de 90 millones de usuarios activos. Esta guía te muestra cómo aprovechar esta plataforma de manera profesional y efectiva para hacer crecer tu negocio. Domina el canal de comunicación más poderoso del país.',
        image: whatsapp3d,
    },
    {
        id: 3,
        orden: 3,
        title: 'Plantilla de CRM Personalizable',
        description: 'Llevar un seguimiento de tus leads en libretas u hojas caóticas te hace perder ventas a diario. Con este CRM en Excel totalmente personalizable y fácil de usar, podrás organizar a tus prospectos de forma clara, priorizar tus seguimientos y maximizar tu porcentaje de cierre. Simplifica tu proceso de ventas hoy mismo.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80',
    }
];

const Recursos = () => {
    const { getNodeData } = useSiteData();
    const nodeData = getNodeData('recursos') || {};

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState(''); // Honeypot trap
    const [activeItem, setActiveItem] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [magnetsState, setMagnetsState] = useState(defaultMagnets);

    // Importamos nuestra conexión hook al backend (Esto sustituye temporalmente o acompaña a la simulación visual)
    const { captureLead, status, errorMessage, resetStatus } = useLeadCapture();

    useEffect(() => {
        client
            .fetch(`*[_type == "recurso"] | order(orden asc)`)
            .then((data) => {
                if (data && data.length > 0) {
                    setMagnetsState(data);
                }
            })
            .catch((error) => console.error('Error cargando recursos de Sanity:', error));
    }, []);

    const getImageSrc = (item) => {
        if (item.image && typeof item.image === 'object' && item.image.asset) {
            return urlFor(item.image).width(800).url();
        }
        const isUploaded = typeof item.image === 'string' && item.image.startsWith('http') && !item.image.includes('/assets/');
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
                <div className="text-center mb-20">
                    {nodeData.overline && (
                        <span className="block text-[#CC0000] font-bold tracking-[0.2em] uppercase mb-4 text-sm md:text-base drop-shadow-lg">
                            {nodeData.overline}
                        </span>
                    )}
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
                        {nodeData.title || 'RECURSOS'}
                    </h2>
                    <p className="text-xl text-gray-300 font-medium max-w-2xl mx-auto">
                        {nodeData.subtitle || 'Accede a recursos de IA y marketing listos para usar en tu día a día.'}
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
                                            {nodeData.ctaText || 'DESCARGAR'} <Download size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="w-full md:w-2/3">
                                <h3 className="text-3xl font-bold text-white mb-6 leading-tight">{item.title}</h3>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                    {item.description}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveItem(item);
                                        setIsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 text-[#CC0000] hover:text-red-400 font-bold text-lg border-b-2 border-transparent hover:border-[#CC0000] pb-1 transition-all"
                                >
                                    Haz clic aquí para descargar.
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
                                <h3 className="text-2xl font-bold text-white mb-4">¡Todo listo!</h3>
                                <p className="text-gray-300 text-base leading-relaxed mb-8">
                                    Hemos enviado "{activeItem?.title}" al correo <span className="text-white font-bold">{email}</span>.
                                    <br /><br />
                                    Por favor, espera un par de minutos y revisa tu bandeja de entrada (y la carpeta de spam por si acaso).
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
                                    Entendido
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-white mb-2">¡Recurso listo para descargar!</h3>
                                    <p className="text-gray-400 text-sm">
                                        Ingresa tu correo abajo. El archivo se descargará <b>inmediatamente</b> y también te enviaremos una copia de seguridad a tu bandeja de entrada.
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
                                    let slug = `recurso${activeItem?.id || activeItem?.orden || 1}`;
                                    
                                    if (activeItem?.slug) slug = activeItem.slug; // override from Sanity

                                    // DESCARGA DIRECTA (Inmediata para mejor UX)
                                    let fileName = nodeData[`${slug}FileUrl`] || '';

                                    if (activeItem?.fileName) fileName = activeItem.fileName; // override from Sanity

                                    if (fileName) {
                                        if (fileName.startsWith('http')) {
                                            window.open(fileName, '_blank');
                                        } else {
                                            const link = document.createElement('a');
                                            link.href = fileName.startsWith('/') ? fileName : `/lead-magnets/${fileName}`;
                                            link.download = fileName.split('/').pop() || 'recurso.pdf';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }
                                    }

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
                                            placeholder="tu@correo.com"
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
                                        {status === 'loading' ? 'Enviando email...' : 'Enviar a mi correo'}
                                    </button>

                                    {/* Mostrar Errores de API si existieran sin trabar la UI */}
                                    {status === 'error' && (
                                        <p className="text-red-400 text-sm mt-3 text-center">{errorMessage || 'Error enviando correo'}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-4 text-center">
                                        Prometemos no enviarte spam. Puedes desuscribirte en cualquier momento.
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
