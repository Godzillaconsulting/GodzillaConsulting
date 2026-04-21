import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// ── Idiomas bundleados estáticamente (carga instantánea, sin petición de red) ──
// Español: idioma ORIGINAL de la empresa (master source)
// Inglés: pre-cargado porque es el 2º idioma más común y evita latencia
// Resto de idiomas: traducidos en tiempo real por Gemini vía /api/translate
import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';
import ptTranslation from './locales/pt.json';
import deTranslation from './locales/de.json';
import jaTranslation from './locales/ja.json';
import itTranslation from './locales/it.json';
import zhTranslation from './locales/zh.json';

const resources = {
  es: { translation: { ...esTranslation } },
  en: { translation: { ...enTranslation } },
  fr: { translation: { ...frTranslation } },
  pt: { translation: { ...ptTranslation } },
  de: { translation: { ...deTranslation } },
  ja: { translation: { ...jaTranslation } },
  it: { translation: { ...itTranslation } },
  zh: { translation: { ...zhTranslation } }
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Si el idioma detectado NO está en resources, lo traerá vía HttpApi → /api/translate
    partialBundledLanguages: true,

    backend: {
      loadPath: `/api/translate?lang={{lng}}`,
      requestOptions: {
        cache: 'default' // Reutiliza la caché del navegador para no re-pagar tokens de Gemini
      }
    },

    // Fallback al español (idioma master de la empresa) si algo falla
    fallbackLng: 'es',

    interpolation: {
      escapeValue: false
    },

    detection: {
      // Detecta idioma por: 1) query ?lng=xx  2) idioma del navegador  3) atributo lang del HTML
      order: ['querystring', 'navigator', 'htmlTag'],
      nonExplicitSupportedLngs: true,
      lookupQuerystring: 'lng',
      caches: [] // No cachear en localStorage: qué idioma usar siempre lo decide el navegador fresco
    }
  });

export default i18n;
