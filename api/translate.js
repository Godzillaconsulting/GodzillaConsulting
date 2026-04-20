// ============================================================
// api/translate.js — Vercel Serverless Function
// Traduce el sitio completo a cualquier idioma usando Gemini.
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

const LANG_NAMES = {
  fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian',
  ar: 'Arabic', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean',
  ru: 'Russian', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian',
  da: 'Danish', fi: 'Finnish', pl: 'Polish', tr: 'Turkish',
  hi: 'Hindi', id: 'Indonesian', vi: 'Vietnamese', th: 'Thai',
  he: 'Hebrew', ro: 'Romanian', hu: 'Hungarian', cs: 'Czech',
  sk: 'Slovak', uk: 'Ukrainian', el: 'Greek', bg: 'Bulgarian'
};

const EN_TRANSLATION = {
  "navbar": { "home": "Inicio", "culture": "Cultura", "services": "Servicios", "portfolio": "Portafolio", "resources": "Recursos", "packages": "Paquetes", "digital_marketing": "Marketing Digital", "ecommerce": "Ecommerce & Software", "ai_solutions": "Soluciones IA", "about": "Nosotros", "login": "Entrar", "start_now": "Iniciar Proyecto" },
  "hero": { "title": "DETÉN LA FUGA DE LEADS Y ESCALA TUS INGRESOS CON INTELIGENCIA ARTIFICIAL.", "subtitle": "El único sistema de marketing que te instala una \"Recepcionista Digital\" 24/7, reactiva tu base de datos y garantiza resultados por contrato. Si no cumplimos, no pagas.", "ctaText": "Ver planes y garantías" },
  "services": { "overline": "Soluciones de Alto Impacto", "title": "SERVICIOS", "learn_more": "Saber más", "items": { "bots": { "title": "Austomatización de Bots", "desc": "Automatiza tu atención 24/7 con IA." }, "video": { "title": "Producción Audiovisual", "desc": "Creamos contenido audiovisual estratégico." }, "funnels": { "title": "Funnels de Venta", "desc": "Construimos embudos de venta." }, "social": { "title": "Redes Sociales", "desc": "Gestionamos tu presencia digital." }, "seo": { "title": "SEO", "desc": "Optimizamos tu sitio web." }, "crm": { "title": "CRM Custom", "desc": "Implementamos CRM a medida." } } },
  "footer": { "contact": "Contacto", "nav": "Navegación", "legal": "Legal", "home": "Inicio", "culture": "Cultura", "services": "Servicios", "packages": "Paquetes", "portfolio": "Portafolio", "resources": "Recursos", "terms": "Términos y Condiciones", "privacy": "Política de Privacidad", "cookies": "Política de Cookies", "copyright": "Godzilla Co. Todos los derechos reservados." },
  "contact": { "title": "INICIEMOS LA GUERRA", "h3": "Agenda una llamada estratégica" },
  "banner": { "limited": "TIEMPO LIMITADO", "getBonus": "Descarga el Reporte", "close": "Cerrar" },
  "faq": { "title": "PREGUNTAS FRECUENTES", "subtitle": "Respuestas claras." },
  "leadmagnet": { "title": "7 Prompts de IA", "subtitle": "Déjanos tu email." },
  "faqPage": { "title1": "PREGUNTAS FRECUENTES", "subtitle": "Todo lo que necesitas saber." },
  "portfolio": { "overline": "CASOS DE ÉXITO", "title": "CASOS DE ÉXITO", "subtitle": "Construimos sistemas." },
  "chat": { "greeting": "¡Hola! Soy Zilla. 😊 ¿En qué puedo ayudarte?" },
  "culture": { "title": "CULTURA", "mission": "Nuestra Misión", "vision": "VisióN" },
  "packages": { "title": "NUESTROS SISTEMAS", "btn": "Iniciar", "guarantee": "VER GARANTÍA" },
  "resources": { "title": "NUESTROS RECURSOS", "btn": "Descargar", "modalTitle": "¡Listo!" },
  "landing": { "discoverMore": "Descubre más" },
  "responsibilities": { "title": "Responsabilidades", "subtitle": "Cliente" }
};

export default async function handler(req, res) {
    const lang = (req.query.lang || '').toLowerCase().split('-')[0];

    if (!lang || lang === 'es') {
        return res.status(400).json({ error: 'Use existing locale files for es' });
    }

    const langName = LANG_NAMES[lang] || lang;
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });
    }

    const prompt = `Actúa como traductor profesional experto en UI/UX. Traduce el siguiente JSON de Español a ${langName}.

REGLAS CRÍTICAS:
1. Traduce ÚNICAMENTE los valores de texto. NUNCA traduzcas las llaves (keys) del JSON.
2. Conserva todos los caracteres especiales, saltos de línea (\\n) y código HTML intacto.
3. Mantén los nombres propios intactos: "Godzilla Consulting", "Ciudad Juárez", "WhatsApp".
4. Devuelve ÚNICAMENTE un JSON válido (sin marcas markdown como \`\`\`json, sin texto extra, sin formato, literal inicia con '{').

JSON a traducir:
${JSON.stringify(EN_TRANSLATION)}`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.1, // Evitar creatividad para que no rompa el JSON
                responseMimeType: "application/json",
            }
        });

        const result = await model.generateContent(prompt);
        let rawText = result.response.text() || '';

        const translated = JSON.parse(rawText);

        res.setHeader('Cache-Control', 's-maxage=604800, max-age=86400');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(translated);

    } catch (e) {
        console.error('[translate] Gemini Error:', e.message);
        return res.status(500).json({ error: "Fallo al traducir: " + e.message });
    }
}

export const config = { api: { bodyParser: false, externalResolver: true } };ternalResolver: true } };
