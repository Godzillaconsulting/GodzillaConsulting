import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import logo from '../assets/Blanco_Logo.png';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-t from-[#ba0000] via-[#850000] to-[#4a0000]">


            {/* Main Footer Links */}
            <div className="container mx-auto px-6 max-w-[1400px] py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-12 lg:gap-0 text-white">

                    {/* Contact Info */}
                    <div className="space-y-6 lg:pr-8 xl:pr-12">
                        <h4 className="text-2xl font-bold tracking-tight mb-8">Información de <br />contacto</h4>
                        <a href="mailto:info@godzillaconsulting.ai" className="flex items-center gap-3 hover:text-red-200 transition-colors">
                            <Mail size={18} />
                            <span className="font-medium">info@godzillaconsulting.ai</span>
                        </a>
                        <a href="tel:+526565818912" className="flex items-center gap-3 hover:text-red-200 transition-colors">
                            <Phone size={18} />
                            <span className="font-medium">656 581 8912</span>
                        </a>
                    </div>

                    {/* Navigation */}
                    <div className="lg:px-8 xl:px-12 lg:border-l border-white/30">
                        <h4 className="text-2xl font-bold tracking-tight mb-8">Navegación</h4>
                        <div className="grid grid-cols-2 gap-y-4">
                            <div className="flex flex-col gap-4">
                                <Link to="/#inicio" className="hover:text-red-200 transition-colors font-medium text-sm">Inicio</Link>
                                <Link to="/#cultura" className="hover:text-red-200 transition-colors font-medium text-sm">Cultura</Link>
                                <Link to="/#servicios" className="hover:text-red-200 transition-colors font-medium text-sm">Servicios</Link>
                            </div>
                            <div className="flex flex-col gap-4">
                                <Link to="/#paquetes" className="hover:text-red-200 transition-colors font-medium text-sm">Paquetes</Link>
                                <Link to="/#portafolio" className="hover:text-red-200 transition-colors font-medium text-sm">Portafolio</Link>
                                <Link to="/#recursos" className="hover:text-red-200 transition-colors font-medium text-sm">Recursos</Link>
                            </div>
                        </div>
                    </div>

                    {/* Legal Links */}
                    <div className="lg:px-8 xl:px-12 lg:border-l border-white/30 flex flex-col justify-end pb-1 pt-12 lg:pt-0">
                        <div className="flex flex-col gap-4">
                            <Link to="/aviso-privacidad" className="hover:text-red-200 transition-colors font-medium text-sm">Aviso de privacidad</Link>
                            <Link to="/terminos" className="hover:text-red-200 transition-colors font-medium text-sm">Términos y condiciones</Link>
                            <Link to="/politica-cookies" className="hover:text-red-200 transition-colors font-medium text-sm">Política de cookies</Link>
                            <Link to="/faq" className="hover:text-red-200 transition-colors font-medium text-sm">Preguntas frecuentes</Link>
                            <Link to="/#contacto" className="hover:text-red-200 transition-colors font-medium text-sm">Contacto</Link>
                        </div>
                    </div>

                    {/* Logo */}
                    <div className="flex items-center justify-start lg:justify-center lg:pl-12 lg:border-l border-white/30 pt-12 lg:pt-0">
                        <Link to="/#inicio" className="transition-transform duration-300 hover:scale-105">
                            <img src={logo} alt="Godzilla Consulting" className="h-10 lg:h-12 object-contain" />
                        </Link>
                    </div>

                </div>

                {/* Copyright */}
                <div className="text-center mt-12 pt-8 text-sm font-medium text-white/70">
                    © {new Date().getFullYear()} Godzilla Co. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
