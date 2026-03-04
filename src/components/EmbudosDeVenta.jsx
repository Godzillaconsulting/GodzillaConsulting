import React, { useEffect, useRef, useState } from 'react';
import ContactForm from './ContactForm';
import { Link } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { client } from '../sanityClient';

import gifBot from '../assets/Gifs/Bot.gif';
import gifVideo from '../assets/Gifs/Video.gif';
import gifEmbudo from '../assets/Gifs/Embudo.gif';
import gifRedes from '../assets/Gifs/Redes Sociales.gif';
import gifSeo from '../assets/Gifs/Red Social Optimizar.gif';
import gifCrm from '../assets/Gifs/Estadistica.gif';
// import embudosVideo from '../assets/GC_EMBUDOSWebPage_AM161225.mp4'; // TEMP: Comentado por falta de archivo

const defaultContent = {
    title: 'Embudos de\nventa',
    subtitle: 'Convierte el tráfico en citas confirmadas con secuencias diseñadas para cerrar.',
    ctaText: 'Agendar cita',
    ctaLink: '#contacto'
};

const EmbudosDeVenta = () => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [content, setContent] = useState(defaultContent);

    useEffect(() => {
        window.scrollTo(0, 0);

        client.fetch(`*[_type == "landingServicio" && slug.current == "embudos"][0]{..., "videoFileUrl": videoFile.asset->url}`)
            .then((data) => {
                if (data) {
                    setContent(Object.assign({}, defaultContent, data));
                }
            })
            .catch(err => console.error("Error fetching embudos content:", err));
    }, []);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <>
            <section className="pt-[100px] min-h-screen flex flex-col bg-[#111111]">
            <div className="flex-1 flex flex-col md:flex-row w-full relative">

                {/* Left Side: Video Area */}
                <div className="w-full md:w-2/3 min-h-[400px] md:min-h-0 bg-[#18181b] relative overflow-hidden group">
                    {/* VIDEO TEMPORALMENTE COMENTADO
<video
                        ref={videoRef}
                        src={content.videoFileUrl || content.videoUrl || embudosVideo}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                        onClick={togglePlay}
                    />
*/}
{/* PLACEHOLDER PARA MANTENER EL DISEÑO */}
<div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10">
    <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center mb-4 opacity-50"><span className="text-2xl ml-1">▶</span></div>
    <span className="text-lg font-medium">Video Placeholder</span>
    <span className="text-sm mt-1">Archivo de video faltante</span>
</div>

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

                {/* Center Divider Line (Desktop only) */}
                <div className="absolute top-0 bottom-0 left-2/3 -translate-x-1/2 w-1 bg-white z-10 hidden md:block"></div>

                {/* Center Icons Stack (Desktop only) */}
                <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-6 py-8">
                    <Link to="/bots" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                        <img src={gifBot} alt="Bot" className="w-8 h-8 object-contain group-hover:scale-110 transition-all" />
                    </Link>
                    <Link to="/audiovisual" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                        <img src={gifVideo} alt="Video" className="w-8 h-8 object-contain group-hover:scale-110 transition-all" />
                    </Link>
                    <div className="w-28 h-28 rounded-full bg-[#CC0000] border-[6px] border-white flex items-center justify-center shadow-2xl cursor-pointer">
                        <img src={gifEmbudo} alt="Embudo" className="w-16 h-16 object-contain" />
                    </div>
                    <Link to="/redes" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                        <img src={gifRedes} alt="Redes Sociales" className="w-8 h-8 object-contain group-hover:scale-110 transition-all" />
                    </Link>
                    <Link to="/seo" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                        <img src={gifSeo} alt="SEO" className="w-8 h-8 object-contain group-hover:scale-110 transition-all" />
                    </Link>
                    <Link to="/crm" className="w-14 h-14 rounded-full bg-[#18181b] border-[3px] border-white flex items-center justify-center mx-auto hover:bg-[#CC0000] transition-all cursor-pointer group shadow-lg">
                        <img src={gifCrm} alt="CRM" className="w-8 h-8 object-contain group-hover:scale-110 transition-all" />
                    </Link>
                </div>

                {/* Right Side: Red Area with Content */}
                <div className="w-full md:w-1/3 bg-[#CC0000] flex flex-col justify-center items-center py-16 md:py-0 px-8 lg:px-12">
                    <div className="max-w-xs flex flex-col items-center text-center">
                        <h1
                            className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-sm leading-tight"
                            dangerouslySetInnerHTML={{ __html: content.title.replace(/\n/g, '<br />') }}
                        />
                        <p className="text-white text-lg md:text-xl mb-10 leading-relaxed font-medium">
                            {content.subtitle}
                        </p>
                        <Link to={content.ctaLink} className="bg-white text-[#CC0000] px-8 py-3 rounded-full font-bold flex items-center gap-3 hover:bg-gray-100 transition-all hover:scale-105 shadow-xl">
                            {content.ctaText} <ArrowRight size={20} className="text-[#CC0000]" />
                        </Link>
                    </div>
                </div>

            </div>

            {/* Mobile Icons Menu */}
            <div className="md:hidden w-full bg-[#111111] py-6 border-t border-gray-800">
                <div className="flex justify-center gap-4 px-4 overflow-x-auto pb-2 items-center">
                    <Link to="/bots" className="w-12 h-12 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                        <img src={gifBot} alt="Bot" className="w-6 h-6 object-contain transition-all" />
                    </Link>
                    <Link to="/audiovisual" className="w-12 h-12 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                        <img src={gifVideo} alt="Video" className="w-6 h-6 object-contain transition-all" />
                    </Link>
                    <div className="w-16 h-16 shrink-0 rounded-full bg-[#CC0000] border-4 border-white flex items-center justify-center shadow-lg">
                        <img src={gifEmbudo} alt="Embudo" className="w-10 h-10 object-contain" />
                    </div>
                    <Link to="/redes" className="w-12 h-12 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                        <img src={gifRedes} alt="Redes Sociales" className="w-6 h-6 object-contain transition-all" />
                    </Link>
                    <Link to="/seo" className="w-12 h-12 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                        <img src={gifSeo} alt="SEO" className="w-6 h-6 object-contain transition-all" />
                    </Link>
                    <Link to="/crm" className="w-12 h-12 shrink-0 rounded-full bg-[#18181b] border-2 border-white flex items-center justify-center hover:bg-[#CC0000] transition-colors group">
                        <img src={gifCrm} alt="CRM" className="w-6 h-6 object-contain transition-all" />
                    </Link>
                </div>
            </div>
        </section>
            <ContactForm showNewsletter={false} />
        </>
    );
};

export default EmbudosDeVenta;
