import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Diccionarios de idiomas pre-cargados localmente (carga instantánea en cualquier dispositivo) ──
import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';
import ptTranslation from './locales/pt.json';
import deTranslation from './locales/de.json';
import jaTranslation from './locales/ja.json';
import itTranslation from './locales/it.json';
import zhTranslation from './locales/zh.json';

const resources = {
  es: { translation: esTranslation },
  en: { translation: enTranslation },
  fr: { translation: frTranslation },
  pt: { translation: ptTranslation },
  de: { translation: deTranslation },
  ja: { translation: jaTranslation },
  it: { translation: itTranslation },
  zh: { translation: zhTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['es', 'en', 'fr', 'pt', 'de', 'ja', 'it', 'zh'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'es',

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ['querystring', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      caches: []
    }
  });

export default i18n;

