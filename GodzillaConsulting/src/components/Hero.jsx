import React from 'react';
import { MessageCircle } from 'lucide-react';

import logoCeoCuts from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from '../assets/Logos/Circle One Logo@2x.png';
import logoDonElote from '../assets/Logos/Don Elote Logo@2x.png';
import logoFacemaker from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from '../assets/Logos/Medhaus Logo@2x.png';
import logoNutrisa from '../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from '../assets/Logos/San Antonio Logo@2x.png';
import logoArtika from '../assets/Logos/Artika Logo@2x.png';
import heroVideo from '../assets/Intro_LP_final_Optimized.mp4';
import ColorBends from './ColorBends';

const Hero = () => {
    const logos = [
        logoCeoCuts, logoCircleOne, logoDonElote, logoFacemaker,
        logoGrupoMrg, logoMedhaus, logoNutrisa, logoSanAntonio, logoArtika
    ];
    return (
        <section id="inicio" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0 bg-[#111111] bg-cover bg-center" style={{ backgroundImage: "url('/background-building.jpg')" }}>
                {/* Overlay negro semi-transparente para opacar el fondo */}
                <div className="absolute inset-0 bg-[#111111]/70 z-10 pointer-events-none"></div>
            </div>

            <div className="container relative z-20 mx-auto px-6 pb-32 md:pb-40 max-w-7xl flex flex-col items-center justify-center text-center">

                {/* Main Headline */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-tight max-w-4xl drop-shadow-2xl">
                    Construyamos juntos el legado de tu negocio
                </h1>

                {/* Subtitle / CTA Area */}
                <div className="mt-16 md:mt-24 relative w-full flex justify-center items-center h-[300px]">
                    {/* CTA Z-index alto para dominar el hover y click */}
                    <a href="#paquetes" className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-10 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-4 rounded-[30px] text-lg font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(204,0,0,0.4)] hover:shadow-[0_0_30px_rgba(204,0,0,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2 w-max">
                        <span className="relative">Ver planes y garantías</span>
                    </a>
                </div>

            </div>

            {/* Logos Strip Showcase */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#111111] to-transparent py-6 z-20 overflow-hidden">
                <div className="flex items-center w-max animate-marquee-right opacity-60 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300">
                    {[...logos, ...logos].map((src, idx) => (
                        <div key={idx} className="flex-none px-6 md:px-12 flex justify-center items-center">
                            <img src={src} alt="Client Logo" className="object-contain max-h-16 md:max-h-20 w-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </section >
    );
};

export default Hero;
