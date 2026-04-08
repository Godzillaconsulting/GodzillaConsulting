import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSiteData } from '../context/SiteContext';
import DynamicMedia from './DynamicMedia';
const bgVideo = 'https://bot.godzillaconsulting.ai/api/media/assets/Particulas Rojas.mp4';
const gifBot = 'https://bot.godzillaconsulting.ai/api/media/assets/Bot.gif';
const gifVideo = 'https://bot.godzillaconsulting.ai/api/media/assets/Video.gif';
const gifEmbudo = 'https://bot.godzillaconsulting.ai/api/media/assets/Embudo.gif';
const gifRedes = 'https://bot.godzillaconsulting.ai/api/media/assets/Redes Sociales.gif';
const gifSeo = 'https://bot.godzillaconsulting.ai/api/media/assets/Red Social Optimizar.gif';
const gifCrm = 'https://bot.godzillaconsulting.ai/api/media/assets/Estadistica.gif';

const defaultServices = [
    { _id: 'default-bots', orden: 1, id: { current: 'bots' }, iconSrc: gifBot, title: 'Automatización de Bots', enlace: '/bots', desc: 'Automatiza tu atención al cliente 24/7 con bots entrenados en tu negocio, que responden dudas, califican prospectos y los llevan directo a la cita o a la venta. Integrados con WhatsApp, redes sociales y tu CRM.' },
    { _id: 'default-video', orden: 2, id: { current: 'video' }, iconSrc: gifVideo, title: 'Producción audiovisual', enlace: '/audiovisual', desc: 'Creamos contenido audiovisual estratégico que genera confianza, autoridad, fortalece tu marca, comunica tu propuesta de valor y potencia la conversión en campañas y redes sociales.' },
    { _id: 'default-funnels', orden: 3, id: { current: 'funnels' }, iconSrc: gifEmbudo, title: 'Embudos de venta', enlace: '/embudos', desc: 'Estructuramos embudos digitales orientados a resultados que convierten tráfico en citas y oportunidades comerciales medibles.' },
    { _id: 'default-social', orden: 4, id: { current: 'social' }, iconSrc: gifRedes, title: 'Gestión de redes sociales', enlace: '/redes', desc: 'Administramos la presencia digital de tu marca con una estrategia de contenido profesional, enfocada en posicionamiento, reputación y generación de prospectos.' },
    { _id: 'default-seo', orden: 5, id: { current: 'seo' }, iconSrc: gifSeo, title: 'Optimización web y SEO', enlace: '/seo', desc: 'Optimizamos tu sitio web y su estructura SEO para mejorar visibilidad en buscadores, experiencia de usuario y generación de leads calificados.' },
    { _id: 'default-crm', orden: 6, id: { current: 'crm' }, iconSrc: gifCrm, title: 'CRM con SAAS personalizado', enlace: '/crm', desc: 'Implementamos plataformas CRM y soluciones SaaS a la medida para centralizar contactos, automatizar seguimientos y facilitar la gestión comercial de tu equipo.' },
];

