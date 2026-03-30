import logoCeoCuts from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from '../assets/Logos/Circle One Logo@2x.png';
import logoDonElote from '../assets/Logos/Don Elote Logo@2x.png';
import logoFacemaker from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from '../assets/Logos/Medhaus Logo@2x.png';
import logoNutrisa from '../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from '../assets/Logos/San Antonio Logo@2x.png';
import logoArtika from '../assets/Logos/Artika Logo@2x.png';

import bgVideoServicios from '../assets/Particulas Rojas.mp4';
import gifBot from '../assets/Gifs/Bot.gif';
import gifVideo from '../assets/Gifs/Video.gif';
import gifEmbudo from '../assets/Gifs/Embudo.gif';
import gifRedes from '../assets/Gifs/Redes Sociales.gif';
import gifSeo from '../assets/Gifs/Red Social Optimizar.gif';
import gifCrm from '../assets/Gifs/Estadistica.gif';
import whatsapp3d from '../assets/images/whatsapp_3d_icon.png';

export const PAGE_SECTIONS = [
 { id:'hero', label:'Hero', emoji:'🦖', tag:'INICIO' },
 { id:'servicios', label:'Servicios', emoji:'⚡', tag:'SERVICIOS' },
 { id:'cultura', label:'Cultura', emoji:'🏢', tag:'CULTURA' },
 { id:'portafolio', label:'Casos de Éxito', emoji:'🏆', tag:'PORTAFOLIO'},
 { id:'recursos', label:'Recursos', emoji:'📚', tag:'RECURSOS' },
 { id:'paquetes', label:'Paquetes Grid', emoji:'📦', tag:'PAQUETES' },
 { id: 'paquete-posicionamiento-social', label: 'Posicionamiento', emoji: '📣', tag: 'LANDING' },
 { id: 'paquete-expansion', label: 'Expansión', emoji: '🚀', tag: 'LANDING' },
 { id: 'paquete-control-ia', label: 'Control IA', emoji: '🤖', tag: 'LANDING' },
 { id: 'paquete-elite', label: 'Élite', emoji: '👑', tag: 'LANDING' },
 { id: 'servicio-bots', label: 'S. Bots', emoji: '🤖', tag: 'SERVICIO' },
 { id: 'servicio-audiovisual', label: 'S. Video', emoji: '🎥', tag: 'SERVICIO' },
 { id: 'servicio-embudos', label: 'S. Embudos', emoji: '🧲', tag: 'SERVICIO' },
 { id: 'servicio-redes', label: 'S. Redes', emoji: '📱', tag: 'SERVICIO' },
 { id: 'servicio-seo', label: 'S. SEO', emoji: '🔍', tag: 'SERVICIO' },
 { id: 'servicio-crm', label: 'S. CRM', emoji: '📊', tag: 'SERVICIO' },
 { id: 'landing-recurso-prompts', label: 'L. Protocolo Lázaro', emoji: '🔗', tag: 'LANDING' },
 { id: 'landing-recurso-boveda-scripts', label: 'L. Bóveda Scripts', emoji: '🔗', tag: 'LANDING' },
 { id: 'landing-recurso-crm', label: 'L. Tablero Control', emoji: '🔗', tag: 'LANDING' },
 { id: 'footer', label: 'Footer', emoji: '📌', tag: 'PIE' },
];

