import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

import esTranslation from './locales/es.json';
// Importamos ingles nativo tambien para que no cueste tokens
import enTranslation from './locales/en.json';

// Recursos nativos pre-cargados (no disparan petición a /api/translate)
const resources = {
  es: { translation: { ...esTranslation } },
  en: { translation: { ...enTranslation } }
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Permite que i18n sepa que algunos idiomas ya están en memoria (es, en)
    // y los que NO están, los mandará a pedir por http-backend
    partialBundledLanguages: true,
    
    backend: {
      loadPath: `/api/translate?lang={{lng}}`,
      requestOptions: {
        cache: 'default' // Deja que el navegador use la caché de disco de la API de Groq
      }
    },
    
    // Si la traducción del idioma detectado falla catastróficamente, regresamos al original de la empresa
    fallbackLng: 'es',

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ['querystring', 'navigator', 'htmlTag'],
      nonExplicitSupportedLngs: true,
      lookupQuerystring: 'lng',
      caches: [] // No guarda el idioma en localStorage para que siempre analice el navegador fresco
    }
  });

export default i18n;
