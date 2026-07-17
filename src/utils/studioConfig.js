import logoCeoCuts from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from '../assets/Logos/Circle One Logo@2x.png';
import logoDonElote from '../assets/Logos/Don Elote Logo@2x.png';
import logoFacemaker from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from '../assets/Logos/Medhaus Logo@2x.png';
import logoNutrisa from '../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from '../assets/Logos/San Antonio Logo@2x.png';
import logoArtika from '../assets/Logos/Artika Logo@2x.png';

const bgVideoServicios = 'https://bot.godzillaconsulting.ai/api/media/assets/Particulas Rojas.mp4';
const bgVideoCultura = 'https://bot.godzillaconsulting.ai/api/media/assets/Particulas Rojas.mp4';
const gifBot = 'https://bot.godzillaconsulting.ai/api/media/assets/Bot.gif';
const gifVideo = 'https://bot.godzillaconsulting.ai/api/media/assets/Video.gif';
const gifEmbudo = 'https://bot.godzillaconsulting.ai/api/media/assets/Embudo.gif';
const gifRedes = 'https://bot.godzillaconsulting.ai/api/media/assets/Redes Sociales.gif';
const gifSeo = 'https://bot.godzillaconsulting.ai/api/media/assets/Red Social Optimizar.gif';
const gifCrm = 'https://bot.godzillaconsulting.ai/api/media/assets/Estadistica.gif';
import whatsapp3d from '../assets/images/whatsapp_3d_icon.png';

