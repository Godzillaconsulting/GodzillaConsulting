import React from'react';
import { useSiteData } from'../context/SiteContext';
import { MessageCircle } from'lucide-react';
import AnimatedHeadline from'./AnimatedHeadline';
import { getYouTubeId } from './MediaPicker';

import logoCeoCuts from'../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from'../assets/Logos/Circle One Logo@2x.png';
import logoDonElote from'../assets/Logos/Don Elote Logo@2x.png';
import logoFacemaker from'../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from'../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from'../assets/Logos/Medhaus Logo@2x.png';
import logoNutrisa from'../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from'../assets/Logos/San Antonio Logo@2x.png';
import logoArtika from'../assets/Logos/Artika Logo@2x.png';

const Hero = () => {
 const { getNodeData } = useSiteData();
    const data = getNodeData('hero') || {};
    // Fallbacks si la data del CMS está vacía
    const overline = data.overline || "Sistemas de crecimiento para negocios en la frontera";
    const title = data.title || "DETÉN LA FUGA DE LEADS Y ESCALA TU FACTURACIÓN CON INTELIGENCIA ARTIFICIAL.";
    const subtitle = data.subtitle || 'El único sistema de marketing que instala un "Recepcionista Digital" 24/7, reactiva tu base de datos y te garantiza resultados por contrato. Si no cumplimos, no pagas.';
    const ctaText = data.ctaText || "Ver planes y garantías";
    const ctaLink = data.ctaLink || "/#paquetes";
 // Fondo editable desde CMS (se superpone al ColorBends animado)
 const bgVideoUrl = data.bgVideoUrl || data.videoUrl || null;
 const bgImageUrl = data.imageUrl || data.bgImageUrl || null;

    let logos = [];
    if (data.logoUrl1 !== undefined) {
        // Load dynamically from CMS
        for (let i = 1; i <= 20; i++) {
            if (data[`logoUrl${i}`]) {
                const url = data[`logoUrl${i}`];
                const isUploaded = typeof url === 'string' && (url.startsWith('http') || url.startsWith('/api/media')) && !url.includes('/assets/');
                if (isUploaded) {
                    logos.push(url);
                } else {
                    const list = [logoCeoCuts, logoCircleOne, logoDonElote, logoFacemaker, logoGrupoMrg, logoMedhaus, logoNutrisa, logoSanAntonio, logoArtika];
                    const decoded = decodeURIComponent(url).toLowerCase();
                    const match = list.find(src => {
                        if(!src) return false;
                        const dSrc = decodeURIComponent(src).toLowerCase();
                        const terms = ['ceo cuts', 'circle one', 'don elote', 'facemaker', 'grupo mrg', 'medhaus', 'nutrisa', 'san antonio', 'artika'];
                        return terms.some(t => dSrc.includes(t) && decoded.includes(t));
                    });
                    logos.push(match || url);
                }
            }
        }
    } else {
        // Static fallback if not configured in CMS yet
        logos = [
            logoCeoCuts, logoCircleOne, logoDonElote, logoFacemaker,
            logoGrupoMrg, logoMedhaus, logoNutrisa, logoSanAntonio, logoArtika
        ];
    }
 return (
 <section id="inicio" className="relative flex items-center justify-center pt-20 pb-4 overflow-hidden bg-transparent">
 {/* Fondo editable desde CMS (sobre ColorBends) */}
 {bgVideoUrl ? (
     getYouTubeId(bgVideoUrl) ? (
         <iframe src={`https://www.youtube.com/embed/${getYouTubeId(bgVideoUrl)}?controls=0&mute=1&autoplay=1&loop=1&playlist=${getYouTubeId(bgVideoUrl)}`} className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none z-0" frameBorder="0" allow="autoplay; encrypted-media"></iframe>
     ) : bgVideoUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
         <video src={bgVideoUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none z-0" />
     ) : (
         <img src={bgVideoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none z-0" />
     )
 ) : null}
 {!bgVideoUrl && bgImageUrl && (
 <img src={bgImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none z-0" />
 )}
 <div className="container relative z-20 mx-auto px-6 pb-24 md:pb-28 max-w-7xl flex flex-col items-center justify-center text-center pointer-events-none">


 {/* Main Headline — animated ColorBends shader through letter shapes */}
 <AnimatedHeadline
  text={title}
  className="mb-0"
  style={{ marginTop: '-4%', marginBottom: '-4%' }}
  colors={['#CC0000', '#FF2200', '#FF6600', '#8B0000', '#FF4400']}
 />






 {/* Subtitle */}
 <p className="text-sm md:text-base text-white/80 max-w-xl text-center -mt-2 mb-8 pointer-events-auto leading-relaxed drop-shadow">
  {subtitle}
 </p>

 {/* CTA Area */}
 <div className="relative w-full flex justify-center items-center pointer-events-auto">


 <a href={ctaLink} className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-4 rounded-[30px] text-lg font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(204,0,0,0.4)] hover:shadow-[0_0_30px_rgba(204,0,0,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2 w-full sm:w-auto">
 <span className="relative">{ctaText}</span>
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
