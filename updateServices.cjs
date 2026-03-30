const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

const servicesData = {
    'ProduccionAudiovisual.jsx': {
        id: 'servicio-audiovisual',
        name: 'Producción audiovisual',
        icons: "import { Play, Pause, Volume2, VolumeX, ArrowRight, Video, Scissors, Star, PlayCircle, Smartphone, ChevronDown } from 'lucide-react';",
        accordionItems: [
            "    const accordionItems = [",
            "        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt=\"1\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Video size={20} className=\"shrink-0\" />, title: content.accTitle1 || \"Storytelling Estratégico\", desc: content.accDesc1 || \"Guiones diseñados con el \\\"Epiphany Bridge\\\" para conectar emocionalmente.\" },",
            "        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt=\"2\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Scissors size={20} className=\"shrink-0\" />, title: content.accTitle2 || \"Edición de Alto Retener\", desc: content.accDesc2 || \"Contenido optimizado para captar la atención en los primeros 3 segundos.\" },",
            "        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt=\"3\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Star size={20} className=\"shrink-0\" />, title: content.accTitle3 || \"Estética de Cine\", desc: content.accDesc3 || \"Calidad visual que justifica precios premium y atrae clientes de alto valor.\" },",
            "        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt=\"4\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <PlayCircle size={20} className=\"shrink-0\" />, title: content.accTitle4 || \"Video Sales Letters (VSL)\", desc: content.accDesc4 || \"Producción enfocada 100% en la conversión de tu embudo de ventas.\" },",
            "        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt=\"5\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Smartphone size={20} className=\"shrink-0\" />, title: content.accTitle5 || \"Micro-Contenido Viral\", desc: content.accDesc5 || \"Fragmentos optimizados para Reels, TikTok y YouTube Shorts.\" }",
            "    ];"
        ].join('\n'),
        def1: ['Storytelling Estratégico', 'Guiones diseñados con el "Epiphany Bridge" para conectar emocionalmente.'],
        def2: ['Edición de Alto Retener', 'Contenido optimizado para captar la atención en los primeros 3 segundos.'],
        def3: ['Estética de Cine', 'Calidad visual que justifica precios premium y atrae clientes de alto valor.'],
        def4: ['Video Sales Letters (VSL)', 'Producción enfocada 100% en la conversión de tu embudo de ventas.'],
        def5: ['Micro-Contenido Viral', 'Fragmentos optimizados para Reels, TikTok y YouTube Shorts.']
    },
    'GestionRedesSociales.jsx': {
        id: 'servicio-redes',
        name: 'Gestión de redes sociales',
        icons: "import { Play, Pause, Volume2, VolumeX, ArrowRight, Share2, PenTool, MessageCircle, TrendingUp, BarChart2, ChevronDown } from 'lucide-react';",
        accordionItems: [
            "    const accordionItems = [",
            "        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt=\"1\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Share2 size={20} className=\"shrink-0\" />, title: content.accTitle1 || \"Estrategia de Contenido Omnicanal\", desc: content.accDesc1 || \"Presencia donde tu \\\"Dream 100\\\" interactúa diariamente.\" },",
            "        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt=\"2\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <PenTool size={20} className=\"shrink-0\" />, title: content.accTitle2 || \"Copywriting de Respuesta Directa\", desc: content.accDesc2 || \"Textos que incitan a la acción, no solo al like.\" },",
            "        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt=\"3\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <MessageCircle size={20} className=\"shrink-0\" />, title: content.accTitle3 || \"Gestión de Comunidad Activa\", desc: content.accDesc3 || \"Convertimos comentarios y DMs en oportunidades de venta reales.\" },",
            "        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt=\"4\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <TrendingUp size={20} className=\"shrink-0\" />, title: content.accTitle4 || \"Growth Hacking Orgánico\", desc: content.accDesc4 || \"Tácticas para escalar tu alcance sin depender únicamente de pauta.\" },",
            "        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt=\"5\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <BarChart2 size={20} className=\"shrink-0\" />, title: content.accTitle5 || \"Análisis de Sentimiento y KPIs\", desc: content.accDesc5 || \"Reportes mensuales de crecimiento de audiencia y engagement real.\" }",
            "    ];"
        ].join('\n'),
        def1: ['Estrategia de Contenido Omnicanal', 'Presencia donde tu "Dream 100" interactúa diariamente.'],
        def2: ['Copywriting de Respuesta Directa', 'Textos que incitan a la acción, no solo al like.'],
        def3: ['Gestión de Comunidad Activa', 'Convertimos comentarios y DMs en oportunidades de venta reales.'],
        def4: ['Growth Hacking Orgánico', 'Tácticas para escalar tu alcance sin depender únicamente de pauta.'],
        def5: ['Análisis de Sentimiento y KPIs', 'Reportes mensuales de crecimiento de audiencia y engagement real.']
    },
    'EmbudosDeVenta.jsx': {
        id: 'servicio-embudos',
        name: 'Embudos de venta',
        icons: "import { Play, Pause, Volume2, VolumeX, ArrowRight, Layers, LayoutTemplate, Mail, CreditCard, SplitSquareHorizontal, ChevronDown } from 'lucide-react';",
        accordionItems: [
            "    const accordionItems = [",
            "        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt=\"1\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Layers size={20} className=\"shrink-0\" />, title: content.accTitle1 || \"Arquitectura de Value Ladder\", desc: content.accDesc1 || \"Diseño de escalones desde el imán de leads hasta tu oferta premium.\" },",
            "        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt=\"2\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <LayoutTemplate size={20} className=\"shrink-0\" />, title: content.accTitle2 || \"Páginas de Aterrizaje Optimizadas\", desc: content.accDesc2 || \"Optimizadas con principios de neuro-marketing para Alta Conversión.\" },",
            "        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt=\"3\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Mail size={20} className=\"shrink-0\" />, title: content.accTitle3 || \"Email Marketing de Seguimiento\", desc: content.accDesc3 || \"Secuencias \\\"Soap Opera\\\" para nutrir y convertir.\" },",
            "        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt=\"4\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <CreditCard size={20} className=\"shrink-0\" />, title: content.accTitle4 || \"Integración de Pasarelas de Pago\", desc: content.accDesc4 || \"Experiencia de compra fluida y segura en un clic.\" },",
            "        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt=\"5\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <SplitSquareHorizontal size={20} className=\"shrink-0\" />, title: content.accTitle5 || \"A/B Testing Continuo\", desc: content.accDesc5 || \"Pruebas constantes de encabezados y ofertas para maximizar tu ROI.\" }",
            "    ];"
        ].join('\n'),
        def1: ['Arquitectura de Value Ladder', 'Diseño de escalones desde el imán de leads hasta tu oferta premium.'],
        def2: ['Páginas de Aterrizaje Optimizadas', 'Optimizadas con principios de neuro-marketing para Alta Conversión.'],
        def3: ['Email Marketing de Seguimiento', 'Secuencias "Soap Opera" para nutrir y convertir.'],
        def4: ['Integración de Pasarelas de Pago', 'Experiencia de compra fluida y segura en un clic.'],
        def5: ['A/B Testing Continuo', 'Pruebas constantes de encabezados y ofertas para maximizar tu ROI.']
    },
    'OptimizacionWebSeo.jsx': {
        id: 'servicio-seo',
        name: 'Optimización web y SEO',
        icons: "import { Play, Pause, Volume2, VolumeX, ArrowRight, Search, Code, Link as LinkIcon, FileText, MapPin, ChevronDown } from 'lucide-react';",
        accordionItems: [
            "    const accordionItems = [",
            "        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt=\"1\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Search size={20} className=\"shrink-0\" />, title: content.accTitle1 || \"Auditoría de Palabras Clave\", desc: content.accDesc1 || \"Identificamos los términos que generan transacciones, no solo volumen.\" },",
            "        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt=\"2\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Code size={20} className=\"shrink-0\" />, title: content.accTitle2 || \"SEO On-Page y Técnico\", desc: content.accDesc2 || \"Optimización de velocidad y estructura para que Google te ame.\" },",
            "        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt=\"3\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <LinkIcon size={20} className=\"shrink-0\" />, title: content.accTitle3 || \"Estrategia de Link Building\", desc: content.accDesc3 || \"Backlinks de calidad que elevan tu relevancia competitiva.\" },",
            "        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt=\"4\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <FileText size={20} className=\"shrink-0\" />, title: content.accTitle4 || \"Marketing de Contenidos\", desc: content.accDesc4 || \"Artículos temáticos que responden dudas y posicionan tu expertise.\" },",
            "        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt=\"5\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <MapPin size={20} className=\"shrink-0\" />, title: content.accTitle5 || \"Google Business Profile\", desc: content.accDesc5 || \"Dominio del mapa local para captar clientes cercanos y listos para comprar.\" }",
            "    ];"
        ].join('\n'),
        def1: ['Auditoría de Palabras Clave', 'Identificamos los términos que generan transacciones, no solo volumen.'],
        def2: ['SEO On-Page y Técnico', 'Optimización de velocidad y estructura para que Google te ame.'],
        def3: ['Estrategia de Link Building', 'Backlinks de calidad que elevan tu relevancia competitiva.'],
        def4: ['Marketing de Contenidos', 'Artículos temáticos que responden dudas y posicionan tu expertise.'],
        def5: ['Google Business Profile', 'Dominio del mapa local para captar clientes cercanos y listos para comprar.']
    },
    'CrmSaas.jsx': {
        id: 'servicio-crm',
        name: 'CRM con SaaS personalizado',
        icons: "import { Play, Pause, Volume2, VolumeX, ArrowRight, Kanban, Zap, PieChart, Inbox, UserPlus, ChevronDown } from 'lucide-react';",
        accordionItems: [
            "    const accordionItems = [",
            "        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt=\"1\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Kanban size={20} className=\"shrink-0\" />, title: content.accTitle1 || \"Pipeline de Ventas Visual\", desc: content.accDesc1 || \"Control total de en qué etapa se encuentra cada cliente potencial.\" },",
            "        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt=\"2\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Zap size={20} className=\"shrink-0\" />, title: content.accTitle2 || \"Automatización de Workflows\", desc: content.accDesc2 || \"Disparadores automáticos de correos, SMS y tareas para tu equipo.\" },",
            "        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt=\"3\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <PieChart size={20} className=\"shrink-0\" />, title: content.accTitle3 || \"Dashboard de Métricas Real-Time\", desc: content.accDesc3 || \"Visualiza tu CAC, LTV y tasa de cierre al instante y sin demoras.\" },",
            "        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt=\"4\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Inbox size={20} className=\"shrink-0\" />, title: content.accTitle4 || \"Centralización de Canales\", desc: content.accDesc4 || \"Responde WhatsApp, Instagram y Correo desde una sola bandeja de entrada.\" },",
            "        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt=\"5\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <UserPlus size={20} className=\"shrink-0\" />, title: content.accTitle5 || \"Asignación Inteligente de Leads\", desc: content.accDesc5 || \"Distribución automática de prospectos a tus mejores vendedores.\" }",
            "    ];"
        ].join('\n'),
        def1: ['Pipeline de Ventas Visual', 'Control total de en qué etapa se encuentra cada cliente potencial.'],
        def2: ['Automatización de Workflows', 'Disparadores automáticos de correos, SMS y tareas para tu equipo.'],
        def3: ['Dashboard de Métricas Real-Time', 'Visualiza tu CAC, LTV y tasa de cierre al instante y sin demoras.'],
        def4: ['Centralización de Canales', 'Responde WhatsApp, Instagram y Correo desde una sola bandeja de entrada.'],
        def5: ['Asignación Inteligente de Leads', 'Distribución automática de prospectos a tus mejores vendedores.']
    }
};

