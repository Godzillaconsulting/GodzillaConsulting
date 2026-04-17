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
 const { i18n } = useTranslation();
 const isIntl = !i18n.language.startsWith('es');
 const exchangeRate = 20;

 const formatPrice = (priceStr, addSuffix = true) => {
     if (!priceStr || typeof priceStr !== 'string') return priceStr;
     if (!isIntl) return priceStr; // Español / Original: se muestra tal cual
     
     // Si está en Inglés (isIntl = true), intentamos extraer el número y convertir a USD
     const match = priceStr.match(/([\d,.]+)/);
     if (!match) return priceStr; // Si no hay número (ej: "Incluido"), no tocamos nada
     
     const mxnVal = parseFloat(match[1].replace(/,/g, ''));
     if (isNaN(mxnVal) || mxnVal === 0) return priceStr;
     
     const usdVal = Math.round(mxnVal / exchangeRate).toLocaleString('en-US');
     let convertedStr = priceStr.replace(match[1], usdVal);
     
     // Traducir términos comunes
     convertedStr = convertedStr.replace(/MXN/gi, 'USD');
     convertedStr = convertedStr.replace(/\/\s*mes/gi, '/ mo');
     
     // Si no trae el currency y es un precio de tabla, se lo agregamos para clarificar
     if (addSuffix && !convertedStr.toLowerCase().includes('usd')) {
         convertedStr += ' USD';
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
 return { __html: (rawHTML ||'').replace(/\n/g,'<br />') };
 };

 if (loading && !previewNodeId) {
     return (
         <div className="bg-black min-h-screen flex items-center justify-center pt-20">
            <div className="text-gray-400 font-medium text-lg animate-pulse">Cargando servidor...</div>
         </div>
     );
 }

 if (!content || !content.heroTitle) {
     return <div className="bg-black min-h-screen flex items-center justify-center pt-20"><div className="text-white text-2xl font-bold">Página en mantenimiento...</div></div>;
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
 {content.heroTopText}
 </p>
 <h1
 className="text-[2rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] xl:text-[7rem] font-bold leading-[1.1] md:leading-[0.95] tracking-tight mb-8 md:mb-16 drop-shadow-2xl w-full max-w-full"
 style={{ overflowWrap: 'normal', wordBreak: 'normal' }}
 dangerouslySetInnerHTML={renderHTML(content.heroTitle)}
 />

 <div className="flex flex-col sm:flex-row gap-4 mb-8 md:mb-16 w-full max-w-xl justify-center z-20">
 <a href="#detalles" className="bg-white text-black px-6 md:px-12 py-3 md:py-4 rounded-full font-bold text-base md:text-xl hover:bg-gray-200 transition-all flex-1 shadow-xl hover:scale-105 text-center">
 Descubre más
 </a>
 <Link to="/#paquetes" className="bg-transparent border-2 border-white text-white px-6 md:px-12 py-3 md:py-4 rounded-full font-bold text-base md:text-xl hover:bg-white/10 transition-all flex-1 shadow-xl hover:scale-105 text-center">
 Ver otros paquetes
 </Link>
 </div>

 <p
 className="text-xs md:text-sm font-light italic max-w-3xl mx-auto text-gray-300 px-4 mt-auto drop-shadow-md"
 dangerouslySetInnerHTML={renderHTML(content.heroDisclaimer)}
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
 Detalles del plan
 </div>

 <h2
 className="text-[1.8rem] sm:text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight break-words max-w-full"
 style={{ wordBreak:'break-word', hyphens:'auto' }}
 >
 {(content.cardTitle || content.heroTitle || '').replace('\n',' ')}
 </h2>

 <div className="bg-[#FACC15] text-black font-bold text-sm px-4 py-2 rounded-lg inline-block mb-10 w-fit">
 {content.planTarget}
 </div>

 {/* Pricing Table */}
 <div className="w-full mb-10 overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-gray-600">
 <th className="py-3 pr-4 text-sm font-bold text-gray-300">{content.tableHeaderLeft || 'El Entregable (Lo que recibes)'}</th>
 <th className="py-3 pl-4 text-sm font-bold text-gray-300 text-right whitespace-nowrap">{content.tableHeaderRight || 'Valor Real Mensual'}</th>
 </tr>
 </thead>
 <tbody>
 {content.planFeaturesExtended && content.planFeaturesExtended.map((feature, idx) => (
 <tr key={idx} className="border-b border-gray-700">
 <td className="py-4 pr-4 align-top">
 <span className="font-bold text-white text-sm leading-tight" dangerouslySetInnerHTML={renderHTML(feature.title + (feature.desc ? ':' : ''))} />
 {feature.desc && (
 <span className="text-gray-300 text-sm leading-relaxed"> <span dangerouslySetInnerHTML={renderHTML(feature.desc)} /></span>
 )}
 </td>
 <td translate="no" className="py-4 pl-4 text-right align-top whitespace-nowrap text-sm text-gray-300 font-medium">
 {feature.price ? formatPrice(feature.price, true) : ''}
 </td>
 </tr>
 ))}
 {/* Summary rows */}
 {content.totalValue && (
 <tr className="border-b border-gray-600">
 <td className="py-3 pr-4 text-sm font-black text-white uppercase tracking-wide">{content.totalLabel || 'VALOR TOTAL DEL SISTEMA:'}</td>
 <td translate="no" className="py-3 pl-4 text-right text-sm font-black text-white whitespace-nowrap">{formatPrice(content.totalValue, true)}</td>
 </tr>
 )}
 {content.normalPrice && (
 <tr className="border-b border-gray-600">
 <td className="py-3 pr-4 text-sm font-black text-white uppercase tracking-wide">{content.normalLabel || 'INVERSIÓN NORMAL:'}</td>
 <td translate="no" className="py-3 pl-4 text-right text-sm font-black text-white whitespace-nowrap">{formatPrice(content.normalPrice, true)}</td>
 </tr>
 )}

 </tbody>
 </table>
 </div>

 <div className="text-center pt-6">
 {content.offerLabel && (
 <p className="text-sm font-bold text-white uppercase tracking-widest mb-2">{content.offerLabel.replace(/:$/, '')}</p>
 )}
 <div className="flex justify-center items-baseline gap-2 mb-8">
 <span translate="no" className="text-[2.75rem] md:text-5xl font-bold text-white">{content.planPrice ? formatPrice(content.planPrice, false) : 'Consúltalo'}</span>
 {content.planPrice && (
 <span className="text-xl text-gray-300 font-medium ml-1">
     {isIntl ? 'USD / mo' : (content.planPeriod || '')}
 </span>
 )}
 </div>
 <a href="#contacto" className="block text-center w-full max-w-sm mx-auto bg-[#CC0000] text-white py-4 rounded-full font-bold text-xl hover:bg-white hover:text-[#CC0000] transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-transparent hover:border-[#CC0000]">
 Contáctanos
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
        <div className="absolute bottom-6 left-6 flex items-center gap-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
<span className="text-gray-700 font-medium select-none text-sm border border-gray-800 px-4 py-2 rounded-full">Recurso audiovisual pendiente</span>
 </div>
 )}

 <div className="text-center max-w-sm">
 <h3 className="text-3xl font-bold text-white mb-6 leading-tight">
 {content.guaranteeTitle ||'GARANTÍA DE SATISFACCIÓN'}
 </h3>
 <div className="bg-[#FACC15] text-black font-bold px-8 py-3 rounded-full inline-block mb-6 text-sm hover:scale-105 transition-transform cursor-default">
 {content.guaranteeBadge ||'Resultados garantizados 100%'}
 </div>
 <p
 className="text-xs md:text-sm text-gray-100 leading-relaxed font-light px-2 text-balance"
 dangerouslySetInnerHTML={renderHTML(content.guaranteeText)}
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
