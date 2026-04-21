// ============================================================
// api/translate.js — Vercel Serverless Function
// Traduce la UI completa a CUALQUIER idioma usando Gemini.
// La fuente SIEMPRE es el es.json (idioma master de la empresa).
// Inglés ya está pre-bundlado en en.json — no se traduce aquí.
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

// Mapa de idiomas soportados por traducción JIT (es → X)
// Inglés NO está aquí porque ya viene bundlado estáticamente en en.json
const LANG_NAMES = {
  fr: 'French',   de: 'German',     pt: 'Portuguese', it: 'Italian',
  ar: 'Arabic',   zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean',
  ru: 'Russian',  nl: 'Dutch',      sv: 'Swedish',    no: 'Norwegian',
  da: 'Danish',   fi: 'Finnish',    pl: 'Polish',     tr: 'Turkish',
  hi: 'Hindi',    id: 'Indonesian', vi: 'Vietnamese', th: 'Thai',
  he: 'Hebrew',   ro: 'Romanian',   hu: 'Hungarian',  cs: 'Czech',
  sk: 'Slovak',   uk: 'Ukrainian',  el: 'Greek',      bg: 'Bulgarian'
};

// Fuente master en español (copiada del es.json para que Gemini siempre
// parta de la versión oficial de la empresa, sin textos rancios)
const ES_SOURCE = {
  "navbar": { "home": "Inicio", "culture": "Cultura", "services": "Servicios", "portfolio": "Portafolio", "resources": "Recursos", "packages": "Paquetes", "digital_marketing": "Marketing Digital", "ecommerce": "Ecommerce y Software", "ai_solutions": "Soluciones con IA", "about": "Sobre Nosotros", "login": "Iniciar Sesión", "start_now": "Comenzar Proyecto" },
  "hero": { "title": "DETÉN LA FUGA DE LEADS Y ESCALA TU FACTURACIÓN CON INTELIGENCIA ARTIFICIAL.", "subtitle": "El único sistema de marketing que instala un \"Recepcionista Digital\" 24/7, reactiva tu base de datos y te garantiza resultados por contrato. Si no cumplimos, no pagas.", "ctaText": "Ver planes y garantías" },
  "services": { "overline": "Soluciones de Alto Impacto", "title": "SERVICIOS", "learn_more": "Saber más", "items": { "bots": { "title": "Automatización de Bots", "desc": "Automatiza tu atención al cliente 24/7 con bots entrenados en tu negocio, que responden dudas, califican prospectos y los llevan directo a la cita o a la venta. Integrados con WhatsApp, redes sociales y tu CRM." }, "video": { "title": "Producción audiovisual", "desc": "Creamos contenido audiovisual estratégico que genera confianza, autoridad, fortalece tu marca, comunica tu propuesta de valor y potencia la conversión en campañas y redes sociales." }, "funnels": { "title": "Embudos de venta", "desc": "Estructuramos embudos digitales orientados a resultados que convierten tráfico en citas y oportunidades comerciales medibles." }, "social": { "title": "Gestión de redes sociales", "desc": "Administramos la presencia digital de tu marca con una estrategia de contenido profesional, enfocada en posicionamiento, reputación y generación de prospectos." }, "seo": { "title": "Optimización web y SEO", "desc": "Optimizamos tu sitio web y su estructura SEO para mejorar visibilidad en buscadores, experiencia de usuario y generación de leads calificados." }, "crm": { "title": "CRM con SAAS personalizado", "desc": "Implementamos plataformas CRM y soluciones SaaS a la medida para centralizar contactos, automatizar seguimientos y facilitar la gestión comercial de tu equipo." } } },
  "footer": { "contact": "Información de contacto", "nav": "Navegación", "legal": "Legal", "home": "Inicio", "culture": "Cultura", "services": "Servicios", "packages": "Paquetes", "portfolio": "Portafolio", "resources": "Recursos", "terms": "Términos y Condiciones", "privacy": "Aviso de Privacidad", "cookies": "Política de cookies", "copyright": "Godzilla Co. Todos los derechos reservados." },
  "contact": { "title": "EMPECEMOS LA GUERRA", "subtitle": "Deja de perder dinero en campañas que no funcionan. Completa el formulario para agendar una sesión estratégica de diagnóstico.", "name": "Nombre completo", "company": "Empresa o Proyecto", "email": "Correo empresarial", "phone": "Teléfono (Opcional)", "revenue": "Facturación actual o proyectada", "revenue_options": { "new": "Apenas iniciando ($0 - $5,000 USD)", "growing": "Creciendo ($5,000 - $20,000 USD)", "scaling": "Escalando ($20,000 - $50,000 USD)", "enterprise": "Empresa establecida ($50,000+ USD)" }, "message": "¿Cuál es tu reto principal a resolver?", "submit": "APLICAR AHORA", "submitting": "ENVIANDO...", "success": "Información recibida correctamente.", "error": "Error al conectar. Por favor intenta de nuevo." },
  "banner": { "limited": "TIEMPO LIMITADO", "getBonus": "Descarga el Reporte Ejecutivo", "close": "Cerrar" },
  "faq": { "title": "PREGUNTAS FRECUENTES", "subtitle": "Respuestas claras sobre nuestra forma de operar." },
  "leadmagnet": { "title": "7 Prompts de IA comprobados", "subtitle": "Déjanos tu correo y recíbelos al instante.", "placeholder": "Tu mejor correo...", "btnDownloading": "Enviando...", "btnDownload": "Descargar", "success": "¡El recurso va en camino a tu bandeja de entrada!", "alreadySent": "¡Ya habíamos enviado este documento a tu correo antes! Revisa tu bandeja de spam.", "emptyEmail": "Escribe un email válido." },
  "faqPage": { "title1": "PREGUNTAS", "title2": "FRECUENTES", "subtitle": "Todo lo que necesitas saber sobre Godzilla Consulting", "notFound": "¿No encontraste lo que buscabas?", "contact": "Contáctanos directamente" },
  "portfolio": { "overline": "CASOS DE ÉXITO", "title": "CASOS DE ÉXITO", "subtitle": "No hacemos solo campañas, construimos sistemas" },
  "chat": { "greeting": "¡Hola! Soy Zilla. 😊 ¿Cómo puedo ayudarte?" },
  "culture": { "title": "NUESTRA", "titleRed": "CULTURA", "mission": "Nuestra Misión", "missionText": "Impulsar el crecimiento escalable de negocios B2B mediante la implementación de embudos inteligentes, automatización avanzada y estrategias omnicanal.", "vision": "La Visión", "visionText": "Convertirnos en la agencia integral de referencia, liderando la transformación digital con IA para que las empresas no sólo vendan, sino que sistematicen su éxito.", "values": "Nuestros Valores", "values1": "Innovación implacable", "values2": "Transparencia radical", "values3": "Diseño centrado en resultados", "values4": "Adaptabilidad extrema", "values5": "Pasión por los datos", "values6": "Obsesión por el cliente" },
  "packages": { "title": "NUESTROS", "titleRed": "SISTEMAS", "subtitle": "Soluciones integrales de crecimiento", "btn": "Contratar ahora", "includes": "Incluye:", "consult": "Hablar con ventas" },
  "resources": { "title": "NUESTROS", "titleRed": "RECURSOS", "subtitle": "Herramientas gratuitas para automatizar tu negocio", "btn": "Descargar ahora" },
  "responsibilities": { "title": "Responsabilidades", "subtitle": "de nuestros clientes", "h3": "Trabajamos juntos, entregamos juntos", "p": "Los tiempos de entrega que prometemos son reales, pero dependen de un ingrediente clave: el trabajo en equipo.", "points": [ "Firma del contrato de prestación de servicios antes de iniciar el proyecto", "Entrega de información y materiales solicitados dentro de los plazos establecidos", "Respuestas y feedback en máximo 48-72 horas hábiles", "Accesos necesarios proporcionados al inicio", "Disponibilidad para juntas de seguimiento", "Aprobaciones claras y por escrito", "Punto de contacto designado" ], "warning": "El incumplimiento de estos puntos puede resultar en extensión de los tiempos de entrega originalmente acordados." }
};