const accordionUI = [
    '                            {/* SUBTITLE REPLACED BY ACCORDION */}',
    '                            <p className="text-white text-lg md:text-xl mb-6 leading-relaxed font-medium hidden">',
    '                                {content.subtitle}',
    '                            </p>',
    '                            ',
    '                            <div className="w-full text-left bg-black/20 rounded-2xl p-3 md:p-5 mb-8 space-y-1 md:space-y-2 border border-white/10 shadow-lg relative z-20">',
    '                                {accordionItems.map((item, index) => {',
    '                                    const isOpen = openAccordion === index;',
    '                                    return (',
    '                                        <div key={index} className="border-b border-white/10 last:border-0 pb-1.5 pt-1.5 first:pt-0 last:pb-0">',
    '                                            <button',
    '                                                onClick={() => setOpenAccordion(isOpen ? -1 : index)}',
    '                                                className="w-full flex items-center justify-between py-2 text-white hover:text-white/80 transition-colors gap-3"',
    '                                            >',
    '                                                <div className="flex items-center gap-3 font-bold text-sm md:text-base leading-tight">',
    '                                                    <span className="text-[#FACC15] shrink-0">{item.icon}</span>',
    '                                                    <span className="text-left">{item.title}</span>',
    '                                                </div>',
    '                                                <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#FACC15]" : "text-gray-400"}`} />',
    '                                            </button>',
    '                                            <div',
    '                                                className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"}`}',
    '                                            >',
    '                                                <p className="text-gray-200 text-xs md:text-sm leading-relaxed pl-8 pb-3 text-left">',
    '                                                    {item.desc}',
    '                                                </p>',
    '                                            </div>',
    '                                        </div>',
    '                                    )',
    '                                })}',
    '                            </div>'
].join('\n');


