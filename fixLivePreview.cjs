const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  if (!fs.existsSync(ws)) return;

  const fpath = ws + 'StudioPreview.jsx';
  if (!fs.existsSync(fpath)) return;
  
  let content = fs.readFileSync(fpath, 'utf8');

  // 1. Add lazy import
  if (!content.includes('./LandingPaqueteDynamic')) {
      content = content.replace(
          "const CrmSaas = lazy(() => import('./CrmSaas'));",
          "const CrmSaas = lazy(() => import('./CrmSaas'));\nconst LandingPaqueteDynamic = lazy(() => import('./LandingPaqueteDynamic'));"
      );
  }

  // 2. Remove function LandingCardPreview block fully
  content = content.replace(/function LandingCardPreview[\s\S]*?\}\n\}/, '');

  // 3. Update COMPONENT_MAP
  const compMapMatch = /const COMPONENT_MAP = {[\s\S]*?};/;
  const newCompMap = `const COMPONENT_MAP = {
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
  'paquete-elite': () => <LandingPaqueteDynamic previewNodeId="paquete-elite" />
};`;
  content = content.replace(compMapMatch, newCompMap);

  // 4. Update ScaledSection to remove isLanding completely!
  const scaledSectionRegex = /const isLanding = LANDING_IDS.has\(nodeId\);[\s\S]*?const Component = !isLanding \? COMPONENT_MAP\[nodeId\] : null;[\s\S]*?const inner = isLanding[\s\S]*?\? <LandingCardPreview nodeId=\{nodeId\} draftData=\{draftData\} \/>[\s\S]*?: Component[\s\S]*?\? \([\s\S]*?<Suspense fallback=\{[\s\S]*?<div className="flex items-center justify-center h-64 gap-3 text-neutral-500">[\s\S]*?<div className="w-4 h-4 border-2 border-\[#CC0000\] border-t-transparent rounded-full animate-spin" \/>[\s\S]*?Cargando\.\.\.[\s\S]*?<\/div>[\s\S]*?\}>[\s\S]*?<Component \/>[\s\S]*?<\/Suspense>[\s\S]*?\)[\s\S]*?: \([\s\S]*?<div className="flex flex-col items-center justify-center h-48 gap-3 text-neutral-600 bg-\[#0a0a0a\]">[\s\S]*?<span className="text-4xl">🔒<\/span>[\s\S]*?<p className="text-sm font-medium">Sin preview disponible<\/p>[\s\S]*?<p className="text-xs">Esta sección tiene contenido estático<\/p>[\s\S]*?<\/div>[\s\S]*?\);/g;

  content = content.replace(scaledSectionRegex, `const Component = COMPONENT_MAP[nodeId];
 const inner = Component ? (
 <Suspense fallback={
 <div className="flex items-center justify-center h-64 gap-3 text-neutral-500">
 <div className="w-4 h-4 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
 Cargando...
 </div>
 }>
 <Component />
 </Suspense>
 ) : (
 <div className="flex flex-col items-center justify-center h-48 gap-3 text-neutral-600 bg-[#0a0a0a]">
 <span className="text-4xl">🔒</span>
 <p className="text-sm font-medium">Sin preview disponible</p>
 <p className="text-xs">Esta sección tiene contenido estático</p>
 </div>
 );`);

  // 5. Delete LANDING_IDS safely
  content = content.replace(/const LANDING_IDS = new Set\(\['paquete-posicionamiento-social','paquete-expansion','paquete-control-ia','paquete-elite',\s*\]\);\n/, '');

  fs.writeFileSync(fpath, content, 'utf8');
  console.log('Fixed StudioPreview.jsx to use LandingPaqueteDynamic natively in ' + fpath);
});
