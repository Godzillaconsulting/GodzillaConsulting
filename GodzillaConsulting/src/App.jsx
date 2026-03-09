import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Cultura from './components/Cultura';
import Servicios from './components/Servicios';
import CasosExito from './components/CasosExito';
import Recursos from './components/Recursos';
import Paquetes from './components/Paquetes';
import Responsabilidades from './components/Responsabilidades';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import TerminosYCondiciones from './components/TerminosYCondiciones';
import AvisoPrivacidad from './components/AvisoPrivacidad';
import PoliticaCookies from './components/PoliticaCookies';
import Chatbot from './components/Chatbot';
import Bots from './components/Bots';
import ProduccionAudiovisual from './components/ProduccionAudiovisual';
import EmbudosDeVenta from './components/EmbudosDeVenta';
import GestionRedesSociales from './components/GestionRedesSociales';
import OptimizacionWebSeo from './components/OptimizacionWebSeo';
import CrmSaas from './components/CrmSaas';
import NivelEsencial from './components/NivelEsencial';
import NivelExpansion from './components/NivelExpansion';
import NivelElite from './components/NivelElite';
import LandingPaqueteDynamic from './components/LandingPaqueteDynamic';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PreguntasFrecuentes from './components/PreguntasFrecuentes';
import whatsappIcon from './assets/icons/WhatsApp (white).png';

function ScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [hash]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function PixelTracker() {
  const { pathname } = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, initialized]);

  return null;
}

function FloatingWhatsApp() {
  const { pathname } = useLocation();
  const [showTooltip, setShowTooltip] = useState(false);
  const hiddenRoutes = ['/login', '/dashboard', '/terminos', '/aviso-privacidad', '/politica-cookies'];

  useEffect(() => {
    // Initial delay before showing the tooltip for the first time
    const initialTimer = setTimeout(() => setShowTooltip(true), 8000);

    // Cycle showing and hiding the tooltip
    const cycleInterval = setInterval(() => {
      setShowTooltip(prev => !prev);
    }, 15000); // Toggle every 15 seconds

    return () => {
      clearTimeout(initialTimer);
      clearInterval(cycleInterval);
    };
  }, []);

  if (hiddenRoutes.includes(pathname)) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start pointer-events-none">
      <div
        className={`relative mb-4 ml-2 bg-white text-black px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold text-center leading-snug w-max border border-gray-100 transition-all duration-1000 transform origin-bottom-left ${showTooltip ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}
      >
        ¿Tienes dudas?<br />Mándanos mensaje
        <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white transform rotate-45 border-r border-b border-gray-100"></div>
      </div>
      <div className="relative pointer-events-auto">
        <div className="absolute inset-0 bg-[#25D366] rounded-full blur-md animate-pulse opacity-70"></div>
        <a href="https://wa.me/526565818912?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20sus%20servicios" target="_blank" rel="noopener noreferrer" className="relative bg-[#25D366] hover:bg-green-600 p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center">
          <img src={whatsappIcon} alt="WhatsApp" className="w-8 h-8 object-contain" />
        </a>
      </div>
    </div>
  );
}

function Home() {
  return (
    <main>
      <Hero />
      <Cultura />
      <Servicios />
      <CasosExito />
      <Recursos />
      <Paquetes />
      <Responsabilidades />
      <ContactForm />
    </main>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const hideChrome = ['/login', '/dashboard'].includes(pathname);

  return (
    <div className="font-sans text-white bg-brand-black min-h-screen flex flex-col">
      {!hideChrome && <Navbar />}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/terminos" element={<TerminosYCondiciones />} />
          <Route path="/aviso-privacidad" element={<AvisoPrivacidad />} />
          <Route path="/politica-cookies" element={<PoliticaCookies />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/audiovisual" element={<ProduccionAudiovisual />} />
          <Route path="/embudos" element={<EmbudosDeVenta />} />
          <Route path="/redes" element={<GestionRedesSociales />} />
          <Route path="/seo" element={<OptimizacionWebSeo />} />
          <Route path="/crm" element={<CrmSaas />} />
          <Route path="/nivel-esencial" element={<NivelEsencial />} />
          <Route path="/nivel-expansion" element={<NivelExpansion />} />
          <Route path="/nivel-elite" element={<NivelElite />} />
          <Route path="/:slug" element={<LandingPaqueteDynamic />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/faq" element={<PreguntasFrecuentes />} />
        </Routes>
      </div>

      <Chatbot />
      <FloatingWhatsApp />

      {!hideChrome && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToHash />
      <ScrollToTop />
      <PixelTracker />
      <AppLayout />
    </Router>
  );
}

export default App;
