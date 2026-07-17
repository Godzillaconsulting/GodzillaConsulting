import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import React, { useState, useEffect, memo, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import CustomCursor from './components/CustomCursor';
import PrivateRoute from './components/PrivateRoute';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { SiteProvider, useSiteData } from './context/SiteContext';
import { useTranslation } from 'react-i18next';

// Eliminando CONSTANTS de ColorBends ya que usa ParticleField en Hero

// Componentes críticos cargados inmediatamente (First Contentful Paint)
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
import Chatbot from './components/Chatbot';
import whatsappIcon from './assets/icons/WhatsApp (white).png';
import CookieConsent from './components/CookieConsent';

// Lazy loading para optimizar el peso del compilado de Vite
const AdminStudio = React.lazy(() => import('./components/AdminStudio'));
const ErrorBoundary = React.lazy(() => import('./components/ErrorBoundary'));
const TerminosYCondiciones = React.lazy(() => import('./components/TerminosYCondiciones'));
const AvisoPrivacidad = React.lazy(() => import('./components/AvisoPrivacidad'));
const PoliticaCookies = React.lazy(() => import('./components/PoliticaCookies'));
const Bots = React.lazy(() => import('./components/Bots'));
const ProduccionAudiovisual = React.lazy(() => import('./components/ProduccionAudiovisual'));
const EmbudosDeVenta = React.lazy(() => import('./components/EmbudosDeVenta'));
const GestionRedesSociales = React.lazy(() => import('./components/GestionRedesSociales'));
const OptimizacionWebSeo = React.lazy(() => import('./components/OptimizacionWebSeo'));
const CrmSaas = React.lazy(() => import('./components/CrmSaas'));
const LandingPaqueteDynamic = React.lazy(() => import('./components/LandingPaqueteDynamic'));
const Login = React.lazy(() => import('./components/Login'));
const FormAbordaje = React.lazy(() => import('./components/FormAbordaje'));
const SEOPageWrapper = React.lazy(() => import('./components/SEOPageWrapper'));

const PreguntasFrecuentes = React.lazy(() => import('./components/PreguntasFrecuentes'));
const RecursoPage = React.lazy(() => import('./components/RecursoPage'));
const GodzillaSora = React.lazy(() => import('./components/GodzillaSora'));
const SociosGodzilla = React.lazy(() => import('./components/SociosGodzilla'));

// Animación principal gobernada de forma particular por el Componente Hero.jsx. No requiere background global.

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
      isFirstRender.current = false;
      return;
    }
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

      const backendUrl = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
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
  const hiddenRoutes = ['/login', '/terminos', '/aviso-privacidad', '/politica-cookies', '/admin', '/cm', '/studio', '/godzilla-sora', '/form'];

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

