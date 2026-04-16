import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
      }
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
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // fallbackLng defines what happens if the language detected is not available.
    fallbackLng: "en",

    interpolation: {
      escapeValue: false // React already escapes values to prevent XSS
    },

    detection: {
      // Order and from where user language should be detected
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      // Only detect based on language region code e.g. en-US -> en
      nonExplicitSupportedLngs: true,
      // keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      lookupSessionStorage: 'i18nextLng',
    }
  });

export default i18n;
