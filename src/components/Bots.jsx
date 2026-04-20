import React, { useEffect, useRef, useState } from 'react';
import ContactForm from './ContactForm';
import { Link } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ArrowRight, Filter, Calendar, MessageSquare, RefreshCw, Database, ChevronDown } from 'lucide-react';
import { useSiteData } from '../context/SiteContext';\nimport { useTranslation } from 'react-i18next';
const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';

const gifBot = '/assets/icons/Bot.gif';
const gifVideo = '/assets/icons/Video.gif';
const gifEmbudo = '/assets/icons/Embudo.gif';
const gifRedes = '/assets/icons/Redes%20Sociales.gif';
const gifSeo = '/assets/icons/Red%20Social%20Optimizar.gif';
const gifCrm = '/assets/icons/Estadistica.gif';
// const botsVideo = `${API_URL}/api/media/assets/GC_ChatBotsWebPage_AM_161225.mp4`; // TEMP: Comentado por falta de archivo

const defaultContent = {
    title: 'Automatización de bots',
    subtitle: 'Automatiza tu atención al cliente 24/7 sin perder el toque humano.',
    ctaText: 'Agendar cita',
    ctaLink: '#contacto'
};

const Bots = () => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [content, setContent] = useState(defaultContent);
    const [openAccordion, setOpenAccordion] = useState(0);

    const accordionItems = [
        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt="Icon 1" className="w-5 h-5 object-contain shrink-0 rounded-full" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Filter size={20} className="shrink-0" />, title: isEng ? t("services.items.bots.accTitle1") : (content.accTitle1 || "Cualificación de leads en tiempo real"), desc: isEng ? t("services.items.bots.accDesc1") : (content.accDesc1 || "Filtra curiosos de clientes con presupuesto real automáticamente.") },
        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt="Icon 2" className="w-5 h-5 object-contain shrink-0 rounded-full" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Calendar size={20} className="shrink-0" />, title: isEng ? t("services.items.bots.accTitle2") : (content.accTitle2 || "Agendamiento directo sin intervención"), desc: isEng ? t("services.items.bots.accDesc2") : (content.accDesc2 || "Sincronización total con tu calendario para llenar tu agenda de citas.") },
        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt="Icon 3" className="w-5 h-5 object-contain shrink-0 rounded-full" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <MessageSquare size={20} className="shrink-0" />, title: isEng ? t("services.items.bots.accTitle3") : (content.accTitle3 || "Soporte de IA multicanal"), desc: isEng ? t("services.items.bots.accDesc3") : (content.accDesc3 || "Atención en WhatsApp, Instagram y Web de forma simultánea.") },
        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt="Icon 4" className="w-5 h-5 object-contain shrink-0 rounded-full" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <RefreshCw size={20} className="shrink-0" />, title: isEng ? t("services.items.bots.accTitle4") : (content.accTitle4 || "Nurturing automatizado"), desc: isEng ? t("services.items.bots.accDesc4") : (content.accDesc4 || "Seguimiento inteligente a prospectos que no compraron al primer contacto.") },
        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt="Icon 5" className="w-5 h-5 object-contain shrink-0 rounded-full" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Database size={20} className="shrink-0" />, title: isEng ? t("services.items.bots.accTitle5") : (content.accTitle5 || "Integración nativa con tu CRM"), desc: isEng ? t("services.items.bots.accDesc5") : (content.accDesc5 || "Los datos de cada conversación van directo a tu base de datos.") },
    ];

    const { t, i18n } = useTranslation();\n    const isEng = !i18n.resolvedLanguage?.startsWith('es');\n    const { getNodeData } = useSiteData();
    const nodeData = getNodeData('servicio-bots');

    useEffect(() => {
        window.scrollTo(0, 0);
        if (nodeData && Object.keys(nodeData).length > 0) {
            setContent(Object.assign({}, defaultContent, nodeData));
        }
    }, [JSON.stringify(nodeData)]);

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

    return (
        <>
            <section className="pt-[100px] min-h-screen flex flex-col bg-[#111111]">
                <div className="flex-1 flex flex-col md:flex-row w-full relative">

                    {/* Left Side: Video Area */}
                    <div className="w-full md:w-2/3 min-h-[400px] md:min-h-0 bg-[#18181b] relative overflow-hidden group">
                        {(content.videoFileUrl || content.videoUrl) ? (
                            (() => {
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
                                        playsInline
                                        className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                                        onClick={togglePlay}
                                    />
                                );
                            })()
                        
                        ) : (
                            <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center text-white/40">
                                <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center mb-4 opacity-50"><span className="text-2xl ml-1">▶</span></div>
                                <span className="text-lg font-medium">Próximamente...</span>
                            </div>
                        )}

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

                    {/* Center Divider Line (Desktop only) */}
                    <div className="absolute top-0 bottom-0 left-2/3 -translate-x-1/2 w-1 bg-white z-10 hidden md:block"></div>

                    {/* Center Icons Stack (Desktop only) */}
                    <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-6 py-8">
                        <div className="w-28 h-28 rounded-full bg-[#CC0000] border-[6px] border-white flex items-center justify-center shadow-2xl cursor-pointer">
                            <img src={gifBot} alt="Bot" className="w-16 h-16 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                        </div>
                        <Link to="/audiovisual" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                            <img src={gifVideo} alt="Video" className="w-8 h-8 object-contain group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/embudos" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                            <img src={gifEmbudo} alt="Embudo" className="w-8 h-8 object-contain group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/redes" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                            <img src={gifRedes} alt="Redes" className="w-8 h-8 object-contain group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/seo" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                            <img src={gifSeo} alt="SEO" className="w-8 h-8 object-contain group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/crm" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                            <img src={gifCrm} alt="CRM" className="w-8 h-8 object-contain group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                    </div>

                    {/* Right Side: Red Area with Content */}
                    <div className="w-full md:w-1/3 bg-[#CC0000] flex flex-col justify-center items-center py-16 md:py-24 px-8 lg:px-12">
                        <div className="w-full max-w-sm flex flex-col items-center text-center">
                            <h1
                                className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-sm leading-tight"
                                dangerouslySetInnerHTML={{ __html: (isEng ? t('services.items.bots.title') : content.title).replace(/\n/g, '<br />') }}
                            />
                            {/* SUBTITLE REPLACED BY ACCORDION */}
                            <p className="text-white text-lg md:text-xl mb-10 leading-relaxed font-medium">
                                {isEng ? t('services.items.bots.desc') : content.subtitle}
                            </p>
                            <div className="w-full text-left bg-black/20 rounded-2xl p-3 md:p-5 mb-8 space-y-1 md:space-y-2 border border-white/10 shadow-lg relative z-20">
                                {accordionItems.map((item, index) => {
                                    const isOpen = openAccordion === index;
                                    return (
                                        <div key={index} className="border-b border-white/10 last:border-0 pb-1.5 pt-1.5 first:pt-0 last:pb-0">
                                            <button
                                                onClick={() => setOpenAccordion(isOpen ? -1 : index)}
                                                className="w-full flex items-center justify-between py-2 text-white hover:text-white/80 transition-colors gap-3"
                                            >
                                                <div className="flex items-center gap-3 font-bold text-sm md:text-base leading-tight">
                                                    <span className="text-[#FACC15] shrink-0">{item.icon}</span>
                                                    <span className="text-left">{item.title}</span>
                                                </div>
                                                <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#FACC15]' : 'text-gray-400'}`} />
                                            </button>
                                            <div
                                                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
                                            >
                                                <p className="text-gray-200 text-xs md:text-sm leading-relaxed pl-8 pb-3 text-left">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <button
                                onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-white text-[#CC0000] px-8 py-3 rounded-full font-bold flex items-center gap-3 hover:bg-gray-100 transition-all hover:scale-105 shadow-xl"
                            >
                                {isEng ? 'Schedule appointment' : content.ctaText} <ArrowRight size={20} className="text-[#CC0000]" />
                            </button>
                        </div>
                    </div>

                </div>

                {/* Mobile Icons Menu */}
                <div className="md:hidden w-full bg-[#111111] py-6 border-t border-gray-800">
                    <div className="flex justify-center gap-4 px-4 overflow-x-auto pb-2">
                        <div className="w-16 h-16 shrink-0 rounded-full bg-[#CC0000] border-4 border-white flex items-center justify-center shadow-lg">
                            <img src={gifBot} alt="Bot" className="w-10 h-10 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                        </div>
                        <Link to="/audiovisual" className="w-12 h-12 mt-2 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                            <img src={gifVideo} alt="Video" className="w-6 h-6 object-contain group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/embudos" className="w-12 h-12 mt-2 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                            <img src={gifEmbudo} alt="Embudo" className="w-6 h-6 object-contain group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/redes" className="w-12 h-12 mt-2 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                            <img src={gifRedes} alt="Redes Sociales" className="w-6 h-6 object-contain group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/seo" className="w-12 h-12 mt-2 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                            <img src={gifSeo} alt="SEO" className="w-6 h-6 object-contain group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                        <Link to="/crm" className="w-12 h-12 mt-2 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                            <img src={gifCrm} alt="CRM" className="w-6 h-6 object-contain group-hover:brightness-0 group-hover:invert transition-all" />
                        </Link>
                    </div>
                </div>
            </section>
            <ContactForm showNewsletter={false} />
        </>
    );
};

export default Bots;
