import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Importaciones lazy de cada sección del sitio
const Hero            = lazy(() => import('./Hero'));
const Servicios       = lazy(() => import('./Servicios'));
const CasosExito      = lazy(() => import('./CasosExito'));
const Recursos        = lazy(() => import('./Recursos'));
const Footer          = lazy(() => import('./Footer'));
const LandingDynamic  = lazy(() => import('./LandingPaqueteDynamic'));

// ── Mapa de resaltado: nodeId → { fieldKey: cssSelector[] } ─────────────────
// Los selectores apuntan a los elementos DOM reales de cada componente.
// Se inyectan como <style id="studio-highlight"> en el head del documento.
const HIGHLIGHT_MAP = {
  'hero': {
    'title':      ['#inicio h1'],
    'subtitle':   ['#inicio p.text-lg', '#inicio p.text-xl', '#inicio p.leading-relaxed'],
    'ctaText':    ['#inicio a.bg-\\[\\#CC0000\\]', '#inicio a[class*="bg-"]'],
    'imageUrl':   ['#inicio img'],
    'videoUrl':   ['#inicio video'],
    'bgVideoUrl': ['#inicio video'],
    'accentColor':['#inicio h1', '#inicio a'],
    'bgColor':    ['#inicio'],
    'ctaColor':   ['#inicio a'],
  },
  'servicios': {
    'title':      ['#servicios h2'],
    'elements':   ['#servicios .flex.justify-between, #servicios [class*="rounded-full"]'],
    'imageUrl':   ['#servicios img'],
    'videoUrl':   ['#servicios video'],
    'accentColor':['#servicios h2', '#servicios [class*="bg-\\[\\#CC0000\\]"]'],
    'bgColor':    ['#servicios'],
  },
  'cultura': {
    'title':      ['#cultura h2'],
    'subtitle':   ['#cultura p'],
    'imageUrl':   ['#cultura img'],
    'videoUrl':   ['#cultura video'],
    'bgColor':    ['#cultura'],
    'accentColor':['#cultura h2', '#cultura [class*="bg-\\[\\#CC0000\\]"]'],
  },
  'casos': {
    'title':      ['#casos h2, #casos-exito h2'],
    'elements':   ['#casos .grid, #casos-exito .grid'],
    'imageUrl':   ['#casos img, #casos-exito img'],
    'bgColor':    ['#casos, #casos-exito'],
    'accentColor':['#casos h2, #casos-exito h2'],
  },
  'recursos': {
    'title':      ['#recursos h2'],
    'elements':   ['#recursos .grid'],
    'imageUrl':   ['#recursos img'],
    'bgColor':    ['#recursos'],
    'accentColor':['#recursos h2'],
  },
  'footer': {
    'title':      ['footer h2, footer h3'],
    'logoUrl':    ['footer img'],
    'bgColor':    ['footer'],
    'textColor':  ['footer p'],
    'accentColor':['footer a'],
  },
};

// Para paquetes, el selector del section raíz es el wrapping div
const LANDING_HIGHLIGHT = {
  'heroTitle':      ['h1'],
  'heroTopText':    ['section p.text-base, section p.text-2xl'],
  'planPrice':      ['[class*="text-5xl"], [class*="text-4xl"]'],
  'planPeriod':     ['[class*="text-xl"] [class*="text-gray"]'],
  'guaranteeText':  ['[class*="text-xs"] [class*="text-gray-100"]'],
  'imageUrl':       ['video, img'],
  'videoUrl':       ['video'],
  'accentColor':    ['h1', 'a.bg-\\[\\#CC0000\\]'],
  'bgColor':        ['div.bg-black'],
};

// ── Nodos que usan LandingPreviewWrapper ──────────────────────────────────────
const NODE_TO_SLUG = {
  'paquete-posicionamiento-social': 'posicionamiento-social',
  'paquete-expansion':             'expansion',
  'paquete-control-ia':            'control-ia',
  'paquete-elite':                 'elite',
};
const LANDING_IDS = new Set(Object.keys(NODE_TO_SLUG));

