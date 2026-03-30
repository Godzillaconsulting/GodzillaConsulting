import React, { Suspense, lazy, useEffect, useRef, useState, Component } from'react';
import { MemoryRouter, Routes, Route } from'react-router-dom';

// ── Componentes del sitio (lazy) ──────────────────────────────────────────────
const Hero = lazy(() => import('./Hero'));
const Servicios = lazy(() => import('./Servicios'));
const Cultura = lazy(() => import('./Cultura'));
const CasosExito = lazy(() => import('./CasosExito'));
const Recursos = lazy(() => import('./Recursos'));
const Paquetes = lazy(() => import('./Paquetes'));
const Footer = lazy(() => import('./Footer'));
const Bots = lazy(() => import('./Bots'));
const ProduccionAudiovisual = lazy(() => import('./ProduccionAudiovisual'));
const EmbudosDeVenta = lazy(() => import('./EmbudosDeVenta'));
const GestionRedesSociales = lazy(() => import('./GestionRedesSociales'));
const OptimizacionWebSeo = lazy(() => import('./OptimizacionWebSeo'));
const CrmSaas = lazy(() => import('./CrmSaas'));
const RecursoPage = lazy(() => import('./RecursoPage'));


// ── ErrorBoundary: evita que un crash del preview derrumbe todo el admin ──────
class PreviewErrorBoundary extends Component {
 constructor(props) { super(props); this.state = { error: null }; }
 static getDerivedStateFromError(error) { return { error }; }
 componentDidCatch(err) { console.warn('[StudioPreview] Error en preview:', err.message); }
 render() {
 if (this.state.error) {
 return (
 <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 bg-[#0a0a0a]">
 <span className="text-5xl">⚠️</span>
 <p className="text-sm font-bold text-neutral-300">Error cargando la vista previa</p>
 <p className="text-xs text-neutral-600 max-w-xs">{this.state.error.message}</p>
 <button
 onClick={() => this.setState({ error: null })}
 className="text-xs px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-300 transition"
 >
 Reintentar
 </button>
 </div>
 );
 }
 return this.props.children;
 }
}

// ── Preview simplificada para paquetes (sin dependencias de router/video) ─────
function LandingCardPreview({ nodeId, draftData }) {
 if (!draftData) return null;
 const d = draftData;
 return (
 <div className="min-h-screen bg-black text-white pt-16 pb-10 px-6">
 {/* Hero */}
 <div className="text-center mb-12">
 {d.heroTopText && <p className="text-lg text-gray-300 mb-4 font-medium">{d.heroTopText}</p>}
 <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tighter" dangerouslySetInnerHTML={{ __html: d.heroTitle ||'Plan' }} />
 {d.videoFileUrl || d.videoUrl ? (
 <video src={d.videoFileUrl || d.videoUrl} autoPlay muted loop playsInline className="w-full max-w-md mx-auto rounded-3xl shadow-2xl mb-6 object-cover" style={{ maxHeight:'300px' }} />
 ) : ( <div className="w-full max-w-md mx-auto h-48 bg-neutral-900 rounded-3xl mb-6 border border-neutral-800 flex items-center justify-center text-neutral-700 text-sm">Sin video</div> )}
 </div>

 {/* Details card */}
 <div className="max-w-2xl mx-auto bg-[#1c1c1c] border border-[#CC0000] rounded-3xl p-8 shadow-2xl">
 <div className="inline-block border border-gray-600 text-xs text-gray-300 px-4 py-1 rounded-full mb-6">Detalles del plan</div>
 <h2 className="text-4xl font-black mb-4" dangerouslySetInnerHTML={{ __html: d.heroTitle ||'Plan' }} />
 {d.planTarget && <div className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-lg inline-block mb-6">{d.planTarget}</div>}

 {/* Features */}
 <div className="space-y-4 mb-8">
 {(d.planFeaturesExtended || []).slice(0, 6).map((f, i) => (
 <div key={i} className="flex items-start gap-3 pb-4 border-b border-neutral-700">
 <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
 <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
 </div>
 <div>
 <p className="font-bold text-sm text-white" dangerouslySetInnerHTML={{ __html: f.title ||'' }} />
 {f.desc && <p className="text-xs text-gray-400 mt-1" dangerouslySetInnerHTML={{ __html: f.desc }} />}
 </div>
 </div>
 ))}
 {(d.planFeaturesExtended || []).length === 0 && (
 <p className="text-neutral-600 text-sm text-center py-4">No hay características definidas aún. Añádelas en la pestaña Elementos.</p>
 )}
 </div>

 {/* Precio */}
 <div className="text-center">
 <div className="flex items-baseline justify-center gap-2 mb-6">
 <span className="text-5xl font-black">{d.planPrice ||'Consúltalo'}</span>
 {d.planPeriod && <span className="text-lg text-gray-300">{d.planPeriod}</span>}
 </div>
 {d.guaranteeText && (
 <div className="bg-neutral-900 rounded-2xl p-4 mb-6">
 <h3 className="font-bold text-white mb-2 text-sm">Garantía</h3>
 <p className="text-xs text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: d.guaranteeText }} />
 </div>
 )}
 <div className="w-full py-4 bg-[#CC0000] text-white rounded-full font-black text-lg">Contáctanos</div>
 </div>
 </div>
 </div>
 );
}

// ── Mapa correcto de nodeId → ID del section en el DOM real ──────────────────
// (verificado mirando cada componente)
const SECTION_IDS = {'hero':'inicio','servicios':'servicios','casos':'portafolio', // CasosExito usa id="portafolio"'recursos':'recursos','paquetes':'paquetes','footer':'footer-section',
};

// ── Mapa de resaltado: fieldKey → selectores CSS dentro de la sección ──────
const HIGHLIGHT_MAP = {'hero': {'section': ['#inicio'],'title': ['#inicio h1','#inicio [class*="text-4xl"]','#inicio [class*="text-5xl"]'],'subtitle': ['#inicio p'],'ctaText': ['#inicio a'],'imageUrl': ['#inicio img'],'videoUrl': ['#inicio video'],'bgColor': ['#inicio'],'accentColor':['#inicio a','#inicio h1'],
 },'servicios': {'section': ['#servicios'],'title': ['#servicios h2'],'elements': ['#servicios .grid, #servicios ul'],'videoUrl': ['#servicios video'],'bgColor': ['#servicios'],'accentColor':['#servicios h2'],
 },'cultura': {'section': ['section[id="cultura"], div[id="cultura"]'],'title': ['[id="cultura"] h2'],'imageUrl': ['[id="cultura"] img'],
 },'casos': {'section': ['#portafolio'],'title': ['#portafolio h2'],'elements': ['#portafolio [class*="rounded"]'],'imageUrl': ['#portafolio img'],'bgColor': ['#portafolio'],
 },'recursos': {'section': ['#recursos, section'],'title': ['h2'],'elements': ['.grid'],'imageUrl': ['img'],
 },'footer': {'section': ['footer, [id*="footer"]'],'title': ['footer h2, footer h3'],'logoUrl': ['footer img'],'textColor': ['footer p'],'accentColor':['footer a'],
 },
 'landing-recurso-prompts': { 'title': ['h1'], 'description': ['p.text-gray-300'], 'bottomText': ['.bg-\\[\\#0a0a0a\\] p'], 'buttonText': ['a'], 'mainImageUrl': ['img'] },
 'landing-recurso-boveda-scripts': { 'title': ['h1'], 'description': ['p.text-gray-300'], 'bottomText': ['.bg-\\[\\#0a0a0a\\] p'], 'buttonText': ['a'], 'mainImageUrl': ['img'] },
 'landing-recurso-crm': { 'title': ['h1'], 'description': ['p.text-gray-300'], 'bottomText': ['.bg-\\[\\#0a0a0a\\] p'], 'buttonText': ['a'], 'mainImageUrl': ['img'] },
};

// Para paquetes, el resaltado es más simple ya que renderizamos nuestro propio preview
const LANDING_HIGHLIGHT = {'heroTitle': ['h1'],'heroTopText': ['p.text-lg'],'planPrice': ['[class*="text-5xl"]'],'guaranteeText': ['[class*="rounded-2xl"]'],'imageUrl': ['video, img'],'videoFileUrl': ['video'],'accentColor': ['h1','[class*="bg-\\[\\#CC0000\\]"]'],
};

const LANDING_IDS = new Set(['paquete-posicionamiento-social','paquete-expansion','paquete-control-ia','paquete-elite',
]);

const LandingPaqueteDynamic = lazy(() => import('./LandingPaqueteDynamic'));

// ── Hook: inyecta CSS de resaltado en el head ─────────────────────────────────
function useHighlightInjector(nodeId, hoveredField, previewContainerId) {
 useEffect(() => {
 const styleId ='studio-highlight-css';
 let el = document.getElementById(styleId);
 if (!el) {
 el = document.createElement('style');
 el.id = styleId;
 document.head.appendChild(el);
 }

 if (!hoveredField || !nodeId) { el.textContent =''; return; }

 const isLanding = LANDING_IDS.has(nodeId);
 const map = isLanding ? LANDING_HIGHLIGHT : (HIGHLIGHT_MAP[nodeId] || {});

 // Siempre resaltar la sección completa como mínimo
 let selectors = [];
 const sectionSel = map['section'];
 if (sectionSel) selectors.push(...sectionSel.map(s => `#${previewContainerId} ${s}`));

 // Añadir selectores específicos del campo
 const fieldSel = map[hoveredField] || [];
 selectors.push(...fieldSel.map(s => `#${previewContainerId} ${s}`));

 if (selectors.length === 0) { el.textContent =''; return; }

 const unique = [...new Set(selectors)].join(',\n');
 el.textContent = `
 ${unique} {
 outline: 2.5px solid rgba(204, 0, 0, 0.9) !important;
 outline-offset: 4px !important;
 box-shadow: 0 0 0 6px rgba(204,0,0,0.08), 0 0 24px rgba(204,0,0,0.4) !important;
 border-radius: 6px !important;
 }
 `;

 return () => { if (el) el.textContent =''; };
 }, [hoveredField, nodeId, previewContainerId]);
}

// ── Componentes mapa ──────────────────────────────────────────────────────────
const COMPONENT_MAP = {
  'hero': Hero, 'servicios': Servicios, 'cultura': Cultura, 'portafolio': CasosExito, 'casos': CasosExito, 'recursos': Recursos, 'paquetes': Paquetes, 'footer': Footer,
  'servicio-bots': Bots,
  'servicio-audiovisual': ProduccionAudiovisual,
  'servicio-embudos': EmbudosDeVenta,
  'servicio-redes': GestionRedesSociales,
  'servicio-seo': OptimizacionWebSeo,
  'servicio-crm': CrmSaas,
  'paquete-posicionamiento-social': () => <LandingPaqueteDynamic previewNodeId="paquete-posicionamiento-social" />,
  'paquete-expansion': () => <LandingPaqueteDynamic previewNodeId="paquete-expansion" />,
  'paquete-control-ia': () => <LandingPaqueteDynamic previewNodeId="paquete-control-ia" />,
  'paquete-elite': () => <LandingPaqueteDynamic previewNodeId="paquete-elite" />,
  'landing-recurso-prompts': () => <RecursoPage previewRecursoId="prompts" />,
  'landing-recurso-boveda-scripts': () => <RecursoPage previewRecursoId="boveda-scripts" />,
  'landing-recurso-crm': () => <RecursoPage previewRecursoId="crm" />
};


// ── ScaledSection ─────────────────────────────────────────────────────────────
const PREVIEW_ID ='studio-preview-scaled';

function ScaledSection({ nodeId, draftData }) {
 const wrapperRef = useRef(null);
 const [scale, setScale] = useState(0.4);

 useEffect(() => {
 const calc = () => {
 if (wrapperRef.current) setScale(wrapperRef.current.clientWidth / 1440);
 };
 calc();
 const ro = new ResizeObserver(calc);
 if (wrapperRef.current) ro.observe(wrapperRef.current);
 return () => ro.disconnect();
 }, []);

 const Component = COMPONENT_MAP[nodeId];

 const inner = Component
 ? (
 <Suspense fallback={
 <div className="flex items-center justify-center h-64 gap-3 text-neutral-500">
 <div className="w-4 h-4 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
 Cargando...
 </div>
 }>
 <Component />
 </Suspense>
 )
 : (
 <div className="flex flex-col items-center justify-center h-48 gap-3 text-neutral-600 bg-[#0a0a0a]">
 <span className="text-4xl">🔒</span>
 <p className="text-sm font-medium">Sin preview disponible</p>
 <p className="text-xs">Esta sección tiene contenido estático</p>
 </div>
 );

 return (
 <div ref={wrapperRef} className="w-full h-full overflow-y-auto relative">
 {/* Overlay interacción bloqueada */}
 <div className="absolute inset-0 z-10 pointer-events-none" title="Vista previa — solo lectura" />
 <div
 id={PREVIEW_ID}
 style={{
 transform: `scale(${scale})`,
 transformOrigin:'top left',
 width: `${100 / scale}%`,
 minHeight: `${100 / scale}%`,
 pointerEvents:'none',
 userSelect:'none',
 }}
 >
 <div style={{
 background:'linear-gradient(135deg, #0a0a0a 0%, #110000 40%, #0a0a0a 100%)',
 minHeight:'100vh',
 }}>
 {inner}
 </div>
 </div>
 </div>
 );
}

// ── Exportación principal ─────────────────────────────────────────────────────
export default function StudioPreview({ nodeId, draftData, hoveredField }) {
 useHighlightInjector(nodeId, hoveredField, PREVIEW_ID);

 if (!nodeId || !draftData) {
 return (
 <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
 <span className="text-5xl">👁️</span>
 <p className="text-sm font-medium">Selecciona una sección</p>
 <p className="text-xs">La preview aparece aquí</p>
 </div>
 );
 }

 return (
 <div className="h-full flex flex-col">
 {/* Badge */}
 <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
 <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
 <span className="text-xs text-yellow-400 font-semibold">BORRADOR — Preview tiempo real</span>
 {hoveredField && (
 <span className="ml-2 text-[10px] bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/20 px-2 py-0.5 rounded-full font-bold">
 ✦ {hoveredField}
 </span>
 )}
 <span className="ml-auto text-xs text-neutral-600">Solo lectura</span>
 </div>

 {/* Preview */}
 <div className="flex-1 overflow-hidden bg-[#0a0a0a] relative">
 <PreviewErrorBoundary>
 <ScaledSection nodeId={nodeId} draftData={draftData} />
 </PreviewErrorBoundary>
 </div>
 </div>
 );
}
