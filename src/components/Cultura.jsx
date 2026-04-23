import React, { useState, useEffect, useRef } from'react';
import { Target, Eye, ChevronLeft, ChevronRight } from'lucide-react';
import { useSiteData } from '../context/SiteContext';
import { getYouTubeId } from './MediaPicker';
import DynamicMedia from './DynamicMedia';
const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
const culturaImage = `${API_URL}/api/media/assets/Nuestra%20cultura%20image.jpg?v=cf2`;
const culturaVideo = `${API_URL}/api/media/assets/Particulas%20Rojas.mp4?v=cf2`;
import { trackGodzillaEvent } from '../utils/analyticsHelper';
import { useTranslation } from 'react-i18next';

const Cultura = () => {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.resolvedLanguage?.startsWith('es') || !i18n.resolvedLanguage;
  const { getNodeData } = useSiteData();
  const nodeData = getNodeData('cultura') || {};

  // Si mediaGallery está vacío, muestra un placeholder transparente
  let mediaGallery = nodeData.mediaGallery && nodeData.mediaGallery.filter(m => m.url).length > 0
    ? nodeData.mediaGallery.filter(m => m.url)
    : [ { type: 'image', url: 'https://placehold.co/800x600/111111/333333?text=Agrega+tus+fotos+en+Admin+Studio' } ];

  if (mediaGallery.length === 1 && mediaGallery[0].url.includes('placehold.co')) {
      mediaGallery.push({ type: 'image', url: 'https://placehold.co/800x600/111111/333333?text=Haz+clic+en+Añadir+Medio' });
  }

  // Prevenir que un string vacío reviva a Godzilla en el fondo:
  let finalBgVideo = nodeData.bgVideoUrl !== undefined && nodeData.bgVideoUrl !== '' 
      ? nodeData.bgVideoUrl 
      : (nodeData.bgVideoUrl === '' ? '' : culturaVideo);

  if (typeof finalBgVideo === 'string') {
      if (finalBgVideo.includes('godzillaconsulting.ai/api/media')) {
          finalBgVideo = finalBgVideo.replace(/https?:\/\/(www\.)?godzillaconsulting\.ai/g, 'https://bot.godzillaconsulting.ai');
      }
      if (finalBgVideo.startsWith('/api/media')) {
          finalBgVideo = `${API_URL}${finalBgVideo}`;
      }
      if (finalBgVideo.includes('/api/media') && !finalBgVideo.includes('v=cf2')) {
          finalBgVideo += (finalBgVideo.includes('?') ? '&' : '?') + 'v=cf2';
      }
  }

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // ── Typewriter effect ──────────────────────────────────────────────────
  const rawTitle = isSpanish ? (nodeData.title || 'CULTURA') : t('culture.titleRed');
  const [typedTitle, setTypedTitle] = useState('');
  const [startTyping, setStartTyping] = useState(false);
  const titleContainerRef = useRef(null);

  useEffect(() => {
      const observer = new IntersectionObserver(
          ([entry]) => {
              if (entry.isIntersecting) {
                  setStartTyping(true);
              } else {
                  setStartTyping(false);
                  setTypedTitle('');
              }
          },
          { threshold: 0.3 }
      );
      if (titleContainerRef.current) observer.observe(titleContainerRef.current);
      return () => observer.disconnect();
  }, []);

  useEffect(() => {
      if (!startTyping) return;
      let i = 0;
      let current = '';
      const interval = setInterval(() => {
          if (i < rawTitle.length) {
              current += rawTitle.charAt(i);
              setTypedTitle(current);
              i++;
          } else {
              clearInterval(interval);
          }
      }, 120);
      return () => clearInterval(interval);
  }, [rawTitle, startTyping]);

  const [rightSlide, setRightSlide] = useState(0);
  const [rightIsPaused, setRightIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000); // 6 seconds auto-slide
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (rightIsPaused) return;
    const timer = setInterval(() => {
      setRightSlide((prev) => (prev === mediaGallery.length - 1 ? 0 : prev + 1));
    }, 6000); // 6 seconds auto-slide
    return () => clearInterval(timer);
  }, [rightIsPaused, mediaGallery.length]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [rightTouchStart, setRightTouchStart] = useState(null);
  const [rightTouchEnd, setRightTouchEnd] = useState(null);
  const [rightIsDragging, setRightIsDragging] = useState(false);

  // Minimum swipe distance (in px) reduced for faster response
  const minSwipeDistance = 30;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
    setIsPaused(true);
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    setIsPaused(true);
    setTouchEnd(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setIsPaused(false);
      return;
    }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
      trackGodzillaEvent('Cultura_Bio_Swipe');
    }

    setIsDragging(false);
    setIsPaused(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const onRightTouchStart = (e) => {
    setRightTouchEnd(null);
    setRightTouchStart(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
    setRightIsPaused(true);
    setRightIsDragging(true);
  };

  const onRightTouchMove = (e) => {
    if (!rightIsDragging) return;
    setRightIsPaused(true);
    setRightTouchEnd(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
  };

  const onRightTouchEnd = () => {
    if (!rightTouchStart || !rightTouchEnd) {
      setRightIsDragging(false);
      setRightIsPaused(false);
      return;
    }
    const distance = rightTouchStart - rightTouchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setRightSlide((prev) => (prev === mediaGallery.length - 1 ? 0 : prev + 1));
      trackGodzillaEvent('Cultura_Gallery_Swipe_Next');
    } else if (isRightSwipe) {
      setRightSlide((prev) => (prev === 0 ? mediaGallery.length - 1 : prev - 1));
      trackGodzillaEvent('Cultura_Gallery_Swipe_Prev');
    }

    setRightIsDragging(false);
    setRightIsPaused(false);
    setRightTouchStart(null);
    setRightTouchEnd(null);
  };
 return (
 <section id="cultura" className="relative py-24 bg-[#111111] overflow-hidden">
 {/* Video de fondo — editable desde Admin Studio (bgVideoUrl) */}
 {finalBgVideo ? (
    getYouTubeId(finalBgVideo) ? (
        <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(finalBgVideo)}?controls=0&mute=1&autoplay=1&loop=1&playlist=${getYouTubeId(finalBgVideo)}`}
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            frameBorder="0"
            allow="autoplay; encrypted-media"
        ></iframe>
    ) : finalBgVideo.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
        <video
            src={finalBgVideo}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
    ) : (
        <img
            src={finalBgVideo}
            alt="Fondo Cultura"
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
    )
 ) : null}
 {/* Overlay oscuro para legibilidad */}
 <div className="absolute inset-0 bg-[#111111]/60 pointer-events-none" />
 <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-[#CC0000]/10 to-transparent blur-[100px] pointer-events-none"></div>

 <div className="container relative z-10 mx-auto px-6 max-w-7xl">
 <div className="grid lg:grid-cols-2 gap-16 items-center">

 {/* Text Content */}
 <div className="space-y-12">
 <div ref={titleContainerRef}>
 <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
 <span className="block text-gray-500">{isSpanish ? (nodeData.overline || 'NUESTRA') : t('culture.title')}</span>
 <span className="inline-block animate-blink-cursor">{typedTitle}</span>
 </h2>
 <div className="w-24 h-2 bg-[#CC0000] mb-8"></div>

 {/* Slider Container */}
 <div
 className="relative overflow-hidden cursor-grab active:cursor-grabbing pb-4"
 onMouseEnter={() => setIsPaused(true)}
 onMouseLeave={() => { setIsPaused(false); setIsDragging(false); }}
 onTouchStart={onTouchStart}
 onTouchMove={onTouchMove}
 onTouchEnd={onTouchEnd}
 onMouseDown={onTouchStart}
 onMouseMove={isDragging ? onTouchMove : undefined}
 onMouseUp={onTouchEnd}
 onMouseLeaveCapture={onTouchEnd}
 >
 <div className="flex transition-transform duration-700 ease-in-out" style={{ width: '200%', transform: `translateX(-${(currentSlide * 100) / 2}%)` }}>

 {/* Slide 1: Description */}
 <div style={{ width: '50%' }} className="flex-shrink-0 pr-4 py-4 relative pointer-events-none select-none">
 <div className="space-y-6 text-xl md:text-3xl text-gray-300 font-light leading-relaxed whitespace-pre-line">
 {isSpanish ? (
 nodeData.description ? <p>{nodeData.description}</p> : (
 <>
 <p>
 Somos una agencia de marketing digital ubicada en <strong className="text-white font-medium">Ciudad Juárez, Chihuahua</strong>.
 </p>
 <p>
 Hemos trabajado con médicos, clínicas estéticas, abogados, hoteles, restaurantes y más.
 </p>
 <p>
 Diseñamos campañas y sistemas que priorizan <strong className="text-white font-medium border-b-2 border-[#CC0000]">ventas y rentabilidad</strong>.
 </p>
 </>
 )) : (
 <p>{t('culture.description')}</p>
 )}
 </div>
 </div>

 {/* Slide 2: Mission & Vision */}
 <div style={{ width: '50%' }} className="flex-shrink-0 pr-4 py-4 relative pointer-events-none select-none">
 <div className="space-y-12">
 <div className="group">
 <h3 className="text-3xl md:text-4xl font-black text-white tracking-wide mb-6">{isSpanish ? 'MISIÓN' : t('culture.mission')}</h3>
 <p className="text-gray-300 leading-relaxed text-xl md:text-2xl font-light whitespace-pre-line">
 {isSpanish ? (nodeData.missionText || 'Ayudar a empresas mexicanas a crecer usando tecnología y estrategias digitales. Creemos que todos los negocios merecen las herramientas para competir y prosperar en el mundo actual.') : t('culture.missionText')}
 </p>
 </div>

 <div className="group">
 <h3 className="text-3xl md:text-4xl font-black text-white tracking-wide mb-6">{isSpanish ? 'VISIÓN' : t('culture.vision')}</h3>
 <p className="text-gray-300 leading-relaxed text-xl md:text-2xl font-light whitespace-pre-line">
 {isSpanish ? (nodeData.visionText || 'Multiplicar el 15% de negocios digitalizados en México y elevar ese 4% de éxito, convirtiéndonos en el motor del crecimiento digital del país.') : t('culture.visionText')}
 </p>
 </div>
 </div>
 </div>

 </div>

 {/* Pagination Dots */}
 <div className="flex justify-start gap-3 mt-12">
 <button
 onClick={() => setCurrentSlide(0)}
 className={`h-2 rounded-full transition-all duration-300 ${currentSlide === 0 ?'bg-[#CC0000] w-8' :'bg-gray-700 hover:bg-gray-500 w-2'}`}
 aria-label="Ver descripción"
 ></button>
 <button
 onClick={() => setCurrentSlide(1)}
 className={`h-2 rounded-full transition-all duration-300 ${currentSlide === 1 ?'bg-[#CC0000] w-8' :'bg-gray-700 hover:bg-gray-500 w-2'}`}
 aria-label="Ver misión y visión"
 ></button>
 </div>
 </div>
 </div>
 </div>

        {/* Right Slider */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-[#CC0000] rounded-2xl transform translate-x-4 translate-y-4 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500"></div>
          <div 
            className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-gray-900 shadow-2xl cursor-grab active:cursor-grabbing"
            onTouchStart={onRightTouchStart}
            onTouchMove={onRightTouchMove}
            onTouchEnd={onRightTouchEnd}
            onMouseDown={onRightTouchStart}
            onMouseMove={rightIsDragging ? onRightTouchMove : undefined}
            onMouseUp={onRightTouchEnd}
            onMouseLeaveCapture={onRightTouchEnd}
          >
            <div 
              className="flex h-full transition-transform duration-700 ease-in-out" 
              style={{ width: `${mediaGallery.length * 100}%`, transform: `translateX(-${(rightSlide * 100) / mediaGallery.length}%)` }}
            >
              {mediaGallery.map((media, idx) => (
                <div key={idx} style={{ width: `${100 / mediaGallery.length}%` }} className="h-full flex-shrink-0 relative pointer-events-none select-none">
                  <DynamicMedia
                    src={media.url}
                    alt="Nuestra Cultura Media"
                    className="w-full h-full object-cover object-center grayscale transition-all duration-700 hover:scale-105"
                  />
                </div>
              ))}
            </div>

              {/* Flechas de Navegación Manual (Nodos) */}
              {mediaGallery.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRightIsPaused(true);
                      setRightSlide((prev) => (prev === 0 ? mediaGallery.length - 1 : prev - 1));
                      trackGodzillaEvent('Cultura_Gallery_Click_Prev');
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all z-20 shadow-lg border border-white/10"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRightIsPaused(true);
                      setRightSlide((prev) => (prev === mediaGallery.length - 1 ? 0 : prev + 1));
                      trackGodzillaEvent('Cultura_Gallery_Click_Next');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#CC0000]/80 hover:bg-[#CC0000] text-white p-3 rounded-full backdrop-blur-md transition-all z-20 shadow-lg border border-white/10"
                    aria-label="Siguiente"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

            {/* Pagination Dots for Right Slider */}
            {mediaGallery.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-20">
                {mediaGallery.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRightIsPaused(true);
                      setRightSlide(idx);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${rightSlide === idx ? 'bg-[#CC0000] w-8' : 'bg-white/50 hover:bg-white w-2'}`}
                    aria-label={`Ver media ${idx + 1}`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>

 </div>
 </div>
 </section>
 );
};

export default Cultura;
