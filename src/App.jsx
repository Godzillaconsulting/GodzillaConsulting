import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { useState, useEffect, memo } from 'react';
import ColorBends from './components/ColorBends';
const AdminStudio = React.lazy(() => import('./components/AdminStudio'));
import PrivateRoute from './components/PrivateRoute';
import { SiteProvider } from './context/SiteContext';

// Constantes globales inmutables para no forzar re-renders del fondo animado
const COLOR_BENDS_PROPS = {
  colors: ["#ff0000", "#cc0000", "#990000"],
  rotation: -51,
  speed: 0.2,
  scale: 1,
  frequency: 1,
  warpStrength: 1,
  mouseInfluence: 1,
  parallax: 0.5,
  noise: 0.1,
  transparent: true,
  autoRotate: -5,
  color: "#ff0000"
};

// Layout fijo aislado (React.memo blinda contra renders del Router)
const PersistentBackground = memo(() => (
  <div className="bg-brand-black" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden' }}>
    <ColorBends {...COLOR_BENDS_PROPS} />
  </div>
));
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
import LandingPaqueteDynamic from './components/LandingPaqueteDynamic';
import Login from './components/Login';
const Dashboard = React.lazy(() => import('./components/Dashboard'));
import PreguntasFrecuentes from './components/PreguntasFrecuentes';
import RecursoPage from './components/RecursoPage';
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
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // El index.html ya mandó el primer PageView, así que lo omitimos
      isFirstRender.current = false;
      return;
    }
    // Solo registrará los cambios de ruta reales (SPA)
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}

function GodzillaTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(search);
      const utmSource = params.get('utm_source');
      if (utmSource) {
        sessionStorage.setItem('gz_utm_source', utmSource);
        sessionStorage.setItem('gz_utm_medium', params.get('utm_medium') || '');
        sessionStorage.setItem('gz_utm_campaign', params.get('utm_campaign') || '');
      }

      let sessionId = sessionStorage.getItem('gz_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('gz_session_id', sessionId);
      }

      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      fetch(`${backendUrl}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          url: window.location.href,
          utm_source: sessionStorage.getItem('gz_utm_source') || null,
          utm_medium: sessionStorage.getItem('gz_utm_medium') || null,
          utm_campaign: sessionStorage.getItem('gz_utm_campaign') || null
        })
      }).catch(err => console.debug('Tracker err', err.message));
    } catch (e) { }
  }, [pathname, search]);

  return null;
}

function FloatingWhatsApp() {
  const { pathname } = useLocation();
  const hiddenRoutes = ['/login', '/dashboard', '/terminos', '/aviso-privacidad', '/politica-cookies', '/admin', '/cm', '/studio'];

  if (hiddenRoutes.some(route => pathname.startsWith(route))) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-40 pointer-events-auto">
      <div className="relative">
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
  const hideChrome = ['/login', '/dashboard', '/admin', '/cm', '/studio'].some(route => pathname.startsWith(route));

  return (
    <div className="font-sans text-white bg-transparent min-h-screen flex flex-col relative w-full overflow-hidden">
      <PersistentBackground />
      
      {/* Wrapper transparente para eventos del mouse */}
      <div className="relative z-10 flex flex-col flex-grow pointer-events-none">
        <div className="pointer-events-auto w-full">
          {!hideChrome && <Navbar />}
        </div>
        <div className="flex-grow pointer-events-auto">
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
          <Route path="/admin" element={<React.Suspense fallback={<div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-[#CC0000] font-black text-xl tracking-widest"><span className="animate-pulse">CARGANDO GODZILLA STUDIO...</span></div>}><PrivateRoute><AdminStudio /></PrivateRoute></React.Suspense>} />
          <Route path="/cm" element={<React.Suspense fallback={<div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-blue-500 font-black text-xl tracking-widest"><span className="animate-pulse">CARGANDO ASISTENTE CM...</span></div>}><PrivateRoute><AdminStudio /></PrivateRoute></React.Suspense>} />
          <Route path="/studio" element={<React.Suspense fallback={<div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-[#CC0000] font-black text-xl tracking-widest"><span className="animate-pulse">CARGANDO MOTOR IA...</span></div>}><PrivateRoute><AdminStudio /></PrivateRoute></React.Suspense>} />
          <Route path="/recursos/:recursoId" element={<RecursoPage />} />
          <Route path="/:slug" element={<LandingPaqueteDynamic />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<React.Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-white">Cargando panel...</div>}><PrivateRoute><Dashboard /></PrivateRoute></React.Suspense>} />
          <Route path="/faq" element={<PreguntasFrecuentes />} />
        </Routes>
      </div>

        <div className="pointer-events-auto">
          {!hideChrome && <Chatbot />}
          <FloatingWhatsApp />
          {!hideChrome && <Footer />}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <SiteProvider>
      <Router>
        <ScrollToHash />
        <ScrollToTop />
        <PixelTracker />
        <GodzillaTracker />
        <AppLayout />
      </Router>
    </SiteProvider>
  );
}

export default App;
