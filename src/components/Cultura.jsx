import React, { useState, useEffect } from 'react';
import { Target, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import culturaImage from '../assets/images/Nuestra cultura image.jpg';
import dotBg from '../assets/images/dot effect background@2x.png';

const Cultura = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
        }, 6000); // 6 seconds auto-slide
        return () => clearInterval(timer);
    }, [isPaused]);



    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

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
        }

        setIsDragging(false);
        setIsPaused(false);
        setTouchStart(null);
        setTouchEnd(null);
    };
    return (
        <section id="cultura" className="relative py-24 bg-[#111111] overflow-hidden">
            {/* Decorative Elements */}
            <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{
                    backgroundImage: `url(${dotBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            ></div>
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-[#CC0000]/10 to-transparent blur-[100px] pointer-events-none"></div>

            <div className="container relative z-10 mx-auto px-6 max-w-7xl">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Text Content */}
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
                                <span className="block text-gray-500">NUESTRA</span>
                                CULTURA
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
                                <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>

                                    {/* Slide 1: Description */}
                                    <div className="w-full flex-shrink-0 pr-4 py-4 relative pointer-events-none select-none">
                                        <div className="space-y-6 text-xl md:text-3xl text-gray-300 font-light leading-relaxed">
                                            <p>
                                                Somos una agencia de marketing digital ubicada en <strong className="text-white font-medium">Ciudad Juárez, Chihuahua</strong>.
                                            </p>
                                            <p>
                                                Hemos trabajado con médicos, clínicas estéticas, abogados, hoteles, restaurantes y más.
                                            </p>
                                            <p>
                                                Diseñamos campañas y sistemas que priorizan <strong className="text-white font-medium border-b-2 border-[#CC0000]">ventas y rentabilidad</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Slide 2: Mission & Vision */}
                                    <div className="w-full flex-shrink-0 pr-4 py-4 relative pointer-events-none select-none">
                                        <div className="space-y-12">
                                            <div className="group">
                                                <h3 className="text-3xl md:text-4xl font-black text-white tracking-wide uppercase mb-6">MISIÓN</h3>
                                                <p className="text-gray-300 leading-relaxed text-xl md:text-2xl font-light">
                                                    Ayudar a empresas mexicanas a crecer usando tecnología y estrategias digitales. Creemos que todos los negocios merecen las herramientas para competir y prosperar en el mundo actual.
                                                </p>
                                            </div>

                                            <div className="group">
                                                <h3 className="text-3xl md:text-4xl font-black text-white tracking-wide uppercase mb-6">VISIÓN</h3>
                                                <p className="text-gray-300 leading-relaxed text-xl md:text-2xl font-light">
                                                    Multiplicar el 15% de negocios digitalizados en México y elevar ese 4% de éxito, convirtiéndonos en el motor del crecimiento digital del país.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Pagination Dots */}
                                <div className="flex justify-start gap-3 mt-12">
                                    <button
                                        onClick={() => setCurrentSlide(0)}
                                        className={`h-2 rounded-full transition-all duration-300 ${currentSlide === 0 ? 'bg-[#CC0000] w-8' : 'bg-gray-700 hover:bg-gray-500 w-2'}`}
                                        aria-label="Ver descripción"
                                    ></button>
                                    <button
                                        onClick={() => setCurrentSlide(1)}
                                        className={`h-2 rounded-full transition-all duration-300 ${currentSlide === 1 ? 'bg-[#CC0000] w-8' : 'bg-gray-700 hover:bg-gray-500 w-2'}`}
                                        aria-label="Ver misión y visión"
                                    ></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CEO Image Workspace Placeholder */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#CC0000] rounded-2xl transform translate-x-4 translate-y-4 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500"></div>
                        <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-gray-900 shadow-2xl">
                            <img
                                src={culturaImage}
                                alt="Oscar Villanueva - CEO"
                                className="w-full h-full object-cover object-top grayscale transition-all duration-700 hover:scale-105"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Cultura;
