import React from'react';
import { useSiteData } from'../context/SiteContext';
import { MessageCircle } from'lucide-react';
import AnimatedHeadline from'./AnimatedHeadline';
import { getYouTubeId } from './MediaPicker';
import ParticleField from './ParticleField';
import { useTranslation } from 'react-i18next';

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
    const { t, i18n } = useTranslation();
    const data = getNodeData('hero') || {};
    
    // Si la página está en inglés, priorizamos el diccionario.
    // Si está en español, usamos el CMS (o el diccionario si CMS vacío).
    const isEng = i18n.resolvedLanguage?.startsWith('en');
    
    const overline = data.overline || "Sistemas de crecimiento para negocios en la frontera";
    const title = isEng ? t('hero.title') : data.title || t('hero.title');
    const subtitle = isEng ? t('hero.subtitle') : data.subtitle || t('hero.subtitle');
    const ctaText = isEng ? t('hero.ctaText') : data.ctaText || t('hero.ctaText');
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
                    const decoded = decodeURIComponent(url).toLowerCase();
                    if (decoded.includes('ceo cut')) logos.push(logoCeoCuts);
                    else if (decoded.includes('circle one') || decoded.includes('circle')) logos.push(logoCircleOne);
                    else if (decoded.includes('don elote') || decoded.includes('elote')) logos.push(logoDonElote);
                    else if (decoded.includes('facemaker')) logos.push(logoFacemaker);
                    else if (decoded.includes('mrg') || decoded.includes('grupo') || decoded.includes('banquetes')) logos.push(logoGrupoMrg);
                    else if (decoded.includes('medhaus') || decoded.includes('médico')) logos.push(logoMedhaus);
                    else if (decoded.includes('nutrisa')) logos.push(logoNutrisa);
                    else if (decoded.includes('san antonio')) logos.push(logoSanAntonio);
                    else if (decoded.includes('artika')) logos.push(logoArtika);
                    else logos.push(url); // Último recurso
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
 <section id="inicio" className="relative flex items-center justify-center pt-20 pb-4 overflow-hidden bg-black">
 {/* ── Particle Flow Field background ── */}
 <div className="absolute inset-0 z-0 pointer-events-none" style={{ height: '100%' }}>
  <ParticleField
   particleCount={800} /* Optimizado de 2000 a 800 para eliminar el jank/lag en celulares y web. El fillRect lo hace visualmente idéntico. */
   colors={['#CC0000', '#FF2200', '#FF3300', '#FF4400', '#FF5500', '#990000', '#8B0000']}
   speed={1}
   discRadius={0.55}
   orbitSpeed={0.20}
   spiralDrift={0.012}
   repulseRadius={130}
   repulseForce={8}
   followSpeed={0.07}
   fadeAlpha={0.055}
   style={{ width: '100%', height: '100%' }}
  />
 </div>
 {/* Fondo editable desde CMS (sobre partículas) */}
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
