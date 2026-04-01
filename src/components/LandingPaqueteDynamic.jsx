import React, { useEffect } from'react';
import ContactForm from'./ContactForm';
import { Link, useParams } from'react-router-dom';
import { Check } from'lucide-react';
import { useSiteData } from'../context/SiteContext';
const backgroundVideo = 'https://bot.godzillaconsulting.ai/api/media/assets/Particulas Rojas LANDINGS.mp4';
import NivelExpansion from'./NivelExpansion';
import NivelElite from'./NivelElite';
import Bots from'./Bots';

const LandingPaqueteDynamic = ({ previewNodeId }) => {
 const { slug } = useParams();
 const { getNodeData } = useSiteData();

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

 const contentData = getNodeData(nodeId);
 const content = contentData?.heroTitle ? contentData : null;

 useEffect(() => {
 window.scrollTo(0, 0);
 }, [slug]);

 // Helper para procesar texto rico o tags primitivos y retornos de carro
 const renderHTML = (rawHTML) => {
 return { __html: (rawHTML ||'').replace(/\n/g,'<br />') };
 };

 if (!content) {
 // Fallbacks estáticos para Producción donde el Dashboard aún no envía datos a Vercel
 
 if (slugLower.includes('control') || slugLower.includes('bot')) return <Bots />;
 if (slugLower.includes('expansion')) return <NivelExpansion />;
 if (slugLower.includes('elite')) return <NivelElite />;

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
 <td className="py-4 pl-4 text-right align-top whitespace-nowrap text-sm text-gray-300 font-medium">
 {feature.price || ''}
 </td>
 </tr>
 ))}
 {/* Summary rows */}
 {content.totalValue && (
 <tr className="border-b border-gray-600">
 <td className="py-3 pr-4 text-sm font-black text-white uppercase tracking-wide">{content.totalLabel || 'VALOR TOTAL DEL SISTEMA:'}</td>
 <td className="py-3 pl-4 text-right text-sm font-black text-white whitespace-nowrap">{content.totalValue}</td>
 </tr>
 )}
 {content.normalPrice && (
 <tr className="border-b border-gray-600">
 <td className="py-3 pr-4 text-sm font-black text-white uppercase tracking-wide">{content.normalLabel || 'INVERSIÓN NORMAL:'}</td>
 <td className="py-3 pl-4 text-right text-sm font-black text-white whitespace-nowrap">{content.normalPrice}</td>
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
 <span className="text-[2.75rem] md:text-5xl font-bold text-white">{content.planPrice ||'Consúltalo'}</span>
 {content.planPrice && content.planPeriod && (
 <span className="text-xl text-gray-300 font-medium">{content.planPeriod}</span>
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
 <video
 src={content.videoFileUrl || content.videoUrl}
 autoPlay
 muted
 loop
 playsInline
 controls
 className="w-full bg-black rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] min-h-[250px] md:min-h-[300px] lg:min-h-[350px] object-cover"
 />
 ) : (
 <div className="w-full bg-white rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] min-h-[250px] md:min-h-[300px] lg:min-h-[350px]">
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
