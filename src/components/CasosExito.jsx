import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import logoCeoCuts from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from '../assets/Logos/Circle One Logo@2x.png';
import logoFacemaker from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from '../assets/Logos/Medhaus Logo@2x.png';
import logoArtika from '../assets/Logos/Artika Logo@2x.png';

const CasosExito = () => {
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    const onMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeftState(scrollContainerRef.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Velocidad de arrastre
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

    const cases = [
        { id: 1, logo: logoFacemaker, category: 'Clínica Estética' },
        { id: 2, logo: logoCircleOne, category: 'Hotelería' },
        { id: 3, logo: logoCeoCuts, category: 'Barbería' },
        { id: 4, logo: logoMedhaus, category: 'Sector Médico' },
        { id: 5, logo: logoArtika, category: 'Heladerías' },
        { id: 6, logo: logoGrupoMrg, category: 'Banquetes y Eventos' },
    ];

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
                    <button
                        onClick={scrollLeft}
                        className="absolute left-0 z-20 -ml-4 md:-ml-8 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* Cards Container */}
                    <div
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto hide-scrollbar py-8 px-4 transition-all duration-300 ${isDragging ? 'cursor-grabbing snap-none select-none' : 'cursor-grab snap-x snap-mandatory'}`}
                        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                    >
                        {cases.map((item) => (
                            <div
                                key={item.id}
                                className="flex-none w-[280px] md:w-[350px] aspect-square snap-center relative bg-[#1A1A1A] rounded-[2rem] border-2 border-transparent hover:border-[#CC0000] transition-all duration-300 group/card cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(204,0,0,0.3)]"
                            >
                                {/* Red outline detail from prototype */}
                                <div className="absolute -inset-1 bg-[#CC0000] rounded-[2rem] z-[-1] opacity-0 group-hover/card:opacity-100 transition-opacity blur-sm"></div>
                                <div className="absolute inset-0 bg-[#1A1A1A] rounded-[2rem] z-0"></div>

                                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 gap-6">
                                    <div className="flex-1 flex items-center justify-center w-full">
                                        <img
                                            src={item.logo}
                                            alt="Caso de Éxito"
                                            className="max-h-20 w-auto object-contain brightness-0 invert opacity-60 group-hover/card:opacity-100 group-hover/card:scale-110 transition-all duration-300"
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
                    <button
                        onClick={scrollRight}
                        className="absolute right-0 z-20 -mr-4 md:-mr-8 bg-white text-black p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

            </div>
        </section>
    );
};

export default CasosExito;
