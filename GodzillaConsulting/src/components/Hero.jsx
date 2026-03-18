import React from 'react';

import logoCeoCuts from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from '../assets/Logos/Circle One Logo@2x.png';
import logoDonElote from '../assets/Logos/Don Elote Logo@2x.png';
import logoFacemaker from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from '../assets/Logos/Medhaus Logo@2x.png';
import logoNutrisa from '../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from '../assets/Logos/San Antonio Logo@2x.png';
import logoArtika from '../assets/Logos/Artika Logo@2x.png';

const Hero = () => {
    const logos = [
        logoCeoCuts, logoCircleOne, logoDonElote, logoFacemaker,
        logoGrupoMrg, logoMedhaus, logoNutrisa, logoSanAntonio, logoArtika
    ];
    return (
        <section id="inicio" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-transparent">

            {/* Content Layer */}
            <div style={{ position: 'relative', zIndex: 2 }} className="container mx-auto px-6 pb-32 md:pb-40 max-w-7xl flex flex-col items-center justify-center text-center pointer-events-none">

                {/* Main Headline */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-tight max-w-4xl drop-shadow-2xl pointer-events-auto">
                    Construyamos juntos el legado de tu negocio
                </h1>

                {/* CTA */}
                <div className="mt-16 md:mt-24 relative w-full flex justify-center items-center h-[300px] pointer-events-auto">
                    <a href="#paquetes" className="absolute bottom-[20%] left-1/2 -translate-x-1/2 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-4 rounded-[30px] text-lg font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(204,0,0,0.4)] hover:shadow-[0_0_30px_rgba(204,0,0,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2 w-max">
                        <span>Ver planes y garantías</span>
                    </a>
                </div>

            </div>

            {/* Logos Strip */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#111111] to-transparent py-6 overflow-hidden" style={{ zIndex: 3 }}>
                <div className="flex items-center w-max animate-marquee-right opacity-60 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300">
                    {[...logos, ...logos].map((src, idx) => (
                        <div key={idx} className="flex-none px-6 md:px-12 flex justify-center items-center">
                            <img src={src} alt="Client Logo" className="object-contain max-h-16 md:max-h-20 w-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
