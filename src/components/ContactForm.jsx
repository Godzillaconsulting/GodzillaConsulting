import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Video, MapPin } from 'lucide-react';
import godzillaLogoCircle from '../assets/images/logo-godzilla-circle.png';
import instagramIcon from '../assets/icons/1725819461instagram-logo.png';
import facebookIcon from '../assets/icons/1730342312_facebook-logo-2024.png';
import tiktokIcon from '../assets/icons/tik-tok-png-logo-dad7.png';
import linkedinIcon from '../assets/icons/1715491568linkedin-icon-png.png';

const ContactForm = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [sessionType, setSessionType] = useState('video'); // 'video' | 'presencial'

    const handleSubmit = (e) => {
        e.preventDefault();
        if (window.fbq) {
            window.fbq('track', 'Lead');
        }
        setIsSubmitted(true);
    };

    const resetForm = () => {
        setIsSubmitted(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section id="contacto" className="py-24 bg-[#F4F4F4]">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-16">

                    {/* Left Text Column */}
                    <div className="lg:w-1/2 flex flex-col justify-start lg:pt-4">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#CC0000] mb-8 leading-tight tracking-tighter uppercase drop-shadow-sm">
                            Estamos aquí para ayudarte a hacer crecer tu negocio.
                        </h2>
                        <h3 className="text-3xl font-bold text-[#111111] mb-6 tracking-tight">
                            Agenda una cita con nosotros
                        </h3>
                        <p className="text-xl text-gray-700 leading-relaxed font-medium mb-12">
                            Llena el formulario y nos contactaremos contigo lo más pronto posible.
                        </p>

                        <div className="mt-8">
                            <p className="text-lg italic text-gray-600 mb-2 font-medium">¿No puedes acudir a nuestras oficinas?</p>
                            <h4 className="text-2xl font-black text-[#111111] uppercase tracking-wide">
                                ¡Te visitamos en tu negocio!
                            </h4>
                        </div>
                    </div>

                    {/* Right Form Column */}
                    <div className="lg:w-1/2">
                        <div className="bg-[#18181b] p-8 md:p-12 rounded-[2rem] shadow-2xl relative border-[6px] border-[#CC0000] w-full">
                            {!isSubmitted ? (
                                <form className="text-white flex flex-col gap-6" onSubmit={handleSubmit}>

                                    {/* Nombre */}
                                    <div>
                                        <label className="flex items-center text-sm font-bold mb-2">
                                            Nombre completo <span className="text-[#CC0000] mx-1">*</span>
                                        </label>
                                        <input type="text" required placeholder="Juan José Pérez Rojas" className="w-full bg-white text-gray-800 placeholder-gray-500 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000]" />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="flex items-center text-sm font-bold mb-2">
                                            E-mail <span className="text-[#CC0000] mx-1">*</span>
                                        </label>
                                        <input type="email" required placeholder="Juanjoseprojas@outlook.com" className="w-full bg-white text-gray-800 placeholder-gray-500 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000]" />
                                    </div>

                                    {/* Teléfono */}
                                    <div>
                                        <label className="flex items-center text-sm font-bold mb-2">
                                            Número de teléfono <span className="text-[#CC0000] mx-1">*</span>
                                        </label>
                                        <div className="flex bg-white">
                                            <select className="bg-transparent text-gray-700 px-3 py-3 border-r border-gray-300 outline-none appearance-none cursor-pointer text-center" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em', paddingRight: '2rem' }}>
                                                <option>+52</option>
                                                <option>+1</option>
                                            </select>
                                            <input type="tel" required placeholder="656 958 4728" className="w-full bg-transparent text-gray-800 placeholder-gray-500 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000]" />
                                        </div>
                                    </div>

                                    {/* Preferencia de sesión */}
                                    <div className="pt-2">
                                        <label className="flex items-center text-sm font-bold mb-4">
                                            ¿Cómo prefieres tu sesión? <span className="text-[#CC0000] mx-1">*</span>
                                        </label>
                                        <div className="flex flex-col gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setSessionType('video')}
                                                className={`group flex items-center justify-center gap-3 py-4 rounded-full font-bold italic transition-all ${sessionType === 'video' ? 'bg-[#CC0000] text-white shadow-[0_4px_14px_rgba(204,0,0,0.4)] hover:bg-white hover:text-[#CC0000]' : 'bg-transparent text-white border border-white hover:bg-white hover:border-white hover:text-[#CC0000]'}`}
                                            >
                                                <Video size={20} className={sessionType === 'video' ? 'text-current fill-current' : 'text-current group-hover:fill-current'} />
                                                Videollamada (Zoom)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSessionType('presencial')}
                                                className={`group flex items-center justify-center gap-3 py-4 rounded-full font-bold italic transition-all ${sessionType === 'presencial' ? 'bg-[#CC0000] text-white shadow-[0_4px_14px_rgba(204,0,0,0.4)] hover:bg-white hover:text-[#CC0000]' : 'bg-transparent text-white border border-white hover:bg-white hover:border-white hover:text-[#CC0000]'}`}
                                            >
                                                <MapPin size={20} className={sessionType === 'presencial' ? 'text-current fill-current' : 'text-current group-hover:fill-current'} />
                                                Presencial (Ciudad Juárez)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Fecha y Hora */}
                                    <div className="grid grid-cols-2 gap-6 pt-2">
                                        <div>
                                            <label className="flex items-center text-sm font-bold mb-2">
                                                Fecha (lun-vie) <span className="text-[#CC0000] mx-1">*</span>
                                            </label>
                                            <select required defaultValue="" className="w-full bg-white text-gray-800 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000] appearance-none cursor-pointer" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}>
                                                <option value="" disabled className="text-gray-500">dd/mm/aa</option>
                                                <option value="lunes">Lunes</option>
                                                <option value="martes">Martes</option>
                                                <option value="miercoles">Miércoles</option>
                                                <option value="jueves">Jueves</option>
                                                <option value="viernes">Viernes</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="flex items-center text-sm font-bold mb-2">
                                                Hora <span className="text-[#CC0000] mx-1">*</span>
                                            </label>
                                            <select required defaultValue="" className="w-full bg-white text-gray-800 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000] appearance-none cursor-pointer" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}>
                                                <option value="" disabled className="text-gray-500">Seleccionar hora</option>
                                                <option value="09:00">09:00 AM</option>
                                                <option value="12:00">12:00 PM</option>
                                                <option value="15:00">03:00 PM</option>
                                                <option value="18:00">06:00 PM</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <div className="flex flex-col items-center pt-8">
                                        <button type="submit" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-10 py-4 rounded-full font-bold text-lg w-auto transition-all hover:scale-105 uppercase shadow-[0_4px_14px_rgba(204,0,0,0.4)]">
                                            CONFIRMAR CITA
                                        </button>
                                        <p className="mt-6 text-sm font-bold italic text-white flex items-center">
                                            Campos obligatorios <span className="text-[#CC0000] text-lg leading-none ml-1">*</span>
                                        </p>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 animate-fadeIn text-center">
                                    <CheckCircle size={80} className="text-[#25D366] mb-8 animate-bounce" />
                                    <p className="text-[#25D366] font-bold text-sm tracking-widest uppercase mb-4">
                                        TU RESPUESTA FUE ENVIADA CON ÉXITO
                                    </p>
                                    <h3 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                                        ¡MUCHAS GRACIAS<br />POR TU TIEMPO!
                                    </h3>
                                    <p className="text-gray-300 text-lg mb-12 max-w-sm mx-auto">
                                        NUESTRO EQUIPO SE PONDRÁ EN CONTACTO CONTIGO LO MÁS PRONTO POSIBLE.
                                    </p>
                                    <button onClick={resetForm} className="bg-transparent text-white border-2 border-white px-10 py-3 rounded-full font-bold hover:bg-white hover:text-[#111111] transition-colors">
                                        Regresar al formulario
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Newsletter and Social Section */}
                <div className="mt-28 max-w-[350px] mx-auto flex flex-col items-center justify-center text-center">
                    <img src={godzillaLogoCircle} alt="Godzilla Consulting Logo" className="w-[124px] h-[124px] object-contain mb-8" />
                    <h4 className="text-3xl font-black text-[#111111] mb-8 leading-tight tracking-tight">
                        Suscríbete a <br /> nuestro boletín
                    </h4>
                    <div className="w-full flex items-center border-b border-gray-400 pb-2 mb-2 group cursor-pointer focus-within:border-[#CC0000] focus-within:border-b-2 transition-all">
                        <input
                            type="email"
                            placeholder="Ingresa tu correo electrónico"
                            className="w-full bg-transparent outline-none text-[#111111] placeholder-gray-500 font-medium text-sm"
                        />
                        <button className="text-[#111111] group-hover:text-[#CC0000] transition-colors focus:outline-none ml-2">
                            <ArrowRight size={20} />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium tracking-wide w-full text-left mb-16">Obtén las últimas noticias sobre marketing e IA.</p>

                    <h5 className="font-bold text-[#111111] mb-6">Síguenos en redes</h5>
                    <div className="flex justify-center items-center gap-8">
                        <a href="#" className="hover:scale-110 transition-transform">
                            <img src={instagramIcon} alt="Instagram" className="w-10 h-10 object-contain" />
                        </a>
                        <a href="#" className="hover:scale-110 transition-transform">
                            <img src={facebookIcon} alt="Facebook" className="w-10 h-10 object-contain" />
                        </a>
                        <a href="#" className="hover:scale-110 transition-transform">
                            <img src={tiktokIcon} alt="TikTok" className="w-10 h-10 object-contain" />
                        </a>
                        <a href="#" className="hover:scale-110 transition-transform">
                            <img src={linkedinIcon} alt="LinkedIn" className="w-10 h-10 object-contain" />
                        </a>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default ContactForm;
