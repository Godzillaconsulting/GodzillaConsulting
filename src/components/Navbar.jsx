import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Globe } from 'lucide-react';
import logo from '../assets/Godzilla Consulting.png';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'INICIO', href: '/#inicio' },
        { name: 'CULTURA', href: '/#cultura' },
        { name: 'SERVICIOS', href: '/#servicios' },
        { name: 'PAQUETES', href: '/#paquetes' },
        { name: 'PORTAFOLIO', href: '/#portafolio' },
        { name: 'RECURSOS', href: '/#recursos' },
    ];

    return (
        <>
            <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#111111]/95 backdrop-blur-md shadow-lg py-4' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/#inicio" className="flex items-center gap-3">
                            <img src={logo} alt="Godzilla Consulting" className="h-10 object-contain" />
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden xl:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <Link key={link.name} to={link.href} className="text-sm font-semibold tracking-wide hover:text-[#CC0000] transition-colors">
                                    {link.name}
                                </Link>
                            ))}
                            <Link to="/#contacto" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-[30px] text-sm font-bold tracking-wide transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5">
                                CONTÁCTANOS
                            </Link>

                            <div className="flex items-center gap-4 border-l border-gray-700 pl-4 ml-2">
                                <button className="flex items-center gap-1 text-sm font-semibold hover:text-[#CC0000] transition-colors">
                                    <Globe size={18} />
                                    ESP
                                </button>
                            </div>
                        </nav>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="xl:hidden text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                <div className={`xl:hidden absolute top-full left-0 w-full bg-[#111111]/95 backdrop-blur-md border-t border-gray-800 transition-all duration-300 origin-top overflow-hidden ${isMobileMenuOpen ? 'max-h-[500px] py-4 shadow-xl' : 'max-h-0 py-0'}`}>
                    <div className="flex flex-col gap-4 px-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.href}
                                className="text-lg font-semibold hover:text-[#CC0000] transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <Link to="/#contacto" className="bg-[#CC0000] text-center hover:bg-white text-white hover:text-[#CC0000] px-6 py-3 rounded-[30px] text-sm font-bold transition-colors mt-2" onClick={() => setIsMobileMenuOpen(false)}>
                            CONTÁCTANOS
                        </Link>
                        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-800">
                            <button className="flex items-center gap-2 text-sm font-semibold hover:text-[#CC0000] transition-colors">
                                <Globe size={20} /> ESP
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Navbar;
