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

// ── Detectar idioma base del dispositivo ─────────────────────
const RAW_LANG = (navigator.language || navigator.languages?.[0] || 'en');
const DEVICE_LANG = RAW_LANG.split('-')[0].toLowerCase();
const NEEDS_TRANSLATION = !SUPPORTED_NATIVE.includes(DEVICE_LANG);

// ── Inicializar i18next ───────────────────────────────────────
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        // Si el idioma necesita traducción dinámica, arrancamos en inglés
        // y luego cambiamos cuando llegue la traducción
        lng: NEEDS_TRANSLATION ? 'en' : undefined,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        detection: {
            order: ['querystring', 'navigator', 'htmlTag'],
            lookupQuerystring: 'lng',
            nonExplicitSupportedLngs: true,
            caches: []
        }
    });

// ── Carga dinámica de idiomas ─────────────────────────────────
async function loadDynamicLanguage(lang) {
    // Verificar caché en localStorage
    const cacheKey = `gz_i18n_${lang}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL_MS && data && typeof data === 'object') {
                console.log(`[i18n] Cargando "${lang}" desde caché`);
                i18n.addResourceBundle(lang, 'translation', data, true, true);
                await i18n.changeLanguage(lang);
                return;
            }
        }
    } catch (_) {}

    // Obtener traducción desde Vercel
    console.log(`[i18n] Descargando traducción para "${lang}"...`);
    try {
        const res = await fetch(`/api/translate?lang=${lang}`, {
            signal: AbortSignal.timeout(60000)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data || typeof data !== 'object' || data.error) {
            throw new Error(data?.error || 'Invalid translation data');
        }

        // Guardar en caché
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
        } catch (_) {}

        i18n.addResourceBundle(lang, 'translation', data, true, true);
        await i18n.changeLanguage(lang);
        console.log(`[i18n] ✅ Idioma "${lang}" cargado correctamente`);

    } catch (err) {
        console.warn(`[i18n] ⚠️ No se pudo cargar idioma "${lang}":`, err.message, '→ usando inglés');
        // Mantiene inglés como fallback
    }
}

// ── Ejecutar carga si el dispositivo usa otro idioma ─────────
if (NEEDS_TRANSLATION) {
    loadDynamicLanguage(DEVICE_LANG);
}

export default i18n;
