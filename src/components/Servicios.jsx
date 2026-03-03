import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
// import bgVideo from '../assets/7020018_Particle_Dot_3840x2160.mp4'; // TEMP: Comentado por falta de archivo
import gifBot from '../assets/Gifs/Bot.gif';
import gifVideo from '../assets/Gifs/Video.gif';
import gifEmbudo from '../assets/Gifs/Embudo.gif';
import gifRedes from '../assets/Gifs/Redes Sociales.gif';
import gifSeo from '../assets/Gifs/Red Social Optimizar.gif';
import gifCrm from '../assets/Gifs/Estadistica.gif';

const Servicios = () => {
    const [activeIdx, setActiveIdx] = useState(0);

    const services = [
        {
            id: 'bots',
            icon: <img src={gifBot} alt="Bot" className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 object-contain transition-all group-hover:brightness-0 group-hover:invert" />,
            title: 'Automatización de Bots',
            desc: 'Automatiza tu atención al cliente 24/7 con bots entrenados en tu negocio, que responden dudas, califican prospectos y los llevan directo a la cita o a la venta. Integrados con WhatsApp, redes sociales y tu CRM.'
        },
        {
            id: 'video',
            icon: <img src={gifVideo} alt="Video" className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 object-contain transition-all group-hover:brightness-0 group-hover:invert" />,
            title: 'Producción audiovisual',
            desc: 'Creamos contenido audiovisual estratégico que genera confianza, autoridad, fortalece tu marca, comunica tu propuesta de valor y potencia la conversión en campañas y redes sociales.'
        },
        {
            id: 'funnels',
            icon: <img src={gifEmbudo} alt="Embudo" className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 object-contain transition-all group-hover:brightness-0 group-hover:invert" />,
            title: 'Embudos de venta',
            desc: 'Estructuramos embudos digitales orientados a resultados que convierten tráfico en citas y oportunidades comerciales medibles.'
        },
        {
            id: 'social',
            icon: <img src={gifRedes} alt="Redes Sociales" className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 object-contain transition-all group-hover:brightness-0 group-hover:invert" />,
            title: 'Gestión de redes sociales',
            desc: 'Administramos la presencia digital de tu marca con una estrategia de contenido profesional, enfocada en posicionamiento, reputación y generación de prospectos.'
        },
        {
            id: 'seo',
            icon: <img src={gifSeo} alt="SEO" className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 object-contain transition-all group-hover:brightness-0 group-hover:invert" />,
            title: 'Optimización web y SEO',
            desc: 'Optimizamos tu sitio web y su estructura SEO para mejorar visibilidad en buscadores, experiencia de usuario y generación de leads calificados.'
        },
        {
            id: 'crm',
            icon: <img src={gifCrm} alt="CRM" className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 object-contain transition-all group-hover:brightness-0 group-hover:invert" />,
            title: 'CRM con SAAS personalizado',
            desc: 'Implementamos plataformas CRM y soluciones SaaS a la medida para centralizar contactos, automatizar seguimientos y facilitar la gestión comercial de tu equipo.'
        }
    ];

    return (
        <section id="servicios" className="relative bg-[#F4F4F4] pb-24">

            {/* Header with Video Background */}
            <div className="relative w-full h-[400px] bg-[#050505] overflow-hidden flex flex-col pt-20">
                {/* VIDEO TEMPORALMENTE COMENTADO
<video
                    src={bgVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen"
                />
*/}
                {/* PLACEHOLDER PARA MANTENER EL DISEÑO */}
                <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10">
                    <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center mb-4 opacity-50"><span className="text-2xl ml-1">▶</span></div>
                    <span className="text-lg font-medium">Video Placeholder</span>
                    <span className="text-sm mt-1">Archivo de video faltante</span>
                </div>
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
                                <div key={srv.id} className="relative z-10 flex flex-col items-center group cursor-pointer" onClick={() => setActiveIdx(idx)}>
                                    <div className={`w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-[#CC0000] border-[6px] border-white outline outline-4 outline-[#CC0000] scale-[1.15] shadow-2xl z-20' : 'bg-[#18181b] border-[6px] border-white hover:bg-[#333333] hover:scale-105 shadow-lg'}`}>
                                        <div className={`text-white transition-all ${isActive ? 'brightness-0 invert' : ''} flex items-center justify-center`} style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}>
                                            {srv.icon}
                                        </div>
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
                            {services[activeIdx].desc}
                        </p>
                        <div className="mt-8">
                            {activeIdx === 0 ? (
                                <Link to="/bots" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </Link>
                            ) : activeIdx === 1 ? (
                                <Link to="/audiovisual" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </Link>
                            ) : activeIdx === 2 ? (
                                <Link to="/embudos" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </Link>
                            ) : activeIdx === 3 ? (
                                <Link to="/redes" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </Link>
                            ) : activeIdx === 4 ? (
                                <Link to="/seo" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </Link>
                            ) : activeIdx === 5 ? (
                                <Link to="/crm" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </Link>
                            ) : (
                                <button className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
                                    Saber más <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Accordion/List Layout */}
                <div className="md:hidden space-y-6">
                    {services.map((srv, idx) => {
                        const isActive = activeIdx === idx;
                        return (
                            <div key={srv.id} className={`bg-white rounded-2xl overflow-hidden shadow-md border ${isActive ? 'border-[#CC0000]' : 'border-gray-200'}`}>
                                <div
                                    className={`p-6 flex items-center gap-4 cursor-pointer transition-colors ${isActive ? 'bg-[#111111] text-white' : 'bg-white text-[#111111]'}`}
                                    onClick={() => setActiveIdx(isActive ? -1 : idx)}
                                >
                                    <div className={`p-3 rounded-full flex items-center justify-center ${isActive ? 'bg-[#CC0000] text-white [&_img]:brightness-0 [&_img]:invert' : 'bg-[#111111] text-white'}`}>
                                        {srv.icon}
                                    </div>
                                    <h3 className="font-bold text-lg leading-tight">{srv.title}</h3>
                                </div>

                                {isActive && (
                                    <div className="p-6 bg-white">
                                        <p className="text-gray-700 leading-relaxed mb-6">
                                            {srv.desc}
                                        </p>
                                        {idx === 0 ? (
                                            <Link to="/bots" className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </Link>
                                        ) : idx === 1 ? (
                                            <Link to="/audiovisual" className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </Link>
                                        ) : idx === 2 ? (
                                            <Link to="/embudos" className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </Link>
                                        ) : idx === 3 ? (
                                            <Link to="/redes" className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </Link>
                                        ) : idx === 4 ? (
                                            <Link to="/seo" className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </Link>
                                        ) : idx === 5 ? (
                                            <Link to="/crm" className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </Link>
                                        ) : (
                                            <button className="bg-[#CC0000] text-white w-full py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 hover:bg-white hover:text-[#CC0000] border border-transparent hover:border-[#CC0000] transition-colors">
                                                Saber más <ChevronRight size={18} />
                                            </button>
                                        )}
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