function GlobalSuspenseFallback() {
  const { i18n } = useTranslation();
  const isEng = i18n.resolvedLanguage ? i18n.resolvedLanguage.startsWith('en') : false;
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-[#CC0000] font-black text-xl tracking-widest z-50 fixed top-0 left-0">
      <span className="animate-pulse">{isEng ? 'LOADING RESOURCES...' : 'CARGANDO RECURSOS...'}</span>
    </div>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const { loading } = useSiteData();
  const hideChromeRoutes = [
    '/login', '/admin', '/cm', '/studio', '/godzilla-sora',
    '/posicionamiento-social', '/control-ia', '/expansion', '/elite', '/formulario'
  ];
  const hideChrome = hideChromeRoutes.some(route => pathname.startsWith(route));

  if (loading) {
    return <GlobalSuspenseFallback />;
  }

  return (
    <div className="font-sans text-white bg-[#050505] min-h-screen flex flex-col relative w-full overflow-hidden">
      {/* Wrapper transparente para eventos del mouse */}
      <div className="relative z-10 flex flex-col flex-grow pointer-events-none">
        <div className="pointer-events-auto w-full">
          {!hideChrome && <Navbar />}
        </div>
        
        <div className="flex-grow pointer-events-auto">
          {/* GlobalErrorBoundary atrapa errores en cualquier subpágina para que no se quede la pantalla en negro */}
          <GlobalErrorBoundary>
            {/* El Suspense envuelve todas las rutas Lazy */}
            <Suspense fallback={<GlobalSuspenseFallback />}>
              <Routes>
                {/* Mega-Embudo principal */}
                <Route path="/" element={<Home />} />

                {/* Rutas SEO Satélite Independientes */}
                <Route path="/servicios" element={
                  <SEOPageWrapper title="Servicios B2B y Motores IA" description="Descubre los servicios de automatización de inteligencia artificial e implementación B2B.">
                    <Servicios />
                  </SEOPageWrapper>
                } />
                
                <Route path="/paquetes" element={
                  <SEOPageWrapper title="Paquetes de Suscripción" description="Cotiza y contrata las suscripciones mensuales de automatización IA y gestión omnicanal.">
                    <Paquetes />
                  </SEOPageWrapper>
                } />
                
                <Route path="/portafolio" element={
                  <SEOPageWrapper title="Casos de Éxito y Portafolio" description="Casos reales de aumento de retorno de inversión mediante la integración de IA autónoma.">
                    <CasosExito />
                  </SEOPageWrapper>
                } />
                
                <Route path="/cultura" element={
                  <SEOPageWrapper title="Manifiesto y Cultura" description="Nuestra filosofía estricta de aceleración empresarial corporativa.">
                    <Cultura />
                  </SEOPageWrapper>
                } />
                
                <Route path="/recursos" element={
                  <SEOPageWrapper title="Recursos Gratuitos de IA" description="Informes ejecutivos y guías para directores y estrategas de marketing.">
                    <Recursos />
                  </SEOPageWrapper>
                } />

                {/* Políticas y Legacy */}
                <Route path="/terminos" element={<TerminosYCondiciones />} />
                <Route path="/aviso-privacidad" element={<AvisoPrivacidad />} />
                <Route path="/politica-cookies" element={<PoliticaCookies />} />
                <Route path="/bots" element={<Bots />} />
                <Route path="/audiovisual" element={<ProduccionAudiovisual />} />
                <Route path="/embudos" element={<EmbudosDeVenta />} />
                <Route path="/redes" element={<GestionRedesSociales />} />
                <Route path="/seo" element={<OptimizacionWebSeo />} />
                <Route path="/crm" element={<CrmSaas />} />
                <Route path="/admin/*" element={<ErrorBoundary><PrivateRoute><AdminStudio /></PrivateRoute></ErrorBoundary>} />
                <Route path="/cm" element={<Navigate to="/admin/calendar" replace />} />
                <Route path="/studio" element={<Navigate to="/admin/studio" replace />} />
                <Route path="/godzilla-sora" element={<ErrorBoundary><PrivateRoute><GodzillaSora /></PrivateRoute></ErrorBoundary>} />
                <Route path="/recursos/:recursoId" element={<RecursoPage />} />
                <Route path="/:slug" element={<LandingPaqueteDynamic />} />
                <Route path="/login" element={<Login />} />
                <Route path="/formulario" element={<FormAbordaje />} />
                <Route path="/faq" element={<PreguntasFrecuentes />} />
              </Routes>
            </Suspense>
          </GlobalErrorBoundary>
        </div>

        <div className="pointer-events-auto">
          {!hideChrome && <Chatbot />}
          <FloatingWhatsApp />
          {!hideChrome && <Footer />}
          {!hideChrome && <CookieConsent />}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <SiteProvider>
        <Router>
          <CustomCursor />
          <ScrollToHash />
          <ScrollToTop />
          <PixelTracker />
          <GodzillaTracker />
          <Suspense fallback={<div className="bg-black min-h-screen flex items-center justify-center text-white"><div className="animate-pulse tracking-widest text-sm">LOADING ASSETS...</div></div>}>
            <AppLayout />
          </Suspense>
        </Router>
      </SiteProvider>
    </HelmetProvider>
  );
}

export default App;
