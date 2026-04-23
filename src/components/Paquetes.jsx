import React, { useState, useEffect, useRef } from'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from'lucide-react';
import { Link } from'react-router-dom';
import { useSiteData } from'../context/SiteContext';
import { useTranslation } from 'react-i18next';

import godzillaHover from'../assets/images/Godzilla-Holding.png';

const Paquetes = () => {
 const defaultPackages = [

 {
 id: 1,
 title:'Posicionamiento Social',
 price:'$7,900',
 period:'al mes',
 highlighted: false,
 features: ['Estrategia de Contenido Omnicanal','Copywriting de Respuesta Directa','Community Management'
 ],
 buttonText: 'Ver Garantía',
 guarantee:'GARANTÍA: Si en 14 días no ves un incremento real en el engagement, el siguiente mes es GRATIS.'
 },
 {
 id: 2,
 title:'Control IA',
 price:'$7,900',
 period:'al mes',
 highlighted: false,
 features: ['Agente IA (Web + WhatsApp)','Respuesta en menos de 5 segundos 24/7','Captura de datos automática'
 ],
 buttonText: 'Ver Garantía',
 guarantee:'GARANTÍA: Si no está funcionando en 7 días, el siguiente mes es GRATIS.'
 },
 {
 id: 3,
 title:'Expansión',
 price:'$29,500',
 period:'al mes',
 highlighted: true,
 features: ['Todo lo del Nivel Esencial','Tráfico Bilingüe (Ads Meta/Google)','Landing Page de Alta Conversión'
 ],
 buttonText: 'Ver Garantía',
 guarantee:'GARANTÍA: Si no generamos leads en 30 días, te devolvemos tu DINERO.'
 },
 {
 id: 4,
 title:'Élite',
 price:'$45,900',
 period:'al mes',
 highlighted: false,
 features: ['Estrategia Godfather Completa','Reactivación de Base de Datos','Consultoría Mensual y Cierre'
 ],
 buttonText: 'Ver Garantía',
 guarantee:'GARANTÍA: Si no aumentamos tus citas un 20% en 90 días, trabajamos GRATIS.'
 }
 ];

 const { getNodeData } = useSiteData();
 const { t, i18n } = useTranslation();
 // Si la página se muestra en español (idioma resuelto) → MXN. Cualquier otro idioma → USD.
 const isIntl = i18n.resolvedLanguage ? !i18n.resolvedLanguage.startsWith('es') : false;
 const exchangeRate = 20;
 
 const nodeData = getNodeData('paquetes') || {};
 const packages = (nodeData.elements && nodeData.elements.length > 0) ? nodeData.elements : defaultPackages;
 const activeLng = i18n.resolvedLanguage ? i18n.resolvedLanguage.split('-')[0].toLowerCase() : 'en';
 const fallbackTranslations = t('packages.items', { returnObjects: true }) || [];
 const localizedItems = nodeData.translations?.[activeLng]?.elements || nodeData.translations?.en?.elements || fallbackTranslations;

 const translateTitle = (title) => {
   if (!isIntl) return title;
   switch (title) {
     case 'Posicionamiento Social': return 'Social Positioning';
     case 'Control IA': return 'AI Control';
     case 'Expansión': return 'Expansion';
     case 'Élite': return 'Elite';
     default: return title;
   }
 };

 const translateTarget = (title, index, pkgTarget) => {
   if (!isIntl) {
     if (pkgTarget && pkgTarget.trim() !== "") return pkgTarget;
     switch (title) {
       case 'Posicionamiento Social': return 'Impulsar el crecimiento y la presencia digital.';
       case 'Control IA': return 'Automatizar ventas y atención al cliente 24/7.';
       case 'Expansión': return 'Conseguir volumen de prospectos nuevos cada semana.';
       case 'Élite': return 'Negocios establecidos listos para escalar agresivamente.';
       default: return 'Impulsar el crecimiento y la presencia digital.';
     }
   }
   return fallbackTranslations[index]?.target || '';
 };

 // ── Typewriter effect ──────────────────────────────────────────────────
 const rawTitlePart1 = isIntl ? t('packages.title', 'PACKAGES') : (nodeData.title || t('packages.title', 'PAQUETES'));
 const rawTitlePart2 = isIntl ? t('packages.titleRed', '') : (nodeData.titleRed || '');
 const fullRawTitle = rawTitlePart1 + (rawTitlePart2 ? ' ' + rawTitlePart2 : '');

 const [typedTitle, setTypedTitle] = useState('');
 const [startTyping, setStartTyping] = useState(false);
 const titleContainerRef2 = useRef(null);

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
     if (titleContainerRef2.current) observer.observe(titleContainerRef2.current);
     return () => observer.disconnect();
 }, []);

 useEffect(() => {
     if (!startTyping) return;
     let i = 0;
     let current = '';
     const interval = setInterval(() => {
         if (i < fullRawTitle.length) {
             current += fullRawTitle.charAt(i);
             setTypedTitle(current);
             i++;
         } else {
             clearInterval(interval);
         }
     }, 120);
     return () => clearInterval(interval);
 }, [fullRawTitle, startTyping]);

 const scrollContainerRef = useRef(null);
 const [isDragging, setIsDragging] = useState(false);
 const [startX, setStartX] = useState(0);
 const [scrollLeftState, setScrollLeftState] = useState(0);

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
 scrollContainerRef.current.scrollBy({ left: -380, behavior:'smooth' });
 }
 };

 const scrollRight = () => {
 if (scrollContainerRef.current) {
 scrollContainerRef.current.scrollBy({ left: 380, behavior:'smooth' });
 }
 };

 return (
 <section id="paquetes" className="py-24 bg-[#111111] overflow-hidden">
 <div className="container mx-auto px-4 max-w-7xl">
 <div ref={titleContainerRef2} className="text-center mb-16">
 <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase inline-block animate-blink-cursor">
    {typedTitle.substring(0, rawTitlePart1.length)}
    {typedTitle.length > rawTitlePart1.length && ' '}
    {typedTitle.length > rawTitlePart1.length && (
       <span className="text-[#CC0000]">{typedTitle.substring(rawTitlePart1.length + 1)}</span>
    )}
 </h2>
 <p className="text-xl text-gray-300 font-medium max-w-4xl mx-auto leading-relaxed">
 {isIntl ? t('packages.subtitle', 'Learn more about the most suitable strategy to boost your business. Everything is protected by contract.') : (nodeData.subtitle || 'Aprende más sobre la estrategia más adecuada para potenciar tu negocio. Todo esta protegido por contrato.')}
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
 className={`flex gap-6 overflow-x-auto hide-scrollbar py-12 px-2 w-full transition-all duration-300 ${isDragging ?'cursor-grabbing snap-none select-none' :'cursor-grab snap-x snap-mandatory'}`}
 style={{ msOverflowStyle:'none', scrollbarWidth:'none', WebkitOverflowScrolling:'touch' }}
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
 <h3 className="text-3xl md:text-4xl font-black mb-6 text-center text-white tracking-tight leading-tight drop-shadow-md uppercase">
 {translateTitle(pkg.title)}
 </h3>
 {pkg.price ? (
 <div className="flex items-baseline justify-center gap-1 mb-8">
 <span className="text-5xl md:text-6xl font-black tracking-tighter text-white">
  {(() => {
    // Extraer solo algas numéricas y decimales para evitar problemas de parsing
    const rawPriceStr = typeof pkg.price === 'string' ? pkg.price.replace(/[^\d.]/g, '') : pkg.price;
    const baseMxn = parseFloat(rawPriceStr) || 0;
    if (baseMxn === 0) return pkg.price; // fallback if NaN
    
    return isIntl 
       ? `$${(baseMxn / exchangeRate).toLocaleString('en-US', {maximumFractionDigits: 0})}` 
       : `$${baseMxn.toLocaleString('es-MX')}`;
  })()}
 </span>
 <span className="text-xs font-medium text-gray-500 tracking-widest pl-1">
  {isIntl ? 'USD / mo' : 'MXN / mes'}
 </span>
 </div>
 ) : (
 <div className="mb-8"></div>
 )}

 {/*"Ideal para" section */}
  <div className="text-center mb-6">
    <div className="bg-[#FACC15] text-black font-bold text-[11px] md:text-sm px-4 py-2 rounded-lg inline-block w-fit text-balance leading-tight">
      {isIntl ? t('packages.idealFor') : 'Ideal para:'} {translateTarget(pkg.title, index, pkg.planTarget)}
    </div>
  </div>

 <ul className="space-y-4">
 {(() => {
   let rawFeatures = [];
   if (isIntl && localizedItems[index]?.features) {
     const cleanStr = typeof localizedItems[index].features === 'string' ? localizedItems[index].features.replace(/\\n/g, '\n') : localizedItems[index].features;
     rawFeatures = typeof cleanStr === 'string' ? cleanStr.split('\n') : cleanStr;
   } else {
     const cleanStrEs = typeof pkg.features === 'string' ? pkg.features.replace(/\\n/g, '\n') : pkg.features;
     rawFeatures = Array.isArray(cleanStrEs) ? cleanStrEs : (typeof cleanStrEs === 'string' ? cleanStrEs.split('\n') : []);
   }
   if (!Array.isArray(rawFeatures)) rawFeatures = [];
   
   return rawFeatures.map((feature, i) => {
     const colonIdx = typeof feature === 'string' ? feature.indexOf(':') : -1;
     return (
       <li key={i} className="flex items-start gap-3">
         <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[#25D366]" />
         <span className="text-sm leading-tight text-gray-300">
           {colonIdx > 0 ? (
             <><strong className="text-white font-semibold">{feature.slice(0, colonIdx)}:</strong>{feature.slice(colonIdx + 1)}</>
           ) : feature}
         </span>
       </li>
     );
   });
 })()}
 </ul>
 </div>

 <div className="relative z-10 mt-8">
 {pkg.guarantee && (
 <p className="text-[10px] text-center font-medium mb-6 px-1 leading-relaxed text-gray-400">
 {(() => {
  const g = (isIntl && localizedItems[index]?.guarantee) ? localizedItems[index].guarantee : (pkg.guarantee || '');
  const ci = g.indexOf(':');
  if (ci > 0) return <><strong className="text-gray-200 font-bold">{g.slice(0, ci)}:</strong>{g.slice(ci + 1)}</>;
  return g;
 })()}
 </p>
 )}
 <Link
 to={`/${pkg.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'')}`}
 className="block text-center w-full py-3.5 rounded-full font-black text-sm tracking-widest transition-all duration-300 shadow-xl bg-[#CC0000] text-white hover:bg-white hover:text-[#CC0000] hover:scale-105"
 >
 {isIntl ? t('packages.guarantee') : (pkg.buttonText || 'Ver Garantía')}
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
 {isIntl 
     ? <>The prices shown are in USD. For more details, see our <Link to="/terminos" className="underline hover:text-white">Terms and Conditions</Link>.</>
     : <>Los precios mostrados se muestran en MXN. Para más detalles, consulta nuestros <Link to="/terminos" className="underline hover:text-white">Términos y Condiciones</Link>.</>
 }
 </p>
 <p className="mt-2">
 {isIntl 
     ? <>Have more questions? Check our <Link to="/faq" className="underline hover:text-white">FAQ</Link>.</>
     : <>¿Tienes más dudas? Consulta nuestro <Link to="/faq" className="underline hover:text-white">FAQ</Link>.</>
 }
 </p>
 </div>

 </div>
 </section>
 );
};

export default Paquetes;