export function injectSectionDefaults(nodeId, draftSource) {
  const combinedData = { ...draftSource };
  // Autoinject videoUrl field for landing packages so it appears in Media automatically
  if (nodeId.startsWith('paquete-') && combinedData.videoUrl === undefined) {
  combinedData.videoUrl ='';
  }

  // Inject imageUrl field for Cultura node to allow media editing
  if (nodeId === 'cultura' && combinedData.imageUrl === undefined) {
      combinedData.imageUrl = '';
  }

  // Inject logos for Hero section so they can be modified
  if (nodeId === 'hero' && combinedData.logoUrl1 === undefined) {
    combinedData.logoUrl1 = logoCeoCuts;
    combinedData.logoUrl2 = logoCircleOne;
    combinedData.logoUrl3 = logoDonElote;
    combinedData.logoUrl4 = logoFacemaker;
    combinedData.logoUrl5 = logoGrupoMrg;
    combinedData.logoUrl6 = logoMedhaus;
    combinedData.logoUrl7 = logoNutrisa;
    combinedData.logoUrl8 = logoSanAntonio;
    combinedData.logoUrl9 = logoArtika;
    combinedData.logoUrl10 = '';
  }

  // Inject video and gifs for Servicios section so they can be modified
  if (nodeId === 'servicios') {
      if (combinedData.videoUrl === undefined) combinedData.videoUrl = bgVideoServicios;
      if (combinedData.service1IconUrl === undefined) combinedData.service1IconUrl = gifBot;
      if (combinedData.service2IconUrl === undefined) combinedData.service2IconUrl = gifVideo;
      if (combinedData.service3IconUrl === undefined) combinedData.service3IconUrl = gifEmbudo;
      if (combinedData.service4IconUrl === undefined) combinedData.service4IconUrl = gifRedes;
      if (combinedData.service5IconUrl === undefined) combinedData.service5IconUrl = gifSeo;
      if (combinedData.service6IconUrl === undefined) combinedData.service6IconUrl = gifCrm;
  }

  // Inject defaults for Portafolio / Casos de Éxito
  if (nodeId === 'portafolio') {
      if (combinedData.caso1LogoUrl === undefined) {
          combinedData.caso1LogoUrl = logoFacemaker;
          combinedData.caso1Nombre = 'Facemaker';
          combinedData.caso1Category = 'Clínica Estética';
      }
      if (combinedData.caso1Link === undefined) combinedData.caso1Link = '';

      if (combinedData.caso2LogoUrl === undefined) {
          combinedData.caso2LogoUrl = logoCircleOne;
          combinedData.caso2Nombre = 'Circle One';
          combinedData.caso2Category = 'Hotelería';
      }
      if (combinedData.caso2Link === undefined) combinedData.caso2Link = '';

      if (combinedData.caso3LogoUrl === undefined) {
          combinedData.caso3LogoUrl = logoCeoCuts;
          combinedData.caso3Nombre = 'CEO Cuts';
          combinedData.caso3Category = 'Barbería';
      }
      if (combinedData.caso3Link === undefined) combinedData.caso3Link = '';

      if (combinedData.caso4LogoUrl === undefined) {
          combinedData.caso4LogoUrl = logoMedhaus;
          combinedData.caso4Nombre = 'Medhaus';
          combinedData.caso4Category = 'Sector Médico';
      }
      if (combinedData.caso4Link === undefined) combinedData.caso4Link = '';

      if (combinedData.caso5LogoUrl === undefined) {
          combinedData.caso5LogoUrl = logoArtika;
          combinedData.caso5Nombre = 'Artika';
          combinedData.caso5Category = 'Heladerías';
      }
      if (combinedData.caso5Link === undefined) combinedData.caso5Link = '';

      if (combinedData.caso6LogoUrl === undefined) {
          combinedData.caso6LogoUrl = logoGrupoMrg;
          combinedData.caso6Nombre = 'Grupo MRG';
          combinedData.caso6Category = 'Banquetes y Eventos';
      }
      if (combinedData.caso6Link === undefined) combinedData.caso6Link = '';

      if (combinedData.caso7LogoUrl === undefined) {
          combinedData.caso7LogoUrl = logoNutrisa;
          combinedData.caso7Nombre = 'Nutrisa';
          combinedData.caso7Category = 'Sector Alimenticio';
      }
      if (combinedData.caso7Link === undefined) combinedData.caso7Link = '';

      if (combinedData.caso8LogoUrl === undefined) {
          combinedData.caso8LogoUrl = logoSanAntonio;
          combinedData.caso8Nombre = 'San Antonio';
          combinedData.caso8Category = 'Sector Médico';
      }
      if (combinedData.caso8Link === undefined) combinedData.caso8Link = '';

      if (combinedData.caso9LogoUrl === undefined) {
          combinedData.caso9LogoUrl = logoDonElote;
          combinedData.caso9Nombre = 'Don Elote';
          combinedData.caso9Category = 'Sector Alimenticio';
      }
      if (combinedData.caso9Link === undefined) combinedData.caso9Link = '';

      if (combinedData.caso10LogoUrl === undefined) {
          combinedData.caso10LogoUrl = '';
          combinedData.caso10Nombre = 'EP Lighting';
          combinedData.caso10Category = 'Iluminación / Arquitectura';
      }
      if (combinedData.caso10Link === undefined) combinedData.caso10Link = '';
  }

  // Inject defaults for Recursos
  if (nodeId === 'recursos' && combinedData.recurso1ImageUrl === undefined) {
      combinedData.recurso1Nombre = '7 prompts de IA para marketing que sí funcionan';
      combinedData.recurso1Desc = 'El contenido de calidad ya no tiene que consumir horas de tu equipo. Esta colección de 7 prompts especializados te da las herramientas exactas que necesitas para crear copy, estrategias y análisis de nivel profesional en minutos. Acelera tu producción sin sacrificar calidad.';
      combinedData.recurso1ImageUrl = 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80';

      combinedData.recurso2Nombre = 'Cómo generar leads en WhatsApp sin spam';
      combinedData.recurso2Desc = 'WhatsApp se ha consolidado como el canal de comunicación preferido en México, con más de 90 millones de usuarios activos. Esta guía te muestra cómo aprovechar esta plataforma de manera profesional y efectiva para hacer crecer tu negocio. Domina el canal de comunicación más poderoso del país.';
      combinedData.recurso2ImageUrl = whatsapp3d;

      combinedData.recurso3Nombre = 'Plantilla de CRM Personalizable';
      combinedData.recurso3Desc = 'Llevar un seguimiento de tus leads en libretas u hojas caóticas te hace perder ventas a diario. Con este CRM en Excel totalmente personalizable y fácil de usar, podrás organizar a tus prospectos de forma clara, priorizar tus seguimientos y maximizar tu porcentaje de cierre. Simplifica tu proceso de ventas hoy mismo.';
      combinedData.recurso3ImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80';
  }

  
  // Always enforce email defaults for recursos if they don't exist yet
  if (nodeId === 'recursos') {
      if (combinedData.recurso1EmailSubject === undefined) {
          combinedData.recurso1EmailSubject = "📂 Acceso a tu Bóveda de Scripts de IA";
          combinedData.recurso1EmailBody = "Hola,\n\nAquí tienes acceso a los 7 pasos estructurales que te permitán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos.\n\nDentro del documento encontrarás pautas fundamentales, tales como las reglas de oro para preservar la naturalidad en la comunicación generada por IA y la técnica de \"Doble Opción\" para incrementar considerablemente tus tasas de agendamiento.\n\nDelegar tareas repetitivas a un sistema inteligente es el paso fundamental para la verdadera escalabilidad. Si requieres que implementemos tu infraestructura técnica y tu clon digital en 48 horas, no dudes en responder a este correo.\n\nAtentamente,\nEl equipo de Godzilla Consulting";
          combinedData.recurso1FileUrl = "https://godzillaconsulting.ai/scripts.pdf";
      }
      if (combinedData.recurso2EmailSubject === undefined) {
          combinedData.recurso2EmailSubject = "📂 Tu descarga: El Protocolo Lázaro";
          combinedData.recurso2EmailBody = "Hola,\n\nTu recurso está listo. A continuación, puedes acceder a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días.\n\nComo paso inicial, te sugerimos implementar de inmediato el **Guion #4** con una lista de 20 contactos enfriados recientemente. Estos mensajes aplican una psicología de riesgo nulo que facilita retomar conversaciones de manera natural y sin fricciones.\n\nLa ejecución manual de este protocolo puede consumir tiempo valioso. Si buscas escalar tus resultados, podemos integrar un agente de Inteligencia Artificial que aplique esta estrategia de forma automatizada las 24 horas del día.\n\nMucho éxito en la recuperación de tu base de contactos.\n\nAtentamente,\nEl equipo de Godzilla Consulting";
          combinedData.recurso2FileUrl = "https://godzillaconsulting.ai/lazaro.pdf";
      }
      if (combinedData.recurso3EmailSubject === undefined) {
          combinedData.recurso3EmailSubject = "📂 Acceso inmediato: Tu Tablero de Control de Ventas";
          combinedData.recurso3EmailBody = "Hola,\n\nGracias por solicitar el Tablero de Control de Ventas. Accede inmediatamente al recurso en el siguiente enlace:\n\nEste documento ha sido estructurado para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Sugerimos prestar especial atención a la pestaña *Semáforo de Leads* para gestionar contactos de manera oportuna.\n\nTen en cuenta que este tablero te proporciona el diagnóstico y el mapa. Si requieres infraestructura tecnológica para automatizar el seguimiento y el cierre, en Godzilla Consulting nos especializamos en instalar motores de IA para acelerar tus procesos.\n\nQuedamos a tu disposición para cualquier consulta.\n\nAtentamente,\nEl equipo de Godzilla Consulting";
          combinedData.recurso3FileUrl = "https://godzillaconsulting.ai/tablero.pdf";
      }
  }

  // Inject defaults for Paquetes

  if (nodeId === 'paquetes' && combinedData.title === undefined) {
      combinedData.title = 'PAQUETES';
      combinedData.subtitle = 'Aprende más sobre la estrategia más adecuada para potenciar tu negocio. Todo esta protegido por contrato.';
      combinedData.elements = [
          {
              title: 'Posicionamiento Social',
              price: '$7,900',
              period: 'al mes',
              highlighted: false,
              guarantee: 'GARANTÍA: Si en 14 días no ves un incremento real en el engagement, el siguiente mes es GRATIS.',
              features: 'Estrategia de Contenido Omnicanal\nCopywriting de Respuesta Directa\nCommunity Management'
          },
          {
              title: 'Control IA',
              price: '$7,900',
              period: 'al mes',
              highlighted: false,
              guarantee: 'GARANTÍA: Si no está funcionando en 7 días, el siguiente mes es GRATIS.',
              features: 'Agente IA (Web + WhatsApp)\nRespuesta en menos de 5 segundos 24/7\nCaptura de datos automática'
          },
          {
              title: 'Expansión',
              price: '$29,900',
              period: 'al mes',
              highlighted: true,
              guarantee: 'GARANTÍA: Si no generamos leads en 30 días, te devolvemos tu DINERO.',
              features: 'Todo lo del Nivel Esencial\nTráfico Bilingüe (Ads Meta/Google)\nLanding Page de Alta Conversión'
          },
          {
              title: 'Élite',
              price: '$39,500',
              period: 'al mes',
              highlighted: false,
              guarantee: 'GARANTÍA: Si no aumentamos tus citas un 20% en 90 días, trabajamos GRATIS.',
              features: 'Estrategia Godfather Completa\nReactivación de Base de Datos\nConsultoría Mensual y Cierre'
          }
      ];
  }

  // Inject defaults for Servicios Landings
  if (nodeId.startsWith('servicio-') && combinedData.title === undefined) {
      combinedData.ctaText = 'Agendar cita';
      combinedData.videoUrl = ''; // Permite slot Media
      if (nodeId === 'servicio-bots') {
          combinedData.title = 'Automatización de bots';
          combinedData.subtitle = 'Creamos agentes automatizados que responden, califican y venden por ti de manera ininterrumpida.';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Cualificación de leads en tiempo real';
              combinedData.accDesc1 = 'Filtra curiosos de clientes con presupuesto real automáticamente.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'Agendamiento directo sin intervención';
              combinedData.accDesc2 = 'Sincronización total con tu calendario para llenar tu agenda de citas.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Soporte de IA multicanal';
              combinedData.accDesc3 = 'Atención en WhatsApp, Instagram y Web de forma simultánea.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Nurturing automatizado';
              combinedData.accDesc4 = 'Seguimiento inteligente a prospectos que no compraron al primer contacto.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'Integración nativa con tu CRM';
              combinedData.accDesc5 = 'Los datos de cada conversación van directo a tu base de datos.';
              combinedData.accIcon5Url = '';
          }
      }
      else if (nodeId === 'servicio-audiovisual') {
          combinedData.title = 'Producción audiovisual';
          combinedData.subtitle = 'Creamos contenido visual persuasivo diseñado específicamente para retener la atención y detonar ventas.';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Storytelling Estratégico';
              combinedData.accDesc1 = 'Guiones diseñados con el "Epiphany Bridge" para conectar emocionalmente.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'Edición de Alto Retener';
              combinedData.accDesc2 = 'Contenido optimizado para captar la atención en los primeros 3 segundos.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Estética de Cine';
              combinedData.accDesc3 = 'Calidad visual que justifica precios premium y atrae clientes de alto valor.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Video Sales Letters (VSL)';
              combinedData.accDesc4 = 'Producción enfocada 100% en la conversión de tu embudo de ventas.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'Micro-Contenido Viral';
              combinedData.accDesc5 = 'Fragmentos optimizados para Reels, TikTok y YouTube Shorts.';
              combinedData.accIcon5Url = '';
          }
      }
      else if (nodeId === 'servicio-embudos') {
          combinedData.title = 'Embudos de venta';
          combinedData.subtitle = 'Sistemas diseñados psicológicamente para guiar al usuario hasta la compra final sin fricciones.';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Arquitectura de Value Ladder';
              combinedData.accDesc1 = 'Diseño de escalones desde el imán de leads hasta tu oferta premium.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'Páginas de Aterrizaje Optimizadas';
              combinedData.accDesc2 = 'Optimizadas con principios de neuro-marketing para Alta Conversión.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Email Marketing de Seguimiento';
              combinedData.accDesc3 = 'Secuencias "Soap Opera" para nutrir y convertir.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Integración de Pasarelas de Pago';
              combinedData.accDesc4 = 'Experiencia de compra fluida y segura en un clic.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'A/B Testing Continuo';
              combinedData.accDesc5 = 'Pruebas constantes de encabezados y ofertas para maximizar tu ROI.';
              combinedData.accIcon5Url = '';
          }
      }
      else if (nodeId === 'servicio-redes') {
          combinedData.title = 'Gestión de redes sociales';
          combinedData.subtitle = 'Cambiamos tus likes por ventas con nuestro enfoque especializado.';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Estrategia de Contenido Omnicanal';
              combinedData.accDesc1 = 'Presencia donde tu "Dream 100" interactúa diariamente.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'Copywriting de Respuesta Directa';
              combinedData.accDesc2 = 'Textos que incitan a la acción, no solo al like.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Gestión de Comunidad Activa';
              combinedData.accDesc3 = 'Convertimos comentarios y DMs en oportunidades de venta reales.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Growth Hacking Orgánico';
              combinedData.accDesc4 = 'Tácticas para escalar tu alcance sin depender únicamente de pauta.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'Análisis de Sentimiento y KPIs';
              combinedData.accDesc5 = 'Reportes mensuales de crecimiento de audiencia y engagement real.';
              combinedData.accIcon5Url = '';
          }
      }
      else if (nodeId === 'servicio-seo') {
          combinedData.title = 'Optimización web y SEO';
          combinedData.subtitle = 'Google ama a los que se optimizan. Nosotros lo hacemos por ti.';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Auditoría de Palabras Clave';
              combinedData.accDesc1 = 'Identificamos los términos que generan transacciones, no solo volumen.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'SEO On-Page y Técnico';
              combinedData.accDesc2 = 'Optimización de velocidad y estructura para que Google te ame.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Estrategia de Link Building';
              combinedData.accDesc3 = 'Backlinks de calidad que elevan tu relevancia competitiva.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Marketing de Contenidos';
              combinedData.accDesc4 = 'Artículos temáticos que responden dudas y posicionan tu expertise.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'Google Business Profile';
              combinedData.accDesc5 = 'Dominio del mapa local para captar clientes cercanos y listos para comprar.';
              combinedData.accIcon5Url = '';
          }
      }
      else if (nodeId === 'servicio-crm') {
          combinedData.title = 'CRM con SaaS personalizado';
          combinedData.subtitle = 'Controla leads, clientes, citas y seguimientos desde una sola plataforma.';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Pipeline de Ventas Visual';
              combinedData.accDesc1 = 'Control total de en qué etapa se encuentra cada cliente potencial.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'Automatización de Workflows';
              combinedData.accDesc2 = 'Disparadores automáticos de correos, SMS y tareas para tu equipo.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Dashboard de Métricas Real-Time';
              combinedData.accDesc3 = 'Visualiza tu CAC, LTV y tasa de cierre al instante y sin demoras.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Centralización de Canales';
              combinedData.accDesc4 = 'Responde WhatsApp, Instagram y Correo desde una sola bandeja de entrada.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'Asignación Inteligente de Leads';
              combinedData.accDesc5 = 'Distribución automática de prospectos a tus mejores vendedores.';
              combinedData.accIcon5Url = '';
          }
      }
  }

  // Inject defaults for Landing Recursos
  if (nodeId === 'landing-recurso-prompts') {
      if (combinedData.title === undefined) combinedData.title = '7 prompts de IA para marketing que sí funcionan';
      if (combinedData.description === undefined) combinedData.description = 'Dale a tu negocio las herramientas para extraer dinero de su base de datos antigua (contactos de hace 3, 6 o 12 meses que nunca compraron).';
      if (combinedData.bottomText === undefined) combinedData.bottomText = 'Instrucciones para el Usuario: Donde veas [PARÉNTESIS EN NEGRITA], inserta lo que corresponda a tu negocio (ej. tu servicio, el problema que resuelves o tu nombre). Regla de Oro: Estos mensajes funcionan porque parecen escritos por un humano, no por un robot de marketing. No los adornes. Mantenlos cortos.';
      if (combinedData.buttonText === undefined) combinedData.buttonText = 'Download Resource';
      if (combinedData.buttonDestination === undefined) combinedData.buttonDestination = '#';
      if (combinedData.mainImageUrl === undefined) combinedData.mainImageUrl = 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80';
  }
  if (nodeId === 'landing-recurso-boveda-scripts') {
      if (combinedData.title === undefined) combinedData.title = 'Cómo generar leads en WhatsApp sin spam';
      if (combinedData.description === undefined) combinedData.description = '¿Cómo clonar a tu mejor vendedor y hacerlo trabajar 24/7 sin pagarle sueldo extra? ¡Deja de perder clientes por no contestar rápido!';
      if (combinedData.bottomText === undefined) combinedData.bottomText = 'Enseñar al dueño del negocio cómo configurar respuestas automáticas (ya sea en WhatsApp Business, Instagram DM o SMS) que conviertan preguntas en citas, incluso mientras duermen.';
      if (combinedData.buttonText === undefined) combinedData.buttonText = 'Download Resource';
      if (combinedData.buttonDestination === undefined) combinedData.buttonDestination = '#';
      if (combinedData.mainImageUrl === undefined) combinedData.mainImageUrl = whatsapp3d;
  }
  if (nodeId === 'landing-recurso-crm') {
      if (combinedData.title === undefined) combinedData.title = 'Plantilla de CRM Personalizable';
      if (combinedData.description === undefined) combinedData.description = 'Lo que no se mide, no se puede mejorar. Deja de perder dinero en servilletas y cuadernos. Organiza tus prospectos, visualiza tus ventas y toma el control de tu negocio.';
      if (combinedData.bottomText === undefined) combinedData.bottomText = 'Proporcionar una herramienta visual simple para que el dueño (o su recepcionista) deje de usar cuadernos de papel y post-its. Es la \'Digitalización Nivel 1\'.';
      if (combinedData.buttonText === undefined) combinedData.buttonText = 'Download Resource';
      if (combinedData.buttonDestination === undefined) combinedData.buttonDestination = '#';
      if (combinedData.mainImageUrl === undefined) combinedData.mainImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80';
  }

  return combinedData;
}
