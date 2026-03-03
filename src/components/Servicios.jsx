import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { client, urlFor } from '../sanityClient';

import bgVideo from '../assets/7020018_Particle_Dot_3840x2160.mp4';
import gifBot from '../assets/Gifs/Bot.gif';
import gifVideo from '../assets/Gifs/Video.gif';
import gifEmbudo from '../assets/Gifs/Embudo.gif';
import gifRedes from '../assets/Gifs/Redes Sociales.gif';
import gifSeo from '../assets/Gifs/Red Social Optimizar.gif';
import gifCrm from '../assets/Gifs/Estadistica.gif';

const defaultServices = [
    { _id: 'default-bots', orden: 1, id: { current: 'bots' }, iconSrc: gifBot, title: 'Automatización de Bots', enlace: '/bots', desc: 'Automatiza tu atención al cliente 24/7 con bots entrenados en tu negocio, que responden dudas, califican prospectos y los llevan directo a la cita o a la venta. Integrados con WhatsApp, redes sociales y tu CRM.' },
    { _id: 'default-video', orden: 2, id: { current: 'video' }, iconSrc: gifVideo, title: 'Producción audiovisual', enlace: '/audiovisual', desc: 'Creamos contenido audiovisual estratégico que genera confianza, autoridad, fortalece tu marca, comunica tu propuesta de valor y potencia la conversión en campañas y redes sociales.' },
    { _id: 'default-funnels', orden: 3, id: { current: 'funnels' }, iconSrc: gifEmbudo, title: 'Embudos de venta', enlace: '/embudos', desc: 'Estructuramos embudos digitales orientados a resultados que convierten tráfico en citas y oportunidades comerciales medibles.' },
    { _id: 'default-social', orden: 4, id: { current: 'social' }, iconSrc: gifRedes, title: 'Gestión de redes sociales', enlace: '/redes', desc: 'Administramos la presencia digital de tu marca con una estrategia de contenido profesional, enfocada en posicionamiento, reputación y generación de prospectos.' },
    { _id: 'default-seo', orden: 5, id: { current: 'seo' }, iconSrc: gifSeo, title: 'Optimización web y SEO', enlace: '/seo', desc: 'Optimizamos tu sitio web y su estructura SEO para mejorar visibilidad en buscadores, experiencia de usuario y generación de leads calificados.' },
    { _id: 'default-crm', orden: 6, id: { current: 'crm' }, iconSrc: gifCrm, title: 'CRM con SAAS personalizado', enlace: '/crm', desc: 'Implementamos plataformas CRM y soluciones SaaS a la medida para centralizar contactos, automatizar seguimientos y facilitar la gestión comercial de tu equipo.' },
];

const Servicios = () => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [services, setServices] = useState(defaultServices);

    useEffect(() => {
        client
            .fetch(`*[_type == "servicio"] | order(orden asc)`)
            .then((data) => {
                if (data && data.length > 0) {
                    setServices(data);
                }
            })
            .catch((error) => console.error('Error cargando servicios de Sanity:', error));
    }, []);

    // Obtiene la URL del ícono: desde Sanity o desde el asset local
    const getIconSrc = (srv) => {
        if (srv.icono) return urlFor(srv.icono).width(64).height(64).url();
        return srv.iconSrc;
    };

    // Obtiene el enlace: desde Sanity o desde el default
    const getEnlace = (srv) => srv.enlace || '#servicios';

    const renderIconImg = (srv, isActive = false) => (
        <img
            src={getIconSrc(srv)}
            alt={srv.title}
            className="w-8 h-8 object-contain transition-all"
            style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
        />
    );

    return (
        <section id="servicios" className="relative bg-[#F4F4F4] pb-24">

            {/* Header with Video Background */}
            <div className="relative w-full h-[400px] bg-[#050505] overflow-hidden flex flex-col pt-20">
                <video
                    src={bgVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/80 via-transparent to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#111111] to-transparent z-10"></div>
                <h2 className="relative z-20 text-5xl md:text-7xl font-black text-center text-white mt-10 tracking-tighter drop-shadow-2xl">
                    SERVICIOS
                </h2>
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
                                        {renderIconImg(srv, isActive)}
                                    </div>
                                    <h3 className={`mt-8 text-center font-bold text-base md:text-lg max-w-[180px] text-[#CC0000] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
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
                                        {renderIconImg(srv, true)}
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
