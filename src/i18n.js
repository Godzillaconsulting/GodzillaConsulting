import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

// Import local locales inline for start, later can be moved to JSON files if it gets big.
const resources = {
  es: {
    translation: {
      navbar: {
        home: "Inicio",
        culture: "Cultura",
        services: "Servicios",
        portfolio: "Portafolio",
        resources: "Recursos",
        packages: "Paquetes",
        digital_marketing: "Marketing Digital",
        ecommerce: "Ecommerce y Software",
        ai_solutions: "Soluciones con IA",
        about: "Sobre Nosotros",
        login: "Iniciar Sesión",
        start_now: "Comenzar Proyecto"
      },
      hero: {
        title: "DETÉN LA FUGA DE LEADS Y ESCALA TU FACTURACIÓN CON INTELIGENCIA ARTIFICIAL.",
        subtitle: "El único sistema de marketing que instala un \"Recepcionista Digital\" 24/7, reactiva tu base de datos y te garantiza resultados por contrato. Si no cumplimos, no pagas.",
        ctaText: "Ver planes y garantías"
      },
      services: {
        overline: "Soluciones de Alto Impacto",
        title: "SERVICIOS",
        learn_more: "Saber más",
        items: {
          bots: {
            title: "Automatización de Bots",
            desc: "Automatiza tu atención al cliente 24/7 con bots entrenados en tu negocio, que responden dudas, califican prospectos y los llevan directo a la cita o a la venta. Integrados con WhatsApp, redes sociales y tu CRM."
          },
          video: {
            title: "Producción audiovisual",
            desc: "Creamos contenido audiovisual estratégico que genera confianza, autoridad, fortalece tu marca, comunica tu propuesta de valor y potencia la conversión en campañas y redes sociales."
          },
          funnels: {
            title: "Embudos de venta",
            desc: "Estructuramos embudos digitales orientados a resultados que convierten tráfico en citas y oportunidades comerciales medibles."
          },
          social: {
            title: "Gestión de redes sociales",
            desc: "Administramos la presencia digital de tu marca con una estrategia de contenido profesional, enfocada en posicionamiento, reputación y generación de prospectos."
          },
          seo: {
            title: "Optimización web y SEO",
            desc: "Optimizamos tu sitio web y su estructura SEO para mejorar visibilidad en buscadores, experiencia de usuario y generación de leads calificados."
          },
          crm: {
            title: "CRM con SAAS personalizado",
            desc: "Implementamos plataformas CRM y soluciones SaaS a la medida para centralizar contactos, automatizar seguimientos y facilitar la gestión comercial de tu equipo."
          }
        }
      },
      ...esTranslation
    }
  },
  en: {
    translation: {
      navbar: {
        home: "Home",
        culture: "Culture",
        services: "Services",
        portfolio: "Portfolio",
        resources: "Resources",
        packages: "Packages",
        digital_marketing: "Digital Marketing",
        ecommerce: "Ecommerce & Software",
        ai_solutions: "AI Solutions",
        about: "About Us",
        login: "Login",
        start_now: "Start Project"
      },
      hero: {
        title: "STOP LEAD LEAKAGE AND SCALE YOUR REVENUE WITH ARTIFICIAL INTELLIGENCE.",
        subtitle: 'The only marketing system that installs a 24/7 "Digital Receptionist", reactivates your database, and guarantees results by contract. If we don\'t deliver, you don\'t pay.',
        ctaText: "View plans & guarantees"
      },
      services: {
        overline: "High-Impact Solutions",
        title: "SERVICES",
        learn_more: "Learn more",
        items: {
          bots: {
            title: "Bot Automation",
            desc: "Automate your 24/7 customer service with AI bots trained on your business. They answer questions, qualify leads, and drive them straight to an appointment or sale. Fully integrated with WhatsApp, social media, and your CRM."
          },
          video: {
            title: "Audiovisual Production",
            desc: "We create strategic audiovisual content that builds trust, establishes authority, strengthens your brand, communicates your value proposition, and boosts conversion rates across social media campaigns."
          },
          funnels: {
            title: "Sales Funnels",
            desc: "We build result-oriented digital funnels that turn raw traffic into qualified appointments and measurable business opportunities."
          },
          social: {
            title: "Social Media Management",
            desc: "We manage your brand's digital presence with a professional content strategy focused on positioning, reputation management, and lead generation."
          },
          seo: {
            title: "Web & SEO Optimization",
            desc: "We optimize your website and its SEO structure to improve search engine visibility, user experience, and the generation of highly qualified leads."
          },
          crm: {
            title: "Custom CRM & SaaS",
            desc: "We implement tailor-made CRM platforms and SaaS solutions to centralize your contacts, automate follow-ups, and streamline your team's commercial management."
          }
        }
      },
      ...enTranslation
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Idioma base: español. Si el navegador es inglés u otro → se detecta automáticamente.
    fallbackLng: "es",

    interpolation: {
      escapeValue: false // React already escapes values to prevent XSS
    },

    detection: {
      // Order and from where user language should be detected
      // localStorage se quitó para que NO persista ?lng=en en futuras visitas sin parámetro
      order: ['querystring', 'navigator', 'htmlTag'],
      // Only detect based on language region code e.g. en-US -> en
      nonExplicitSupportedLngs: true,
      // keys or params to lookup language from
      lookupQuerystring: 'lng',
      // No cachear selección de idioma — cada visita detecta fresco del navegador
      caches: [],
    }
  });

export default i18n;
