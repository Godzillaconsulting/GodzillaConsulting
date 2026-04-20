import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

const SUPPORTED_NATIVE = ['en', 'es'];
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// ── Recursos base (ES + EN siempre disponibles) ───────────────
const resources = {
    es: { translation: { ...esTranslation } },
    en: { translation: { ...enTranslation } }
};

// ── Inicializar i18next de forma sincrónica ───────────────────
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        detection: {
            order: ['querystring', 'navigator', 'htmlTag'],
            lookupQuerystring: 'lng',
            nonExplicitSupportedLngs: true,
            caches: []
        }
    });

// ── Carga dinámica de idiomas no incluidos ────────────────────
async function loadDynamicLanguage(lang) {
    const baseLang = lang.split('-')[0].toLowerCase();

    // Ya disponible nativamente
    if (SUPPORTED_NATIVE.includes(baseLang)) return;

    // Verificar caché en localStorage
    const cacheKey = `gz_i18n_${baseLang}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL_MS) {
                i18n.addResourceBundle(baseLang, 'translation', data, true, true);
                i18n.changeLanguage(baseLang);
                return;
            }
        }
    } catch (_) {}

    // Obtener traducción desde Vercel
    try {
        const res = await fetch(`/api/translate?lang=${baseLang}`, {
            signal: AbortSignal.timeout(60000)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Guardar en caché
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
        } catch (_) {}

        i18n.addResourceBundle(baseLang, 'translation', data, true, true);
        i18n.changeLanguage(baseLang);
    } catch (err) {
        console.warn(`[i18n] No se pudo cargar idioma "${baseLang}":`, err.message);
        // Fallback silencioso a inglés
    }
}

// ── Detectar idioma del dispositivo y cargar si es necesario ──
const browserLang = (navigator.language || navigator.languages?.[0] || 'en').split('-')[0].toLowerCase();
if (!SUPPORTED_NATIVE.includes(browserLang)) {
    // Cargar async — el sitio empieza en EN mientras llega la traducción
    loadDynamicLanguage(browserLang);
}

export default i18n;