workspaces.forEach(ws => {
  if (!fs.existsSync(ws)) return;

  Object.entries(servicesData).forEach(([file, data]) => {
      let fpath = ws + file;
      if (!fs.existsSync(fpath)) return;
      let content = fs.readFileSync(fpath, 'utf8');

      // Skip if already has accordion
      if (content.includes('accordionItems')) {
          console.log('Skipping ' + file + ' as it already has accordion logic.');
      } else {
          // 1. Convert padding & width
          content = content.replace(
              'className="w-full md:w-1/3 bg-[#CC0000] flex flex-col justify-center items-center py-16 md:py-0 px-8 lg:px-12"',
              'className="w-full md:w-1/3 bg-[#CC0000] flex flex-col justify-center items-center py-16 md:py-24 px-8 lg:px-12"'
          );
          content = content.replace(
              'className="max-w-xs flex flex-col items-center text-center"',
              'className="w-full max-w-sm flex flex-col items-center text-center"'
          );

          // 2. Map Imports
          content = content.replace(
              "import { Play, Pause, Volume2, VolumeX, ArrowRight } from 'lucide-react';",
              data.icons
          );

          // 3. Map useState and Accordion Items
          const oldState = '    const [content, setContent] = useState(defaultContent);';
          const newState = oldState + '\n    const [openAccordion, setOpenAccordion] = useState(0);\n\n' + data.accordionItems;
          content = content.replace(oldState, newState);

          // 4. Map the UI component replacement
          const oldUI = '                            <p className="text-white text-lg md:text-xl mb-10 leading-relaxed font-medium">\n                                {content.subtitle}\n                            </p>';
          content = content.replace(oldUI, accordionUI);

          fs.writeFileSync(fpath, content, 'utf8');
          console.log('Modified ' + file);
      }
  });

  // AdminStudio Updates
  let adminPath = ws + 'AdminStudio.jsx';
  if (fs.existsSync(adminPath)) {
      let adminContent = fs.readFileSync(adminPath, 'utf8');
      
      Object.entries(servicesData).forEach(([file, data]) => {
          let searchStr = "else if (node.id === '" + data.id + "') combinedData.title = '" + data.name + "';";
          
          let replacementLines = [
              "else if (node.id === '" + data.id + "') {",
              "          combinedData.title = '" + data.name + "';",
              "          if(combinedData.accTitle1 === undefined) {",
              "              combinedData.accTitle1 = '" + data.def1[0] + "';",
              "              combinedData.accDesc1 = '" + data.def1[1] + "';",
              "              combinedData.accIcon1Url = '';",
              "",
              "              combinedData.accTitle2 = '" + data.def2[0] + "';",
              "              combinedData.accDesc2 = '" + data.def2[1] + "';",
              "              combinedData.accIcon2Url = '';",
              "",
              "              combinedData.accTitle3 = '" + data.def3[0] + "';",
              "              combinedData.accDesc3 = '" + data.def3[1] + "';",
              "              combinedData.accIcon3Url = '';",
              "",
              "              combinedData.accTitle4 = '" + data.def4[0] + "';",
              "              combinedData.accDesc4 = '" + data.def4[1] + "';",
              "              combinedData.accIcon4Url = '';",
              "",
              "              combinedData.accTitle5 = '" + data.def5[0] + "';",
              "              combinedData.accDesc5 = '" + data.def5[1] + "';",
              "              combinedData.accIcon5Url = '';",
              "          }",
              "      }"
          ].join('\n');
          
          adminContent = adminContent.replace(searchStr, replacementLines);
      });
      fs.writeFileSync(adminPath, adminContent, 'utf8');
  }
});
console.log('Successfully injected accordion functionality for the remaining 5 services!');