// Wrapper que inyecta el slug vía MemoryRouter para LandingPaqueteDynamic
function LandingPreviewWrapper({ nodeId }) {
  const slug = NODE_TO_SLUG[nodeId] || nodeId.replace('paquete-', '');
  return (
    <MemoryRouter initialEntries={[`/paquetes/${slug}`]}>
      <Routes>
        <Route
          path="/paquetes/:slug"
          element={
            <Suspense fallback={<div className="text-white p-8 text-center">Cargando paquete...</div>}>
              <LandingDynamic />
            </Suspense>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

// Mapa de nodeId → componente (secciones normales)
const COMPONENT_MAP = {
  'hero':      Hero,
  'servicios': Servicios,
  'casos':     CasosExito,
  'recursos':  Recursos,
  'footer':    Footer,
};

// ── Hook: inyecta CSS de resaltado cuando cambia el fieldKey hover ────────────
function useHighlightInjector(nodeId, hoveredField, previewId) {
  useEffect(() => {
    const styleId = 'studio-highlight-css';
    let existing = document.getElementById(styleId);
    if (!existing) {
      existing = document.createElement('style');
      existing.id = styleId;
      document.head.appendChild(existing);
    }

    if (!hoveredField || !nodeId) {
      existing.textContent = '';
      return;
    }

    const isLanding = LANDING_IDS.has(nodeId);
    const map = isLanding ? LANDING_HIGHLIGHT : (HIGHLIGHT_MAP[nodeId] || {});
    const selectors = map[hoveredField] || [];

    if (selectors.length === 0) {
      existing.textContent = '';
      return;
    }

    // Scope los selectores dentro del contenedor de preview
    const scoped = selectors
      .map(s => `#${previewId} ${s}`)
      .join(', ');

    existing.textContent = `
      ${scoped} {
        outline: 2px solid rgba(204, 0, 0, 0.85) !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 4px rgba(204, 0, 0, 0.15), 0 0 20px rgba(204, 0, 0, 0.3) !important;
        border-radius: 4px !important;
        transition: outline 0.15s ease, box-shadow 0.15s ease !important;
        position: relative !important;
        z-index: 1 !important;
      }
    `;

    return () => { if (existing) existing.textContent = ''; };
  }, [hoveredField, nodeId, previewId]);
}

// ── Componente de sección escalada ────────────────────────────────────────────
function ScaledSection({ nodeId, previewId }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(0.45);

  useEffect(() => {
    const calc = () => {
      if (wrapperRef.current) setScale(wrapperRef.current.clientWidth / 1440);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const isLanding = LANDING_IDS.has(nodeId);
  const Component = !isLanding ? COMPONENT_MAP[nodeId] : null;

  if (!isLanding && !Component) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm text-center p-8">
        <div>
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-medium">Preview no disponible</p>
          <p className="text-xs mt-2 text-neutral-600">Sección con contenido estático</p>
        </div>
      </div>
    );
  }

  const content = isLanding
    ? <LandingPreviewWrapper nodeId={nodeId} />
    : (
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 text-neutral-500 gap-3">
          <div className="w-4 h-4 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
          Cargando...
        </div>
      }>
        <Component />
      </Suspense>
    );

  return (
    <div ref={wrapperRef} className="w-full h-full overflow-hidden relative">
      {/* Overlay bloqueador de interacciones */}
      <div className="absolute inset-0 z-10 cursor-not-allowed" title="Vista previa — solo lectura" />
      <div
        id={previewId}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${100 / scale}%`,
          minHeight: `${100 / scale}%`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* Fondo oscuro que simula el App (ColorBends) */}
        <div style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #110000 40%, #0a0a0a 100%)', minHeight: '100vh' }}>
          {content}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal exportado ────────────────────────────────────────────
const PREVIEW_ID = 'studio-preview-scaled';

export default function StudioPreview({ nodeId, draftData, hoveredField }) {
  // Inyectar CSS de resaltado cuando cambia el campo hover
  useHighlightInjector(nodeId, hoveredField, PREVIEW_ID);

  if (!nodeId || !draftData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-3">
        <span className="text-4xl">👁️</span>
        <p className="text-sm">Selecciona una sección para ver la preview</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Badge de estado */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-xs text-yellow-400 font-semibold">BORRADOR — Preview tiempo real</span>
        {hoveredField && (
          <span className="ml-2 text-[10px] text-[#CC0000] bg-[#CC0000]/10 border border-[#CC0000]/20 px-2 py-0.5 rounded-full font-bold">
            ✦ Resaltando: {hoveredField}
          </span>
        )}
        <span className="ml-auto text-xs text-neutral-600">Solo lectura</span>
      </div>

      {/* Preview escalada */}
      <div className="flex-1 overflow-hidden bg-[#0a0a0a] relative">
        <ScaledSection nodeId={nodeId} previewId={PREVIEW_ID} />
      </div>
    </div>
  );
}
