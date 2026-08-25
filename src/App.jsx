import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import React, { useState, useEffect, memo, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
const CustomCursor = React.lazy(() => import('./components/CustomCursor'));
import PrivateRoute from './components/PrivateRoute';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { SiteProvider, useSiteData } from './context/SiteContext';
import { useTranslation } from 'react-i18next';

// Eliminando CONSTANTS de ColorBends ya que usa ParticleField en Hero

// Componentes críticos cargados inmediatamente (above-the-fold / First Contentful Paint)
import Navbar from './components/Navbar';
import Hero from './components/Hero';

// Below-the-fold — lazy loaded para reducir initial bundle de ~449KB a ~120KB
const Cultura = React.lazy(() => import('./components/Cultura'));
const Servicios = React.lazy(() => import('./components/Servicios'));
const CasosExito = React.lazy(() => import('./components/CasosExito'));
const Recursos = React.lazy(() => import('./components/Recursos'));
const Paquetes = React.lazy(() => import('./components/Paquetes'));
const Responsabilidades = React.lazy(() => import('./components/Responsabilidades'));
const ContactForm = React.lazy(() => import('./components/ContactForm'));
const Footer = React.lazy(() => import('./components/Footer'));
const Chatbot = React.lazy(() => import('./components/Chatbot'));
const CookieConsent = React.lazy(() => import('./components/CookieConsent'));


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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
  const hideChromeRoutes = [
    '/login', '/admin', '/cm', '/studio', '/godzilla-sora',
    '/posicionamiento-social', '/control-ia', '/expansion', '/elite', '/formulario'
  ];
  const hideChrome = hideChromeRoutes.some(route => pathname.startsWith(route));

  // SWR: render inmediato con defaults de studioConfig.js, datos frescos llegan en background

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
