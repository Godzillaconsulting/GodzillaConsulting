import React, { useState, useEffect } from'react';
import { Link, useNavigate } from'react-router-dom';
import { Menu, X, Globe } from'lucide-react';
import logo from'../assets/Godzilla Consulting.png';

const Navbar = () => {
 const [isScrolled, setIsScrolled] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

 // Login Modal State
 const [showLoginModal, setShowLoginModal] = useState(false);
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [loginError, setLoginError] = useState(false);
 const navigate = useNavigate();

 const handleLogin = async (e) => {
 e.preventDefault();
 try {
 const API_BASE = import.meta.env.DEV ?'http://localhost:3000' :'';
 const res = await fetch(`${API_BASE}/api/auth/login`, {
 method:'POST',
 headers: {'Content-Type':'application/json' },
 body: JSON.stringify({ username, password })
 });
 const data = await res.json();
 
 if (data.success) {
 localStorage.setItem('adminToken', data.token);
 localStorage.setItem('adminUser', data.username || username);
 setShowLoginModal(false);
 setUsername('');
 setPassword('');
 setLoginError(false);
 navigate('/admin');
 setIsMobileMenuOpen(false);
 } else {
 setLoginError(true);
 }
 } catch (err) {
 console.error(err);
 setLoginError(true);
 }
 };


 useEffect(() => {
 const handleScroll = () => {
 setIsScrolled(window.scrollY > 50);
 };
 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 const navLinks = [
 { name:'INICIO', href:'/#inicio' },
 { name:'CULTURA', href:'/#cultura' },
 { name:'SERVICIOS', href:'/#servicios' },
 { name:'PAQUETES', href:'/#paquetes' },
 { name:'PORTAFOLIO', href:'/#portafolio' },
 { name:'RECURSOS', href:'/#recursos' },
 ];

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
 <button onClick={() => setShowLoginModal(true)} className="flex items-center justify-center w-6 h-6 rounded-full transition-all opacity-80 hover:opacity-100 hover:scale-110" title="Acceso al Studio">
 <span className="text-xl filter grayscale hover:grayscale-0">🦖</span>
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
 <Link to="/#contacto" className="bg-[#CC0000] text-center hover:bg-white text-white hover:text-[#CC0000] px-6 py-3 rounded-[30px] text-sm font-bold transition-colors mt-2" onClick={() => setIsMobileMenuOpen(false)}>
 CONTÁCTANOS
 </Link>
 <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-800">
 <button className="flex items-center gap-2 text-sm font-semibold hover:text-[#CC0000] transition-colors">
 <Globe size={20} /> ESP
 </button>
 <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#CC0000] transition-colors">
 <span className="text-xl filter grayscale hover:grayscale-0">🦖</span> Studio
 </button>
 </div>
 </div>
 </div>
 </header>

 {/* Login Modal */}
 {showLoginModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
 <div className="bg-[#18181b] border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(204,0,0,0.15)] relative animate-in fade-in zoom-in duration-200">
 <button 
 onClick={() => {setShowLoginModal(false); setLoginError(false);}}
 className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
 >
 <X size={24} />
 </button>
 
 <div className="flex flex-col items-center mb-8">
 <img src={logo} alt="Godzilla" className="h-16 object-contain mb-4" />
 <h3 className="text-2xl font-black text-white tracking-tight">Acceso Restringido</h3>
 <p className="text-sm text-gray-400 mt-2">Ingresa credenciales de administrador</p>
 </div>

 <form onSubmit={handleLogin} className="space-y-5">
 <div>
 <label className="block text-sm font-semibold tracking-wide text-gray-400 mb-2">Usuario</label>
 <input 
 type="text" 
 value={username}
 onChange={(e) => {setUsername(e.target.value); setLoginError(false);}}
 className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
 placeholder="ej. admin"
 autoFocus
 />
 </div>
 <div>
 <label className="block text-sm font-semibold tracking-wide text-gray-400 mb-2">Contraseña</label>
 <input 
 type="password" 
 value={password}
 onChange={(e) => {setPassword(e.target.value); setLoginError(false);}}
 className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
 placeholder="••••••••"
 />
 </div>
 
 {loginError && (
 <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold text-center p-3 rounded-lg mt-2">
 Credenciales incorrectas. Intenta de nuevo.
 </div>
 )}
 
 <button 
 type="submit"
 className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(204,0,0,0.3)] hover:shadow-[0_0_30px_rgba(204,0,0,0.5)] mt-8"
 >
 Autorizar Acceso
 </button>
 </form>
 </div>
 </div>
 )}
 </>
 );
};

export default Navbar;
