import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { client } from '../sanityClient';

import godzillaHover from '../assets/images/Godzilla-Holding.png';

const Paquetes = () => {
    const defaultPackages = [

        {
            id: 1,
            title: 'Posicionamiento Social',
            price: '$7,900',
            period: 'al mes',
            highlighted: false,
            features: [
                'Estrategia de Contenido Omnicanal',
                'Copywriting de Respuesta Directa',
                'Community Management'
            ],
            guarantee: 'GARANTÍA: Si en 14 días no ves un incremento real en el engagement, el siguiente mes es GRATIS.'
        },
        {
            id: 2,
            title: 'Control IA',
            price: '$7,900',
            period: 'al mes',
            highlighted: false,
            features: [
                'Agente IA (Web + WhatsApp)',
                'Respuesta en menos de 5 segundos 24/7',
                'Captura de datos automática'
            ],
            guarantee: 'GARANTÍA: Si no está funcionando en 7 días, el siguiente mes es GRATIS.'
        },
        {
            id: 3,
            title: 'Expansión',
            price: '$29,900',
            period: 'al mes',
            highlighted: true,
            features: [
                'Todo lo del Nivel Esencial',
                'Tráfico Bilingüe (Ads Meta/Google)',
                'Landing Page de Alta Conversión'
            ],
            guarantee: 'GARANTÍA: Si no generamos leads en 30 días, te devolvemos tu DINERO.'
        },
        {
            id: 4,
            title: 'Élite',
            price: '$39,500',
            period: 'al mes',
            highlighted: false,
            features: [
                'Estrategia Godfather Completa',
                'Reactivación de Base de Datos',
                'Consultoría Mensual y Cierre'
            ],
            guarantee: 'GARANTÍA: Si no aumentamos tus citas un 20% en 90 días, trabajamos GRATIS.'
        }
    ];

    const [packages, setPackages] = useState(defaultPackages);
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const checkScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        // Permite un margen de error de un par de pixeles para distintos dispositivos
        setShowLeftArrow(scrollLeft > 2);
        setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
    };

    useEffect(() => {
        // Consultar el tipo de documento "paquete" desde Sanity
        client.fetch(`*[_type == "paquete"] | order(id asc)`)
            .then((data) => {
                if (data && data.length > 0) {
                    const finalData = data.map((pkg) => ({
                        ...pkg,
                        highlighted: pkg.id === 3
                    }));
                    setPackages(finalData);
                }
            })
            .catch((error) => console.error("Error cargando paquetes de Sanity:", error));
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [packages]);

    const onMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeftState(scrollContainerRef.current.scrollLeft);
    };

    const onMouseLeave = () => setIsDragging(false);
    const onMouseUp = () => setIsDragging(false);

    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
    };

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -380, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' });
        }
    };

    return (
        <section id="paquetes" className="py-24 bg-[#111111] overflow-hidden">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
                        PAQUETES
                    </h2>
                    <p className="text-xl text-gray-300 font-medium max-w-4xl mx-auto leading-relaxed">
                        Aprende más sobre la estrategia más adecuada para potenciar tu negocio. Todo esta protegido por contrato.
                    </p>
                </div>

                {/* Desktop Carousel Layout / Grid */}
                <div className="relative flex items-center group w-full px-2">
                    {/* Scroll Prev Button */}
                    {showLeftArrow && (
                        <button
                            onClick={scrollLeft}
                            className="hidden md:flex absolute left-0 z-40 -ml-4 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none hover:bg-[#CC0000] hover:text-white"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    <div
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto hide-scrollbar py-12 px-2 w-full transition-all duration-300 ${isDragging ? 'cursor-grabbing snap-none select-none' : 'cursor-grab snap-x snap-mandatory'}`}
                        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                        onScroll={checkScroll}
                    >
                        {packages.map((pkg, index) => {
                            return (
                                <div key={pkg._id || pkg.id} className="relative flex-none w-[320px] md:w-[380px] snap-center group/card">
                                    {/* Red Glow Background (Casos Exito Style) */}
                                    <div className="absolute -inset-1 bg-[#CC0000] rounded-[2rem] opacity-0 group-hover/card:opacity-100 transition-all duration-500 blur-[8px] z-0"></div>

                                    <div
                                        className="relative w-full h-full rounded-[2rem] p-8 md:p-10 flex flex-col justify-between transition-all duration-500 bg-[#0A0A0A] text-white z-10 border border-gray-800 hover:border-[#CC0000] hover:-translate-y-4 min-h-[520px] shadow-2xl"
                                    >
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-bold mb-4 text-center text-white">
                                                {pkg.title}
                                            </h3>
                                            <div className="flex items-baseline justify-center gap-1 mb-8">
                                                <span className="text-5xl md:text-6xl font-black tracking-tighter text-white">{pkg.price}</span>
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest"> {pkg.period}</span>
                                            </div>

                                            {/* "Ideal para" section */}
                                            <p className="text-[11px] text-center text-gray-400 mb-6 italic leading-relaxed">
                                                Ideal para: {pkg.title === 'Expansión' ? 'Conseguir volumen de prospectos nuevos cada semana.' : 'Impulsar el crecimiento y la presencia digital.'}
                                            </p>

                                            <ul className="space-y-4">
                                                {pkg.features?.map((feature, i) => (
                                                    <li key={i} className="flex items-start gap-3">
                                                        <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[#25D366]" />
                                                        <span className="text-sm leading-tight text-gray-300">
                                                            {feature}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="relative z-10 mt-8">
                                            {pkg.guarantee && (
                                                <p className="text-[10px] text-center font-medium mb-6 px-1 leading-relaxed text-gray-400">
                                                    {pkg.guarantee}
                                                </p>
                                            )}
                                            <Link
                                                to={`/${pkg.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`}
                                                className="block text-center w-full py-3.5 rounded-full font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl bg-white text-[#CC0000] hover:bg-black hover:text-white hover:scale-105"
                                            >
                                                Ver Garantía
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Scroll Next Button */}
                    {showRightArrow && (
                        <button
                            onClick={scrollRight}
                            className="hidden md:flex absolute right-0 z-40 -mr-4 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-[#CC0000] hover:text-white"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>

                <div className="text-center mt-12 text-gray-500 text-sm">
                    <p>
                        Los precios mostrados se muestran en MXN. Para más detalles, consulta nuestros <Link to="/terminos" className="underline hover:text-white">Términos y Condiciones</Link>.
                    </p>
                    <p className="mt-2">
                        ¿Tienes más dudas? Consulta nuestro <Link to="/faq" className="underline hover:text-white">FAQ</Link>.
                    </p>
                </div>

            </div>
        </section>
    );
};

export default Paquetes;
