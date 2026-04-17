import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

// Import local locales inline for start, later can be moved to JSON files if it gets big.
const resources = {
  es: {
    translation: {
      ...esTranslation
    }
  },
  en: {
    translation: {
      ...enTranslation
    }
  }
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    partialBundledLanguages: true,
    backend: {
      loadPath: `/api/locales/{{lng}}?v=${Date.now()}`,
      requestOptions: {
        cache: 'no-store'
      }
    },
    // Si el idioma del dispositivo falla la traducción JIT o es desconocido, fallback
    fallbackLng: "en",

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
