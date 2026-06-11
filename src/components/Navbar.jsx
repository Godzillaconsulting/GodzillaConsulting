import React, { useState, useEffect } from'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from'../assets/Godzilla Consulting.png';

const Navbar = () => {
 const [isScrolled, setIsScrolled] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [activeTab, setActiveTab] = useState('/#inicio');

 const { t } = useTranslation();
 const location = useLocation();
    
    // Nombres extraidos del archivo de traducción
    const navLinks = [
        { name: t('navbar.home'), href:'/' },
        { name: t('navbar.culture', 'CULTURA'), href:'/#cultura' }, 
        { name: t('navbar.services'), href:'/#servicios' },
        { name: t('navbar.portfolio'), href:'/#portafolio' },
        { name: t('navbar.resources', 'RECURSOS'), href:'/#recursos' }, 
        { name: t('navbar.packages', 'PAQUETES'), href:'/#paquetes' }, 
    ];

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

 return (
 <>
 <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ?'bg-[#111111]/95 backdrop-blur-md shadow-lg py-4' :'bg-transparent py-6'}`}>
 <div className="container mx-auto px-6 max-w-7xl">
 <div className="flex items-center justify-between">
 {/* Logo */}
 <Link to="/#inicio" className="flex items-center gap-3">
 <img src={logo} alt="Godzilla Consulting" className="h-10 object-contain" />
 </Link>

 {/* Desktop Nav */}
 <nav className="hidden xl:flex items-center gap-8">
 {navLinks.map((link) => {
  const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
  return (
   <Link 
     key={link.href} 
     to={link.href} 
     className="relative text-white text-sm font-semibold tracking-wide uppercase transition-colors py-1 hover:text-[#CC0000]"
   >
     {link.name}
     <span className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#CC0000] rounded-full transition-transform duration-300 origin-center ${isActive ? 'scale-x-100' : 'scale-x-0'}`}></span>
   </Link>
  );
 })}
 <Link to="/#contacto" className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-[30px] text-sm font-bold tracking-wide transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5 uppercase">
 {t('navbar.start_now', 'CONTÁCTANOS')}
 </Link>

 <div className="flex items-center gap-4 border-l border-gray-700 pl-4 ml-2">
 <Link to="/login" className="flex items-center justify-center w-6 h-6 rounded-full transition-all opacity-80 hover:opacity-100 hover:scale-110" title={t('navbar.login', 'Acceso al Studio')}>
 <span className="material-symbols-outlined text-white text-xl select-none hover:text-[#CC0000] transition-colors">admin_panel_settings</span>
 </Link>
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
 <div className={`xl:hidden absolute top-full left-0 w-full bg-[#111111]/95 backdrop-blur-md border-t border-gray-800 transition-all duration-300 origin-top overflow-hidden ${isMobileMenuOpen ?'max-h-[500px] py-4 shadow-xl' :'max-h-0 py-0'}`}>
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
 <Link to="/#contacto" className="bg-[#CC0000] text-center hover:bg-white text-white hover:text-[#CC0000] px-6 py-3 rounded-[30px] text-sm font-bold transition-colors mt-2 uppercase" onClick={() => setIsMobileMenuOpen(false)}>
 {t('navbar.start_now', 'CONTÁCTANOS')}
 </Link>
 <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-800">
 <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#CC0000] transition-colors">
 <span className="material-symbols-outlined text-xl select-none align-middle mr-1">admin_panel_settings</span> Studio
 </Link>
 </div>
 </div>
 </div>
 </header>

 {/* Login Modal Removido: Usando ruta dedicada /login */}
 </>
 );
};

export default Navbar;