const Servicios = () => {
    const { getNodeData } = useSiteData();
    const [activeIdx, setActiveIdx] = useState(0);
    
    const nodeData = getNodeData('servicios') || {};
    
    // Mezcla los datos por defecto o de elements con las variables planas (service1Title, service1Desc...)
    const baseServices = (nodeData.elements && nodeData.elements.length > 0) ? nodeData.elements : defaultServices;
    const services = baseServices.map((srv, i) => {
        const num = i + 1;
        return {
            ...srv,
            title: nodeData[`service${num}Title`] || srv.title,
            desc: nodeData[`service${num}Desc`] || srv.desc,
        };
    });

    const getIconSrc = (srv, idx) => {
        // 1. Ícono individual desde CMS
        const cmsKey = `service${idx + 1}IconUrl`;
        if (nodeData[cmsKey] && typeof nodeData[cmsKey] === 'string' && (nodeData[cmsKey].startsWith('http') || nodeData[cmsKey].startsWith('/api/media')) && !nodeData[cmsKey].includes('/assets/')) return nodeData[cmsKey];

        // 2. Si viene de BD con iconSrc directo y es un link válido subido
        if (srv.iconSrc && typeof srv.iconSrc === 'string' && (srv.iconSrc.startsWith('http') || srv.iconSrc.startsWith('/api/media')) && !srv.iconSrc.includes('/assets/')) return srv.iconSrc;

        // 3. Fallback inteligente a gif local por coincidencia de título
        const slug  = srv.id?.current || '';
        const title = srv.title || '';
        const fallback = defaultServices.find(d => {
            const dSlug  = d.id?.current || '';
            const dTitle = d.title || '';
            return (slug && dSlug && slug === dSlug) ||
                (title && dTitle && title.toLowerCase().includes(dTitle.toLowerCase())) ||
                (title && dTitle && dTitle.toLowerCase().includes(title.toLowerCase()));
        });
        return fallback ? fallback.iconSrc : null;
    };

    // Obtiene el enlace: desde Sanity o desde el default
    const getEnlace = (srv) => srv.enlace || '#servicios';

    const renderIconImg = (srv, isActive = false, idx = 0) => (
        <DynamicMedia
            src={getIconSrc(srv, idx)}
            alt={srv.title}
            className="w-14 h-14 md:w-20 md:h-20 object-contain transition-all duration-300 group-hover:scale-110"
            style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
        />
    );


    return (
        <section id="servicios" className="relative bg-[#F4F4F4] pb-24">

            {/* Header with Video Background */}
            <div className="relative w-full h-[400px] bg-[#050505] overflow-hidden flex flex-col pt-20">
                {/* Video o Imagen de fondo - Inteligente */}
                {(() => {
                    const finalBg = (nodeData.videoUrl !== undefined && nodeData.videoUrl !== '') 
                        ? nodeData.videoUrl 
                        : (nodeData.videoFileUrl !== undefined && nodeData.videoFileUrl !== '') 
                            ? nodeData.videoFileUrl 
                            : bgVideo;
                    
                    if (!finalBg) return null;

                    // 1. Detección de YouTube
                    const ytMatch = finalBg.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                    const ytId = (ytMatch && ytMatch[2].length === 11) ? ytMatch[2] : null;
                    if (ytId) {
                        return (
                            <iframe 
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0`}
                                className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen pointer-events-none"
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                            ></iframe>
                        );
                    }

                    // 2. Detección de Archivos Nativos de Video (mp4, mov, etc)
                    if (finalBg.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
                        return (
                            <video
                                src={finalBg}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen"
                            />
                        );
                    } 
                    
                    // 3. Fallback a Imagen
                    return (
                        <img
                            src={finalBg}
                            alt="Background Servicios"
                            className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen"
                        />
                    );
                })()}
                <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/80 via-transparent to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#111111] to-transparent z-10"></div>
                <div className="relative z-20 flex flex-col items-center justify-center mt-10">
                    {nodeData.overline && (
                        <span className="text-[#CC0000] font-bold tracking-[0.2em] uppercase mb-4 text-sm md:text-base drop-shadow-lg">
                            {nodeData.overline}
                        </span>
                    )}
                    <h2 className="text-5xl md:text-7xl font-black text-center text-white tracking-tighter drop-shadow-2xl">
                        {nodeData.title || 'SERVICIOS'}
                    </h2>
                    {nodeData.subtitle && (
                        <p className="text-gray-200 mt-4 max-w-2xl text-center text-base md:text-lg drop-shadow-lg px-4">
                            {nodeData.subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="container relative z-30 mx-auto px-6 max-w-7xl -mt-[60px]">

                {/* Desktop Interactive Layout */}
                <div className="hidden md:block">
                    {/* Icons Row */}
                    <div className="flex justify-between items-start relative px-4">
                        {services.map((srv, idx) => {
                            const isActive = activeIdx === idx;
                            return (
                                <div key={srv._id} className="relative z-10 flex flex-col items-center group cursor-pointer" onClick={() => setActiveIdx(idx)}>
                                    <div className={`w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-[#CC0000] border-[6px] border-white outline outline-4 outline-[#CC0000] scale-[1.15] shadow-2xl z-20' : 'bg-[#18181b] border-[6px] border-white hover:bg-[#333333] hover:scale-105 shadow-lg'}`}>
                                        {renderIconImg(srv, isActive, idx)}
                                    </div>
                                    <h3 className={`mt-10 text-center font-bold text-base md:text-xl max-w-[200px] text-[#CC0000] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                                        {srv.title}
                                    </h3>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active Content Area */}
                    <div className="mt-16 bg-white p-10 rounded-2xl shadow-xl border border-gray-100 min-h-[220px] flex flex-col justify-center transition-all duration-500 transform">
                        <p className="text-xl text-gray-700 leading-relaxed max-w-4xl font-medium">
                            {services[activeIdx]?.desc}
                        </p>
                        <div className="mt-8">
                            <Link
                                to={getEnlace(services[activeIdx])}
                                className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
                            >
                                Saber más <ChevronRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Mobile Accordion/List Layout */}
                <div className="md:hidden space-y-6">
                    {services.map((srv, idx) => {
                        const isActive = activeIdx === idx;
                        return (
                            <div key={srv._id} className={`bg-white rounded-2xl overflow-hidden shadow-md border ${isActive ? 'border-[#CC0000]' : 'border-gray-200'}`}>
                                <div
                                    className={`p-6 flex items-center gap-4 cursor-pointer transition-colors ${isActive ? 'bg-[#111111] text-white' : 'bg-white text-[#111111]'}`}
                                    onClick={() => setActiveIdx(isActive ? -1 : idx)}
                                >
                                    <div className={`p-3 rounded-full ${isActive ? 'bg-[#CC0000]' : 'bg-[#111111]'}`}>
                                        {renderIconImg(srv, isActive, idx)}
                                    </div>
                                    <h3 className="font-bold text-lg leading-tight">{srv.title}</h3>
                                </div>

                                {isActive && (
                                    <div className="p-6 bg-white">
                                        <p className="text-gray-700 leading-relaxed mb-6">
                                            {srv.desc}
                                        </p>
                                        <Link
                                            to={getEnlace(srv)}
                                            className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors"
                                        >
                                            Saber más <ChevronRight size={18} />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
};

export default Servicios;
