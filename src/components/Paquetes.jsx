import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { client } from '../sanityClient';

const Paquetes = () => {
    const defaultPackages = [
        {
            id: 1,
            title: 'Nivel Expansión',
            price: '$29,900',
            period: 'al mes',
            highlighted: false,
            features: [
                'Todo lo del Nivel Esencial',
                'Tráfico Bilingüe (Ads Meta/Google)',
                'Landing Page de Alta Conversión'
            ],
            guarantee: 'GARANTÍA: Si no generamos leads en 30 días, te devolvemos tu DINERO.'
        },
        {
            id: 2,
            title: 'Nivel Esencial',
            price: '$7,900',
            period: 'al mes',
            highlighted: true,
            features: [
                'Agente IA (Web + WhatsApp)',
                'Respuesta en menos de 5 segundos 24/7',
                'Captura de datos automática'
            ],
            guarantee: 'GARANTÍA: Si no está funcionando en 7 días, el siguiente mes es GRATIS.'
        },
        {
            id: 3,
            title: 'Nivel Élite',
            price: '$39,500',
            period: 'al mes',
            highlighted: false,
            features: [
                'Estrategia Godfather Completa',
                'Reactivación de Base de Datos',
                'Consultoría Mensual y Cierre'
            ],
            guarantee: 'GARANTÍA: Si no aumentamos tus citas un 20% en 90 días, trabajamos GRATIS'
        }
    ];

    const [packages, setPackages] = useState(defaultPackages);
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    useEffect(() => {
        // Consultar el tipo de documento "paquete" desde Sanity
        client.fetch(`*[_type == "paquete"] | order(id asc)`)
            .then((data) => {
                if (data && data.length > 0) {
                    setPackages(data);
                }
            })
            .catch((error) => console.error("Error cargando paquetes de Sanity:", error));
    }, []);

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
                        Ayudamos a pymes, clínicas, despachos y negocios de servicio a convertir tráfico en oportunidades reales: web con UX, embudos, bots y CRM alineados a una sola métrica: más clientes.
                    </p>
                </div>

                {/* Desktop Carousel Layout / Grid */}
                <div className="relative flex items-center group w-full px-2">
                    {/* Scroll Prev Button */}
                    <button
                        onClick={scrollLeft}
                        className="hidden md:flex absolute left-0 z-40 -ml-4 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none hover:bg-[#CC0000] hover:text-white"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto hide-scrollbar py-12 px-2 w-full transition-all duration-300 ${isDragging ? 'cursor-grabbing snap-none select-none' : 'cursor-grab snap-x snap-mandatory'}`}
                        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                    >
                        {packages.map((pkg, index) => {
                            const isHighlighted = pkg.highlighted;
                            return (
                                <div
                                    key={pkg._id || pkg.id}
                                    className={`flex-none w-[320px] md:w-[380px] snap-center rounded-[2rem] p-8 md:p-10 relative flex flex-col justify-between transition-all duration-500
                   ${isHighlighted ?
                                            'bg-[#CC0000] text-white z-20 scale-100 lg:scale-105 shadow-[0_0_40px_rgba(204,0,0,0.4)] border border-red-500/50 min-h-[550px]' :
                                            'bg-[#1A1A1A] text-white z-10 border border-gray-800 hover:border-gray-600 min-h-[480px]'
                                        }
                 `}
                                >
                                    <div>
                                        <h3 className={`text-xl font-medium mb-4 text-center ${isHighlighted ? 'text-white' : 'text-gray-300'}`}>
                                            {pkg.title}
                                        </h3>
                                        <div className="flex items-baseline justify-center gap-1 mb-10">
                                            <span className="text-5xl md:text-6xl font-black tracking-tighter">{pkg.price}</span>
                                            <span className={`text-lg font-medium ${isHighlighted ? 'text-gray-100' : 'text-gray-400'}`}> {pkg.period}</span>
                                        </div>

                                        <ul className="space-y-4">
                                            {pkg.features?.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <CheckCircle2 size={20} className={`shrink-0 mt-0.5 ${isHighlighted ? 'text-white' : 'text-[#25D366]'}`} />
                                                    <span className={`text-sm md:text-base leading-tight ${isHighlighted ? 'text-white font-medium' : 'text-gray-300'}`}>
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-10">
                                        {pkg.guarantee && (
                                            <p className={`text-xs text-center font-medium mb-4 px-2 leading-relaxed ${isHighlighted ? 'text-white/90' : 'text-gray-400'}`}>
                                                {pkg.guarantee}
                                            </p>
                                        )}
                                        {pkg.id === 2 ? (
                                            <Link to="/nivel-esencial" className={`block text-center w-full py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg
                     ${isHighlighted ? 'bg-[#CC0000] text-white border-2 border-white/20 hover:bg-white hover:text-[#CC0000]'
                                                    : 'bg-white text-black hover:bg-gray-200'}
                   `}>
                                                Elegir este plan
                                            </Link>
                                        ) : pkg.id === 1 ? (
                                            <Link to="/nivel-expansion" className={`block text-center w-full py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg
                     ${isHighlighted ? 'bg-[#CC0000] text-white border-2 border-white/20 hover:bg-white hover:text-[#CC0000]'
                                                    : 'bg-white text-black hover:bg-gray-200'}
                   `}>
                                                Contáctanos
                                            </Link>
                                        ) : pkg.id === 3 ? (
                                            <Link to="/nivel-elite" className={`block text-center w-full py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg
                     ${isHighlighted ? 'bg-[#CC0000] text-white border-2 border-white/20 hover:bg-white hover:text-[#CC0000]'
                                                    : 'bg-white text-black hover:bg-gray-200'}
                   `}>
                                                Contáctanos
                                            </Link>
                                        ) : (
                                            <Link to={`/${pkg.title.toLowerCase().replace(/\s+/g, '-')}`} className={`block text-center w-full py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg
                     ${isHighlighted ? 'bg-[#CC0000] text-white border-2 border-white/20 hover:bg-white hover:text-[#CC0000]'
                                                    : 'bg-white text-black hover:bg-gray-200'}
                   `}>
                                                {isHighlighted ? 'Elegir este plan' : 'Contáctanos'}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Scroll Next Button */}
                    <button
                        onClick={scrollRight}
                        className="hidden md:flex absolute right-0 z-40 -mr-4 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-[#CC0000] hover:text-white"
                    >
                        <ChevronRight size={24} />
                    </button>
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