export const PAGE_SECTIONS = [
 { id:'hero', label:'Encabezado principal (Hero)', emoji:'🦖', tag:'INICIO' },
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
  if (nodeId.startsWith('paquete-')) {
     if (combinedData.videoUrl === undefined) combinedData.videoUrl = '';
     if (combinedData.videoFileUrl === undefined) combinedData.videoFileUrl = '';
  }


  // Inject logos and text fields for Hero section so they can be modified
  if (nodeId === 'hero') {
    if (combinedData.title === undefined) combinedData.title = "DETÉN LA FUGA DE LEADS Y ESCALA TU FACTURACIÓN CON INTELIGENCIA ARTIFICIAL.";
    if (combinedData.subtitle === undefined) combinedData.subtitle = 'El único sistema de marketing que instala un "Recepcionista Digital" 24/7, reactiva tu base de datos y te garantiza resultados por contrato. Si no cumplimos, no pagas.';
    if (combinedData.ctaText === undefined) combinedData.ctaText = "Ver planes y garantías";

    if (combinedData.logoUrl1 === undefined) combinedData.logoUrl1 = logoCeoCuts;
    if (combinedData.logoUrl2 === undefined) combinedData.logoUrl2 = logoCircleOne;
    if (combinedData.logoUrl3 === undefined) combinedData.logoUrl3 = logoDonElote;
    if (combinedData.logoUrl4 === undefined) combinedData.logoUrl4 = logoFacemaker;
    if (combinedData.logoUrl5 === undefined) combinedData.logoUrl5 = logoGrupoMrg;
    if (combinedData.logoUrl6 === undefined) combinedData.logoUrl6 = logoMedhaus;
    if (combinedData.logoUrl7 === undefined) combinedData.logoUrl7 = logoNutrisa;
    if (combinedData.logoUrl8 === undefined) combinedData.logoUrl8 = logoSanAntonio;
    if (combinedData.logoUrl9 === undefined) combinedData.logoUrl9 = logoArtika;
    if (combinedData.logoUrl10 === undefined) combinedData.logoUrl10 = '';
  }

  // Inject video and gifs for Servicios section so they can be modified
  if (nodeId === 'servicios') {
      if (combinedData.videoUrl === undefined) combinedData.videoUrl = bgVideoServicios;
      
      if (combinedData.service1IconUrl === undefined) combinedData.service1IconUrl = gifBot;
      if (combinedData.service1Title === undefined) combinedData.service1Title = 'Automatización de Bots';
      if (combinedData.service1Desc === undefined) combinedData.service1Desc = 'Automatiza tu atención al cliente 24/7 con bots entrenados en tu negocio, que responden dudas, califican prospectos y los llevan directo a la cita o a la venta. Integrados con WhatsApp, redes sociales y tu CRM.';

      if (combinedData.service2IconUrl === undefined) combinedData.service2IconUrl = gifVideo;
      if (combinedData.service2Title === undefined) combinedData.service2Title = 'Producción audiovisual';
      if (combinedData.service2Desc === undefined) combinedData.service2Desc = 'Creamos contenido audiovisual estratégico que genera confianza, autoridad, fortalece tu marca, comunica tu propuesta de valor y potencia la conversión en campañas y redes sociales.';

      if (combinedData.service3IconUrl === undefined) combinedData.service3IconUrl = gifEmbudo;
      if (combinedData.service3Title === undefined) combinedData.service3Title = 'Embudos de venta';
      if (combinedData.service3Desc === undefined) combinedData.service3Desc = 'Estructuramos embudos digitales orientados a resultados que convierten tráfico en citas y oportunidades comerciales medibles.';

      if (combinedData.service4IconUrl === undefined) combinedData.service4IconUrl = gifRedes;
      if (combinedData.service4Title === undefined) combinedData.service4Title = 'Gestión de redes sociales';
      if (combinedData.service4Desc === undefined) combinedData.service4Desc = 'Administramos la presencia digital de tu marca con una estrategia de contenido profesional, enfocada en posicionamiento, reputación y generación de prospectos.';

      if (combinedData.service5IconUrl === undefined) combinedData.service5IconUrl = gifSeo;
      if (combinedData.service5Title === undefined) combinedData.service5Title = 'Optimización web y SEO';
      if (combinedData.service5Desc === undefined) combinedData.service5Desc = 'Optimizamos tu sitio web y su estructura SEO para mejorar visibilidad en buscadores, experiencia de usuario y generación de leads calificados.';

      if (combinedData.service6IconUrl === undefined) combinedData.service6IconUrl = gifCrm;
      if (combinedData.service6Title === undefined) combinedData.service6Title = 'CRM con SAAS personalizado';
      if (combinedData.service6Desc === undefined) combinedData.service6Desc = 'Implementamos plataformas CRM y soluciones SaaS a la medida para centralizar contactos, automatizar seguimientos y facilitar la gestión comercial de tu equipo.';
  }

  // Inject bgVideoUrl and TEXT FIELDS for Cultura so they appear in Admin Studio
  if (nodeId === 'cultura') {
      if (combinedData.bgVideoUrl === undefined) combinedData.bgVideoUrl = bgVideoCultura;
      if (combinedData.overline === undefined) combinedData.overline = 'NUESTRA';
      if (combinedData.title === undefined) combinedData.title = 'CULTURA';
      if (combinedData.description === undefined) combinedData.description = 'Somos una agencia de marketing digital ubicada en Ciudad Juárez, Chihuahua.\n\nHemos trabajado con médicos, clínicas estéticas, abogados, hoteles, restaurantes y más.\n\nDiseñamos campañas y sistemas que priorizan ventas y rentabilidad.';
      if (combinedData.missionText === undefined) combinedData.missionText = 'Ayudar a empresas mexicanas a crecer usando tecnología y estrategias digitales. Creemos que todos los negocios merecen las herramientas para competir y prosperar en el mundo actual.';
      if (combinedData.visionText === undefined) combinedData.visionText = 'Multiplicar el 15% de negocios digitalizados en México y elevar ese 4% de éxito, convirtiéndonos en el motor del crecimiento digital del país.';
  }

  // Inject defaults for Portafolio / Casos de Éxito
  if (nodeId === 'portafolio') {
      const isPopulated = Object.keys(combinedData).some(k => k.startsWith('caso'));
      if (!isPopulated) {
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
  }

  // Inject defaults for Recursos
  if (nodeId === 'recursos' && combinedData.recurso1ImageUrl === undefined) {
      combinedData.recurso1Nombre = 'La bóveda de scripts de IA';
      combinedData.recurso1Desc = 'Acceso a los 7 pasos estructurales que te permitirán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos. Incluye pautas fundamentales y la técnica de "Doble Opción" para incrementar considerablemente tus tasas de agendamiento sin perder la naturalidad humana.';
      combinedData.recurso1ImageUrl = gifBot;

      combinedData.recurso2Nombre = 'El Protocolo Lázaro (resurrección de leads)';
      combinedData.recurso2Desc = 'Accede a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días. Aplica una psicología defensiva de riesgo nulo que facilita retomar conversaciones atrapadas en el limbo de manera natural y sin fricciones.';
      combinedData.recurso2ImageUrl = gifEmbudo;

      combinedData.recurso3Nombre = 'El Tablero de control de ventas';
      combinedData.recurso3Desc = 'Este documento ha sido estructurado meticulosamente para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Incluye herramientas como el Semáforo de Leads para gestionar contactos oportunos antes de que se enfríen.';
      combinedData.recurso3ImageUrl = gifCrm;
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

  if (nodeId === 'paquetes') {
      if (combinedData.title === undefined) combinedData.title = 'PAQUETES';
      if (combinedData.subtitle === undefined) combinedData.subtitle = 'Aprende más sobre la estrategia más adecuada para potenciar tu negocio. Todo esta protegido por contrato.';
      
      if (!combinedData.elements || combinedData.elements.length === 0) {
          combinedData.elements = [
              {
                  title: 'Posicionamiento Social',
                  price: '$7,900',
                  period: 'al mes',
                  highlighted: false,
                  buttonText: 'Ver Garantía',
                  guarantee: 'GARANTÍA: Si en 14 días no ves un incremento real en el engagement, el siguiente mes es GRATIS.',
                  features: 'Estrategia de Contenido Omnicanal\nCopywriting de Respuesta Directa\nCommunity Management'
              },
              {
                  title: 'Control IA',
                  price: '$7,900',
                  period: 'al mes',
                  highlighted: false,
                  buttonText: 'Ver Garantía',
                  guarantee: 'GARANTÍA: Si no está funcionando en 7 días, el siguiente mes es GRATIS.',
                  features: 'Agente IA (Web + WhatsApp)\nRespuesta en menos de 5 segundos 24/7\nCaptura de datos automática'
              },
              {
                  title: 'Expansión',
                  price: '$29,900',
                  period: 'al mes',
                  highlighted: true,
                  buttonText: 'Ver Garantía',
                  guarantee: 'GARANTÍA: Si no generamos leads en 30 días, te devolvemos tu DINERO.',
                  features: 'Todo lo del Nivel Esencial\nTráfico Bilingüe (Ads Meta/Google)\nLanding Page de Alta Conversión'
              },
              {
                  title: 'Élite',
                  price: '$39,500',
                  period: 'al mes',
                  highlighted: false,
                  buttonText: 'Ver Garantía',
                  guarantee: 'GARANTÍA: Si no aumentamos tus citas un 20% en 90 días, trabajamos GRATIS.',
                  features: 'Estrategia Godfather Completa\nReactivación de Base de Datos\nConsultoría Mensual y Cierre'
              }
          ];
      }
      if (Array.isArray(combinedData.elements)) {
          combinedData.elements = combinedData.elements.map(el => ({
              ...el,
              buttonText: el.buttonText || 'Ver Garantía'
          }));
      }
  }

  // Inject defaults for Landings Paquetes
  if (nodeId === 'paquete-expansion') {
      if (combinedData.heroTitle === undefined) {
          combinedData.heroTopText = 'Organiza un sistema que capture, atienda y organice a tus prospectos sin que tú muevas un dedo';
          combinedData.heroTitle = 'NIVEL\nEXPANSIÓN';
          combinedData.heroDisclaimer = 'Si en <span className="font-bold text-[#CC0000] not-italic">30 días hábiles</span>, no generamos ningún lead, te devolvemos el <span className="font-bold text-[#CC0000] not-italic">100%</span> de tu dinero.';
          combinedData.cardTitle = 'NIVEL EXPANSIÓN';
          combinedData.planTarget = 'Ideal para el que ya tiene experiencia, pero teme tirar el dinero a la basura.';
          combinedData.planPrice = '$29,500';
          combinedData.planPeriod = 'al mes';
          combinedData.planFeaturesExtended = [
              { title: 'Todo lo que incluye Posicionamiento Social', desc: '• Agente IA (Web + WhatsApp)\n• Respuestas en menos de 5 segundos 24/7\n• Captura de datos automática' },
              { title: 'Tráfico Bilingüe (Ads Meta/Google)', desc: '' },
              { title: 'Landing page de alta conversión', desc: '' }
          ];
          combinedData.guaranteeTitle = 'GARANTÍA DE SATISFACCIÓN';
          combinedData.guaranteeBadge = 'Resultados garantizados 100%';
          combinedData.guaranteeText = 'Estamos tan seguros de nuestros resultados que ofrecemos una garantía total.\n\nSi no cumplimos con los entregables pactados en el tiempo establecido, te devolvemos tu inversión o trabajamos gratis hasta lograrlo.';
      }
  }
  
  if (nodeId === 'paquete-elite') {
      if (combinedData.heroTitle === undefined) {
          combinedData.heroTopText = 'Organiza un sistema que capture, atienda y organice a tus prospectos sin que tú muevas un dedo';
          combinedData.heroTitle = 'ÉLITE';
          combinedData.heroDisclaimer = 'Si no aumentamos tus citas en un <span class="font-bold text-white not-italic">20% en 90 días hábiles</span>, trabajaremos <span class="font-bold text-white not-italic">gratis</span>.';
          combinedData.cardTitle = 'NIVEL ÉLITE';
          combinedData.planTarget = 'Ideal para el que pierde millones por el caos y la falta de datos.';
          combinedData.planPrice = '$49,500';
          combinedData.planPeriod = 'al mes';
          combinedData.planFeaturesExtended = [
              { title: 'Estrategia Godfather completa', desc: '' },
              { title: 'Reactivación de base de datos', desc: '' },
              { title: 'Consultoría mensual y cierre', desc: '' }
          ];
          combinedData.guaranteeTitle = 'GARANTÍA DE SATISFACCIÓN';
          combinedData.guaranteeBadge = 'Resultados garantizados 100%';
          combinedData.guaranteeText = 'Estamos tan seguros de nuestros resultados que ofrecemos una garantía total.\n\nSi no cumplimos con los entregables pactados en el tiempo establecido, te devolvemos tu inversión o trabajamos gratis hasta lograrlo.';
      }
  }

  if (nodeId === 'paquete-control-ia') {
      if (combinedData.heroTitle === undefined) {
          combinedData.heroTopText = 'Atiende, califica y agenda en automático las 24 horas del día';
          combinedData.heroTitle = 'Control IA';
          combinedData.heroDisclaimer = 'Si en <span class="font-bold text-white not-italic">7 días hábiles</span>, tu sistema no está instalado, respondiendo mensajes y capturando datos de tus clientes automáticamente, te regalamos el siguiente mes de servicio completamente <span class="font-bold text-white not-italic">GRATIS</span>.';
          combinedData.cardTitle = 'CONTROL IA';
          combinedData.planTarget = 'Ideal para el que no confía y se ha vuelto esclavo de su propio éxito';
          combinedData.planPrice = '$7,900';
          combinedData.planPeriod = 'al mes';
          combinedData.planFeaturesExtended = [
              { title: 'Agente IA (Web + WhatsApp):', desc: 'Configuración de cerebro digital para\nresponder dudas frecuentes y horarios 24/7' },
              { title: 'Respuesta en menos de 5 segundos\n24 horas al día, 7 días a la semana', desc: '' },
              { title: 'Captura de datos automática', desc: '' }
          ];
          combinedData.guaranteeTitle = 'GARANTÍA DE SATISFACCIÓN';
          combinedData.guaranteeBadge = 'Resultados garantizados 100%';
          combinedData.guaranteeText = 'Estamos tan seguros de nuestros resultados que ofrecemos una garantía total.\n\nSi no cumplimos con los entregables pactados en el tiempo establecido, te devolvemos tu inversión o trabajamos gratis hasta lograrlo.';
      }
  }

  if (nodeId === 'paquete-posicionamiento-social') {
      if (combinedData.heroTitle === undefined) {
          combinedData.heroTopText = 'Posiciona tu marca en donde tu audiencia realmente interactúa';
          combinedData.heroTitle = 'Posicionamiento social';
          combinedData.heroDisclaimer = 'Si en <span class="font-bold text-white not-italic">14 días</span> no ves un incremento real en el engagement y la calidad de tu marca, el siguiente mes es <span class="font-bold text-[#CC0000] not-italic">GRATIS</span>.';
          combinedData.cardTitle = 'POSICIONAMIENTO SOCIAL';
          combinedData.planTarget = 'Ideal para negocios invisibles que buscan generar contenido en redes en demanda';
          combinedData.planPrice = '$7,900';
          combinedData.planPeriod = 'al mes';
          combinedData.planFeaturesExtended = [
              { title: 'Estrategia de Contenido Omnicanal', desc: '' },
              { title: 'Copywriting de Respuesta Directa', desc: '' },
              { title: 'Community Management', desc: '' },
              { title: 'Growth Hacking Orgánico', desc: '' }
          ];
          combinedData.guaranteeTitle = 'GARANTÍA DE SATISFACCIÓN';
          combinedData.guaranteeBadge = 'Resultados garantizados 100%';
          combinedData.guaranteeText = 'Estamos tan seguros de nuestros resultados que ofrecemos una garantía total.\n\nSi no cumplimos con los entregables pactados en el tiempo establecido, te devolvemos tu inversión o trabajamos gratis hasta lograrlo.';
      }
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

  if (nodeId === 'footer') {
      if (combinedData.contactTitle === undefined) combinedData.contactTitle = 'Información de\ncontacto';
      if (combinedData.contactEmail === undefined) combinedData.contactEmail = 'info@godzillaconsulting.ai';
      if (combinedData.contactPhone === undefined) combinedData.contactPhone = '656 581 8912';

      if (combinedData.navTitle === undefined) combinedData.navTitle = 'Navegación';
      if (combinedData.navLink1 === undefined) combinedData.navLink1 = 'Inicio';
      if (combinedData.navLink2 === undefined) combinedData.navLink2 = 'Cultura';
      if (combinedData.navLink3 === undefined) combinedData.navLink3 = 'Servicios';
      if (combinedData.navLink4 === undefined) combinedData.navLink4 = 'Paquetes';
      if (combinedData.navLink5 === undefined) combinedData.navLink5 = 'Portafolio';
      if (combinedData.navLink6 === undefined) combinedData.navLink6 = 'Recursos';

      if (combinedData.legalLink1 === undefined) combinedData.legalLink1 = 'Aviso de privacidad';
      if (combinedData.legalUrl1 === undefined) combinedData.legalUrl1 = '/aviso-privacidad';
      
      if (combinedData.legalLink2 === undefined) combinedData.legalLink2 = 'Términos y condiciones';
      if (combinedData.legalUrl2 === undefined) combinedData.legalUrl2 = '/terminos';
      
      if (combinedData.legalLink3 === undefined) combinedData.legalLink3 = 'Política de cookies';
      if (combinedData.legalUrl3 === undefined) combinedData.legalUrl3 = '/politica-cookies';
      
      if (combinedData.legalLink4 === undefined) combinedData.legalLink4 = 'Preguntas frecuentes';
      if (combinedData.legalUrl4 === undefined) combinedData.legalUrl4 = '/faq';
      
      if (combinedData.legalLink5 === undefined) combinedData.legalLink5 = 'Contacto';
      if (combinedData.legalUrl5 === undefined) combinedData.legalUrl5 = '/#contacto';
      
      if (combinedData.copyrightText === undefined) combinedData.copyrightText = 'Godzilla Co. Todos los derechos reservados.';
  }

  return combinedData;
}
