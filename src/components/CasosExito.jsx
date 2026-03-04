import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { client, urlFor } from '../sanityClient';

import logoCeoCuts from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from '../assets/Logos/Circle One Logo@2x.png';
import logoFacemaker from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from '../assets/Logos/Medhaus Logo@2x.png';
import logoArtika from '../assets/Logos/Artika Logo@2x.png';

const defaultCases = [
    { _id: 'default-1', orden: 1, logoSrc: logoFacemaker, nombre: 'Facemaker', category: 'Clínica Estética' },
    { _id: 'default-2', orden: 2, logoSrc: logoCircleOne, nombre: 'Circle One', category: 'Hotelería' },
    { _id: 'default-3', orden: 3, logoSrc: logoCeoCuts, nombre: 'CEO Cuts', category: 'Barbería' },
    { _id: 'default-4', orden: 4, logoSrc: logoMedhaus, nombre: 'Medhaus', category: 'Sector Médico' },
    { _id: 'default-5', orden: 5, logoSrc: logoArtika, nombre: 'Artika', category: 'Heladerías' },
    { _id: 'default-6', orden: 6, logoSrc: logoGrupoMrg, nombre: 'Grupo MRG', category: 'Banquetes y Eventos' },
];

const CasosExito = () => {
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);
    const [cases, setCases] = useState(defaultCases);

    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const checkScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 2);
        setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [cases]);

    useEffect(() => {
        client
            .fetch(`*[_type == "casoExito"] | order(orden asc)`)
            .then((data) => {
                if (data && data.length > 0) {
                    setCases(data);
                }
            })
            .catch((error) => console.error('Error cargando casos de éxito de Sanity:', error));
    }, []);

    const getLogoSrc = (item) => {
        if (item.logo) return urlFor(item.logo).width(500).url();
        return item.logoSrc;
    };

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
            scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
        }
    };

    return (
        <section id="portafolio" className="py-24 bg-[#111111] relative overflow-hidden">
            {/* Decorative Network Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

            <div className="container mx-auto px-6 max-w-7xl relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
                        CASOS DE ÉXITO
                    </h2>
                    <p className="text-xl text-gray-400 font-medium">
                        No hacemos solo campañas, construimos sistemas
                    </p>
                </div>

                <div className="relative flex items-center group">

                    {/* Scroll Prev Button */}
                    {showLeftArrow && (
                        <button
                            onClick={scrollLeft}
                            className="absolute left-0 z-20 -ml-4 md:-ml-8 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    <div
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto hide-scrollbar py-8 px-4 transition-all duration-300 ${isDragging ? 'cursor-grabbing snap-none select-none' : 'cursor-grab snap-x snap-mandatory'}`}
                        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                        onScroll={checkScroll}
                    >
                        {cases.map((item) => (
                            <div
                                key={item._id}
                                className="flex-none w-[280px] md:w-[350px] aspect-square snap-center relative bg-[#1A1A1A] rounded-[2rem] border-2 border-transparent hover:border-[#CC0000] transition-all duration-300 group/card cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(204,0,0,0.3)]"
                            >
                                {/* Red outline detail from prototype */}
                                <div className="absolute -inset-1 bg-[#CC0000] rounded-[2rem] z-[-1] opacity-0 group-hover/card:opacity-100 transition-opacity blur-sm"></div>
                                <div className="absolute inset-0 bg-[#1A1A1A] rounded-[2rem] z-0"></div>

                                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 gap-6">
                                    <div className="flex-1 flex items-center justify-center w-full">
                                        <img
                                            src={getLogoSrc(item)}
                                            alt={item.nombre || 'Caso de Éxito'}
                                            className="max-h-36 w-full object-contain opacity-60 group-hover/card:opacity-100 group-hover/card:scale-110 transition-all duration-300 px-4"
                                        />
                                    </div>
                                    <div className="text-sm text-gray-400 text-center font-medium mt-auto border-t border-[#CC0000]/30 w-full pt-4">
                                        {item.category}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scroll Next Button */}
                    {showRightArrow && (
                        <button
                            onClick={scrollRight}
                            className="absolute right-0 z-20 -mr-4 md:-mr-8 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>

            </div>
        </section>
    );
};

export default CasosExito;