export default async function handler(req, res) {
    const lang = (req.query.lang || '').toLowerCase().split('-')[0];

    // Español: ya viene del bundle estático (es.json), no se traduce aquí
    if (!lang || lang === 'es') {
        return res.status(400).json({ error: 'es uses static locale bundle' });
    }

    // Inglés: ya viene del bundle estático (en.json), no se traduce aquí
    if (lang === 'en') {
        return res.status(400).json({ error: 'en uses static locale bundle' });
    }

    const langName = LANG_NAMES[lang];
    if (!langName) {
        // Idioma no catalogado → fallback silencioso a español
        return res.status(400).json({ error: `Language '${lang}' not supported for JIT translation` });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const prompt = `Actúa como un traductor profesional nativo en ${langName} especializado en UI/UX y marketing B2B.
Traduce el siguiente JSON de ESPAÑOL a ${langName}.

REGLAS CRÍTICAS — INCUMPLIRLAS ROMPE LA APP:
1. Devuelve ÚNICAMENTE JSON válido. Sin markdown (\`\`\`json), sin texto introductorio, sin comentarios. El primer carácter DEBE ser '{'.
2. Traduce SOLO los valores de texto (strings). NUNCA cambies las llaves (keys).
3. Conserva nombres propios sin traducir: "Godzilla Consulting", "WhatsApp", "Ciudad Juárez", "TikTok", "CRM", "SaaS", "SEO", "B2B".
4. Conserva caracteres especiales, emojis y secuencias de escape (\\n) intactos.
5. Ajusta el tono al mercado empresarial de ${langName} — profesional pero directo.

JSON en Español a traducir:
${JSON.stringify(ES_SOURCE)}`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
            }
        });

        const result = await model.generateContent(prompt);
        let rawText = (result.response.text() || '').trim();

        // Safety strip por si Gemini igual mete markdown
        if (rawText.startsWith('```')) rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

        const translated = JSON.parse(rawText);

        // Cachear 7 días en CDN de Vercel, 24h en navegador
        res.setHeader('Cache-Control', 's-maxage=604800, max-age=86400, stale-while-revalidate=3600');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(translated);

    } catch (e) {
        console.error(`[translate] Gemini Error for lang=${lang}:`, e.message);
        return res.status(500).json({ error: "Translation failed: " + e.message });
    }
}

export const config = { api: { bodyParser: false, externalResolver: true } };
