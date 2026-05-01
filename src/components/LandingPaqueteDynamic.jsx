import React, { useEffect, useState, useRef } from'react';
import ContactForm from'./ContactForm';
import { Link, useParams } from'react-router-dom';
import { Check, Play, Pause, Volume2, VolumeX } from'lucide-react';
import { useSiteData } from'../context/SiteContext';
import { injectSectionDefaults } from '../utils/studioConfig';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
const backgroundVideo = `${API_URL}/api/media/assets/Particulas Rojas LANDINGS.mp4`;

const LandingPaqueteDynamic = ({ previewNodeId }) => {
 const { slug } = useParams();
 const { getNodeData, loading } = useSiteData();
 const { t, i18n } = useTranslation();
 // Si la página se muestra en español (idioma resuelto) → MXN. Cualquier otro idioma → USD.
 const isIntl = i18n.resolvedLanguage ? !i18n.resolvedLanguage.startsWith('es') : false;
 const exchangeRate = 20;

 const tr = (key, fallback) => isIntl ? t(key, fallback) : fallback;

 const formatPrice = (priceStr, addSuffix = true) => {
     if (!priceStr || typeof priceStr !== 'string') return priceStr;
     
     // 1. Calculate and replace
     const match = priceStr.match(/([\d,.]+)/);
     let convertedStr = priceStr;
     
     if (match) {
         const mxnVal = parseFloat(match[1].replace(/,/g, ''));
         if (!isNaN(mxnVal) && mxnVal > 0) {
             if (isIntl) {
                 const usdVal = Math.round(mxnVal / exchangeRate).toLocaleString('en-US');
                 convertedStr = priceStr.replace(match[1], usdVal);
             } else {
                 convertedStr = priceStr;
             }
         }
     }
     
     // 2. Translate text only if English mode
     if (isIntl) {
         convertedStr = convertedStr.replace(/al mes/gi, '/ mo');
         convertedStr = convertedStr.replace(/\/\s*mes/gi, '/ mo');
         convertedStr = convertedStr.replace(/MXN/gi, 'USD');
         if (addSuffix && !convertedStr.toLowerCase().includes('usd')) {
             if (convertedStr.match(/[\d]/)) convertedStr += ' USD';
         }
     } else {
        if (addSuffix && convertedStr.match(/[\d]/) && !convertedStr.toLowerCase().includes('mxn')) {
             convertedStr += ' MXN';
         }
     }
     
     return convertedStr;
 };


 // Map incoming URL slug or Admin Studio prop to Local Node IDs
 const slugLower = slug ? slug.toLowerCase() :'';
 let nodeId = previewNodeId || '';
 if (!previewNodeId) {
     if (slugLower.includes('posicionamiento')) nodeId ='paquete-posicionamiento-social';
     else if (slugLower.includes('control')) nodeId ='paquete-control-ia';
     else if (slugLower.includes('expansion')) nodeId ='paquete-expansion';
     else if (slugLower.includes('elite')) nodeId ='paquete-elite';
     else nodeId ='paquete-' + slugLower;
 }

 let contentData = getNodeData(nodeId);
 if (!contentData) {
     contentData = injectSectionDefaults(nodeId, {});
 }
 const content = contentData;
 const activeLng = i18n.resolvedLanguage ? i18n.resolvedLanguage.split('-')[0].toLowerCase() : 'en';
 const fallbackLocale = isIntl ? (t('packages.landing', { returnObjects: true })?.[slugLower] || {}) : {};
 const dbTranslationsEn = content.translations?.en || {};
 const dbTranslationsActive = content.translations?.[activeLng] || {};
 const localizedLanding = isIntl ? { ...fallbackLocale, ...dbTranslationsEn, ...dbTranslationsActive } : {};
 const videoRef = useRef(null);
 const [isPlaying, setIsPlaying] = useState(true);
 const [isMuted, setIsMuted] = useState(true);

 const togglePlay = () => {
     if (videoRef.current) {
         if (videoRef.current.tagName === 'IFRAME') {
             const func = isPlaying ? 'pauseVideo' : 'playVideo';
             videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
         } else {
             if (isPlaying) {
                 videoRef.current.pause();
             } else {
                 videoRef.current.play();
             }
         }
     }
     setIsPlaying(!isPlaying);
 };

 const toggleMute = () => {
     if (videoRef.current) {
         if (videoRef.current.tagName === 'IFRAME') {
             const func = isMuted ? 'unMute' : 'mute';
             videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
         } else {
             videoRef.current.muted = !isMuted;
         }
     }
     setIsMuted(!isMuted);
 };


 useEffect(() => {
 window.scrollTo(0, 0);
 }, [slug]);

 // Helper para procesar texto rico o tags primitivos y retornos de carro
 const renderHTML = (rawHTML) => {
 return { __html: (typeof rawHTML === 'string' ? rawHTML.replace(/\\n/g, '<br />').replace(/\n/g, '<br />') : '') };
 };

 if (loading && !previewNodeId) {
     return (
         <div className="bg-black min-h-screen flex items-center justify-center pt-20">
            <div className="text-gray-400 font-medium text-lg animate-pulse">{isIntl ? t('landing.loading') : 'Cargando servidor...'}</div>
         </div>
     );
 }

 if (!content || !content.heroTitle) {
     return <div className="bg-black min-h-screen flex items-center justify-center pt-20"><div className="text-white text-2xl font-bold">{isIntl ? t('landing.maintenance') : 'Página en mantenimiento...'}</div></div>;
 }

 return (
 <div className="bg-black min-h-screen text-white pt-20">
 {/* Hero Section */}
 <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 overflow-x-hidden">
 <video
 autoPlay
 muted
 loop
 playsInline
 className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
 >
 <source src={backgroundVideo} type="video/mp4" />
 </video>
 {/* Opcional gradient for blending */}
 <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black z-0 pointer-events-none" />

 <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center h-full pt-10 pb-8">
 <p className="text-base md:text-2xl font-bold mb-4 md:mb-6 drop-shadow-lg max-w-2xl text-[#f3f3f3]">
 {isIntl && localizedLanding.heroTopText ? localizedLanding.heroTopText : content.heroTopText}
 </p>
 <h1
 className="text-[2rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] xl:text-[7rem] font-bold leading-[1.1] md:leading-[0.95] tracking-tight mb-8 md:mb-16 drop-shadow-2xl w-full max-w-full"
 style={{ overflowWrap: 'normal', wordBreak: 'normal' }}
 dangerouslySetInnerHTML={renderHTML(isIntl && localizedLanding.heroTitle ? localizedLanding.heroTitle : content.heroTitle)}
 />

 <div className="flex justify-center mb-8 md:mb-16 w-full z-20">
 <a href="#detalles" className="bg-white text-black px-10 md:px-16 py-3 md:py-4 rounded-full font-bold text-base md:text-xl hover:bg-gray-200 transition-all shadow-xl hover:scale-105 text-center">
 {isIntl ? t('landing.discoverMore') : 'Descubre más'}
 </a>
 </div>

 <p
 className="text-xs md:text-sm font-light italic max-w-3xl mx-auto text-gray-300 px-4 mt-auto drop-shadow-md"
 dangerouslySetInnerHTML={renderHTML(isIntl && localizedLanding.heroDisclaimer ? localizedLanding.heroDisclaimer : content.heroDisclaimer)}
 />
 </div>
 </section>

 {/* Details Section */}
 <section id="detalles" className="py-24 bg-black relative">
 <div className="container mx-auto px-6 max-w-6xl">
 <div className="flex flex-col-reverse lg:flex-row gap-16 lg:gap-16 items-center">

 {/* Left Card */}
 <div className="w-full lg:w-[55%] bg-[#1c1c1c] border border-red-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
 <div className="inline-block border border-gray-600 bg-transparent text-sm text-gray-200 px-5 py-1.5 rounded-full mb-8 font-medium">
 {isIntl ? t('landing.planDetails') : 'Detalles del plan'}
 </div>

 <h2
 className="text-[1.8rem] sm:text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight break-words max-w-full"
 >
 {isIntl && localizedLanding.heroTitle ? localizedLanding.heroTitle.replace(/\n/g, ' ') : (content.cardTitle || content.heroTitle || '').replace('\n', ' ')}
 </h2>

 <div className="bg-[#FACC15] text-black font-bold text-sm px-4 py-2 rounded-lg inline-block mb-10 w-fit">
 {isIntl && localizedLanding.planTarget ? localizedLanding.planTarget : content.planTarget}
 </div>

 {/* Pricing Table */}
 <div className="w-full mb-10 overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-gray-600">
 <th className="py-3 pr-4 text-sm font-bold text-gray-300">
 {isIntl ? (localizedLanding.tableHeaderLeft ?? content.tableHeaderLeft ?? 'The Deliverable (What you receive)') : (content.tableHeaderLeft ?? 'El Entregable (Lo que recibes)')}
 </th>
 <th className="py-3 pl-4 text-sm font-bold text-gray-300 text-right whitespace-nowrap">
 {isIntl ? (localizedLanding.tableHeaderRight ?? content.tableHeaderRight ?? 'Real Monthly Value') : (content.tableHeaderRight ?? 'Valor Real Mensual')}
 </th>
 </tr>
 </thead>
 <tbody>
 {((isIntl && localizedLanding.planFeaturesExtended) ? localizedLanding.planFeaturesExtended : content.planFeaturesExtended)?.map((feature, idx) => (
 <tr key={idx} className="border-b border-gray-700">
 <td className="py-4 pr-4 align-top">
 <span className="font-bold text-white text-sm leading-tight" dangerouslySetInnerHTML={renderHTML(feature.title + (feature.desc ? ':' : ''))} />
 {feature.desc && (
 <span className="text-gray-300 text-sm leading-relaxed"> <span dangerouslySetInnerHTML={renderHTML(feature.desc)} /></span>
 )}
 </td>
 <td translate="no" className="py-4 pl-4 text-right align-top whitespace-nowrap text-sm text-gray-300 font-medium">
 {/* Precios individuales ocultos a petición del usuario ya que no son gestionables desde el dashboard */}
 </td>
 </tr>
 ))}
 {/* Summary rows */}
 {content.totalValue && (
 <tr className="border-b border-gray-600">
 <td className="py-3 pr-4 text-sm font-black text-white uppercase tracking-wide">{isIntl ? t('landing.totalSystem') : (content.totalLabel || 'VALOR TOTAL DEL SISTEMA:')}</td>
 <td translate="no" className="py-3 pl-4 text-right text-sm font-black text-white whitespace-nowrap">{formatPrice(content.totalValue, true)}</td>
 </tr>
 )}
 {content.normalPrice && (
 <tr className="border-b border-gray-600">
 <td className="py-3 pr-4 text-sm font-black text-white uppercase tracking-wide">{isIntl ? t('landing.normalInvestment') : (content.normalLabel || 'INVERSIÓN NORMAL:')}</td>
 <td translate="no" className="py-3 pl-4 text-right text-sm font-black text-white whitespace-nowrap">{formatPrice(content.normalPrice, true)}</td>
 </tr>
 )}

 </tbody>
 </table>
 </div>

 <div className="text-center pt-6">
 {content.offerLabel && (
 <p className="text-sm font-bold text-white uppercase tracking-widest mb-2">{isIntl ? t('landing.takeOffer') : content.offerLabel.replace(/:$/, '')}</p>
 )}
 {content.planPrice ? (
 <div className="flex justify-center items-baseline gap-2 mb-8">
 <span translate="no" className="text-[2.75rem] md:text-5xl font-bold text-white">
   {(() => {
     const raw = typeof content.planPrice === 'string' ? content.planPrice.replace(/[^\d.,]/g, '').replace(/,/g, '') : '';
     const mxn = parseFloat(raw) || 0;
     if (mxn === 0) return content.planPrice;
     return isIntl
       ? `$${Math.round(mxn / exchangeRate).toLocaleString('en-US')}`
       : `$${mxn.toLocaleString('es-MX')}`;
   })()}
 </span>
 <span className="text-xl text-gray-300 font-medium ml-1">
   {isIntl ? 'USD / mo' : (content.planPeriod || 'MXN / mes')}
 </span>
 </div>
 ) : (
 <div className="mb-8"></div>
 )}
 <a href="#contacto" className="block text-center w-full max-w-sm mx-auto bg-[#CC0000] text-white py-4 rounded-full font-bold text-xl hover:bg-white hover:text-[#CC0000] transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-transparent hover:border-[#CC0000]">
 {isIntl ? 'Contact us' : 'Contáctanos'}
 </a>
 </div>
 </div>

 {/* Right Content */}
 <div className="w-full lg:w-[45%] flex flex-col items-center justify-center space-y-12">
 {content.videoFileUrl || content.videoUrl ? (
    <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] group bg-black">
        {(() => {
            const vSrc = content.videoFileUrl || content.videoUrl;
            const ytMatch = vSrc.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
            const ytId = (ytMatch && ytMatch[2].length === 11) ? ytMatch[2] : null;
            if (ytId) {
                return (
                    <iframe 
                        ref={videoRef}
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&enablejsapi=1`}
                        className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                        style={{ pointerEvents: 'none' }}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                    ></iframe>
                );
            }
            return (
                <video
                    ref={videoRef}
                    src={vSrc}
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                    onClick={togglePlay}
                />
            );
        })()}
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-6 left-6 flex items-center gap-4 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-black/60 hover:bg-[#CC0000] border border-white/30 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg text-white"
            >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
            </button>
            <button
                onClick={toggleMute}
                className="w-12 h-12 rounded-full bg-black/60 hover:bg-[#CC0000] border border-white/30 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg text-white"
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
        </div>
    </div>
 ) : (
 <div className="w-full bg-[#1c1c1c] border border-gray-800 rounded-[2.5rem] min-h-[250px] md:min-h-[300px] lg:min-h-[350px] flex items-center justify-center">
<span className="text-gray-700 font-medium select-none text-sm border border-gray-800 px-4 py-2 rounded-full">{isIntl ? 'Audiovisual resource pending' : 'Recurso audiovisual pendiente'}</span>
 </div>
 )}

 <div className="text-center max-w-sm">
 <h3 className="text-3xl font-bold text-white mb-6 leading-tight">
 {isIntl ? (localizedLanding.guarantee || 'SATISFACTION GUARANTEE') : (content.guaranteeTitle || 'GARANTÍA DE SATISFACCIÓN')}
 </h3>
 <div className="bg-[#FACC15] text-black font-bold px-8 py-3 rounded-full inline-block mb-6 text-sm hover:scale-105 transition-transform cursor-default">
 {isIntl ? (localizedLanding.guaranteeBtn || '100% guaranteed results') : (content.guaranteeBadge || 'Resultados garantizados 100%')}
 </div>
 <p
 className="text-xs md:text-sm text-gray-100 leading-relaxed font-light px-2 text-balance"
 dangerouslySetInnerHTML={renderHTML(isIntl && localizedLanding.guaranteeText ? localizedLanding.guaranteeText + (localizedLanding.guaranteeCondition ? '<br/><br/>' + localizedLanding.guaranteeCondition : '') : content.guaranteeText)}
 />
 </div>
 </div>

 </div>
 </div>
 </section>
 <ContactForm showNewsletter={false} />
 </div>
 );
};

export default LandingPaqueteDynamic;
