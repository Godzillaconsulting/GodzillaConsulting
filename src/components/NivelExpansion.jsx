import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { client } from '../sanityClient';
import heroBg from '../assets/images/3d-abstract-background-with-cyber-particles-connections-technology-network.jpg';

const defaultContent = {
    heroTopText: 'Organiza un sistema que capture, atienda y organice a tus prospectos sin que tú muevas un dedo',
    heroTitle: 'NIVEL\nEXPANSIÓN',
    heroDisclaimer: 'Si en <span className="font-bold text-white not-italic">30 días hábiles</span>, no generamos ningún lead, te devolvemos el <span className="font-bold text-white not-italic">100%</span> de tu dinero.',
    planTarget: 'Ideal para el que ya tiene experiencia, pero teme tirar el dinero a la basura.',
    planFeaturesExtended: [
        { title: 'Todo lo que incluye el nivel esencial', desc: '• Agente IA (Web + WhatsApp)\n• Respuestas en menos de 5 segundos 24/7\n• Captura de datos automática' },
        { title: 'Tráfico Bilingüe (Ads Meta/Google)', desc: '' },
        { title: 'Landing page de alta conversión', desc: '' }
    ],
    guaranteeTitle: 'GARANTÍA DE SATISFACCIÓN',
    guaranteeBadge: 'Resultados garantizados 100%',
    guaranteeText: 'Estamos tan seguros de nuestros resultados que ofrecemos una garantía total.\n\nSi no cumplimos con los entregables pactados en el tiempo establecido, te devolvemos tu inversión o trabajamos gratis hasta lograrlo.'
};

const NivelExpansion = () => {
    const [content, setContent] = useState(defaultContent);

    useEffect(() => {
        window.scrollTo(0, 0);

        // Fetch content from Sanity
        client.fetch(`*[_type == "landingPaquete" && slug.current == "nivel-expansion"][0]{..., "videoFileUrl": videoFile.asset->url}`)
            .then((data) => {
                if (data) {
                    setContent(Object.assign({}, defaultContent, data));
                }
            })
            .catch(err => console.error("Error fetching paquete content:", err));
    }, []);

    const renderHTML = (rawHTML) => {
        return { __html: (rawHTML || '').replace(/\n/g, '<br />') };
    };

    return (
        <div className="bg-black min-h-screen text-white pt-20">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{ backgroundImage: `url(${heroBg})`, opacity: 0.6 }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black z-0 pointer-events-none" />

                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center h-full pt-10 pb-8">
                    <p className="text-lg md:text-2xl font-bold mb-6 drop-shadow-lg max-w-2xl text-[#f3f3f3]">
                        {content.heroTopText}
                    </p>
                    <h1
                        className="text-[4rem] md:text-[7rem] lg:text-[9rem] font-bold leading-[0.9] tracking-tight mb-16 drop-shadow-2xl"
                        dangerouslySetInnerHTML={renderHTML(content.heroTitle)}
                    />

                    <div className="flex flex-col sm:flex-row gap-6 mb-16 w-full max-w-xl justify-center z-20">
                        <a href="#detalles" className="bg-white text-black px-12 py-4 rounded-full font-bold text-xl hover:bg-gray-200 transition-all flex-1 shadow-xl hover:scale-105">
                            Descubre más
                        </a>
                        <Link to="/#paquetes" className="bg-transparent border-2 border-white text-white px-12 py-4 rounded-full font-bold text-xl hover:bg-white/10 transition-all flex-1 shadow-xl hover:scale-105">
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
                    <div className="flex flex-col lg:flex-row gap-16 lg:gap-16 items-center">

                        {/* Left Card */}
                        <div className="w-full lg:w-[55%] bg-[#1c1c1c] border border-red-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
                            <div className="inline-block border border-gray-600 bg-transparent text-sm text-gray-200 px-5 py-1.5 rounded-full mb-8 font-medium">
                                Detalles del plan
                            </div>

                            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                                {content.heroTitle.replace('\n', ' ')}
                            </h2>

                            <div className="bg-[#FACC15] text-black font-bold text-sm px-4 py-2 rounded-lg inline-block mb-10 w-fit">
                                {content.planTarget}
                            </div>

                            <div className="space-y-6 mb-10 w-full md:pr-4">
                                {content.planFeaturesExtended && content.planFeaturesExtended.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-4 pb-6 border-b border-gray-700">
                                        <div className="shrink-0 mt-1 bg-[#25D366] rounded-full w-6 h-6 flex items-center justify-center">
                                            <Check size={16} className="text-white" strokeWidth={4} />
                                        </div>
                                        <div className="flex flex-col justify-center min-h-[24px]">
                                            <span
                                                className="font-bold text-lg text-white leading-tight mb-0.5"
                                                dangerouslySetInnerHTML={renderHTML(feature.title)}
                                            />
                                            {feature.desc && (
                                                <span
                                                    className="text-gray-300 text-sm leading-relaxed"
                                                    dangerouslySetInnerHTML={renderHTML(feature.desc)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center pt-2">
                                <div className="flex justify-center items-baseline gap-2 mb-8">
                                    <span className="text-[2.75rem] md:text-5xl font-bold text-white">$29,900</span>
                                    <span className="text-xl text-gray-300 font-medium">al mes</span>
                                </div>
                                <Link to="#contacto" className="block text-center w-full max-w-sm mx-auto bg-[#CC0000] text-white py-4 rounded-full font-bold text-xl hover:bg-white hover:text-[#CC0000] transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-transparent hover:border-[#CC0000]">
                                    Activar {content.heroTitle.replace('\n', ' ').toLowerCase()}
                                </Link>
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
                                    className="w-full bg-white rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] min-h-[250px] md:min-h-[300px] lg:min-h-[350px] object-cover"
                                />
                            ) : (
                                <div className="w-full bg-white rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] min-h-[250px] md:min-h-[300px] lg:min-h-[350px]">
                                </div>
                            )}

                            <div className="text-center max-w-sm">
                                <h3 className="text-3xl font-bold text-white mb-6 leading-tight">
                                    {content.guaranteeTitle}
                                </h3>
                                <div className="bg-[#FACC15] text-black font-bold px-8 py-3 rounded-full inline-block mb-6 text-sm hover:scale-105 transition-transform cursor-default">
                                    {content.guaranteeBadge}
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
            <ContactForm />
        </div>
    );
};

export default NivelExpansion;
