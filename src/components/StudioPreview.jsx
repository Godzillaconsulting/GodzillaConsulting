import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';

// Importaciones lazy de cada sección del sitio
const Hero            = lazy(() => import('./Hero'));
const Servicios       = lazy(() => import('./Servicios'));
const CasosExito      = lazy(() => import('./CasosExito'));
const Recursos        = lazy(() => import('./Recursos'));
const Footer          = lazy(() => import('./Footer'));
const LandingDynamic  = lazy(() => import('./LandingPaqueteDynamic'));

// Secciones que no dependen de SiteContext (estáticas)
const STATIC_SECTIONS = ['cultura'];

// Mapa de nodeId → componente a renderizar
const COMPONENT_MAP = {
  'hero':                          Hero,
  'servicios':                     Servicios,
  'casos':                         CasosExito,
  'recursos':                      Recursos,
  'footer':                        Footer,
  'paquete-posicionamiento-social': LandingDynamic,
  'paquete-expansion':             LandingDynamic,
  'paquete-control-ia':            LandingDynamic,
  'paquete-elite':                 LandingDynamic,
};

// Props adicionales que algunos componentes necesitan
const EXTRA_PROPS = {
  'paquete-posicionamiento-social': { nodeId: 'paquete-posicionamiento-social' },
  'paquete-expansion':             { nodeId: 'paquete-expansion' },
  'paquete-control-ia':            { nodeId: 'paquete-control-ia' },
  'paquete-elite':                 { nodeId: 'paquete-elite' },
};

function ScaledSection({ nodeId }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(0.45);

  useEffect(() => {
    const calculateScale = () => {
      if (wrapperRef.current) {
        const w = wrapperRef.current.clientWidth;
        setScale(w / 1440); // 1440px = ancho de diseño del sitio
      }
    };
    calculateScale();
    const ro = new ResizeObserver(calculateScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const Component = COMPONENT_MAP[nodeId];
  const extraProps = EXTRA_PROPS[nodeId] || {};

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm text-center p-8">
        <div>
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-medium">Preview no disponible para esta sección</p>
          <p className="text-xs mt-2 text-neutral-600">Esta sección tiene contenido estático</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full h-full overflow-hidden relative">
      {/* Overlay que bloquea interacciones en la preview */}
      <div className="absolute inset-0 z-10 cursor-not-allowed" title="Vista previa — no interactiva" />
      
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${100 / scale}%`,
          // Altura ajustada para que quepa en el panel
          minHeight: `${100 / scale}%`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-64 text-neutral-500 gap-3">
            <div className="w-4 h-4 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
            Cargando preview...
          </div>
        }>
          <Component {...extraProps} />
        </Suspense>
      </div>
    </div>
  );
}

export default function StudioPreview({ nodeId, draftData }) {
  if (!nodeId || !draftData) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
        <p>Selecciona una sección para ver la preview</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Badge de estado */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-xs text-yellow-400 font-semibold">BORRADOR — Preview en tiempo real</span>
        <span className="ml-auto text-xs text-neutral-600">Los cambios se ven aquí antes de guardar</span>
      </div>

      {/* Área de preview escalada */}
      <div className="flex-1 overflow-hidden bg-white relative">
        <ScaledSection nodeId={nodeId} />
      </div>
    </div>
  );
}
