import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import abordajeRoutes from './routes/abordaje.js';
import leadsRoutes from './routes/leads.js';
import contactRoutes from './routes/contact.js';
import mediaRoutes from './routes/media.js';
import tiktokRoutes from './routes/tiktok.js';
import authRoutes from './routes/auth.js';
import newsletterRoutes from './routes/newsletter.js';
import leadMagnetsRoutes from './routes/leadMagnets.js';
import analyticsRoutes from './routes/analytics.js';
import usersRoutes from './routes/users.js';
import trendsRoutes from './routes/trends.js';
import socialRoutes from './routes/social.js';
import resourcesRoutes from './routes/resources.js';
import adminMigrationRoutes from './routes/adminMigration.js';
import aiStudioRoutes from './routes/aiStudio.js';
import bugsRoutes from './routes/bugs.js';
import localesRoutes from './routes/locales.js';
import pool, { connectDB } from './config/db.js';

import chatRoutes from './routes/chat.js';
import nodesRoutes from './routes/nodes.js';
import webhookRoutes from './routes/webhook.js';
import botConfigsRoutes from './routes/botConfigs.js';
import dbStudioRoutes from './routes/dbStudio.js';
import calendarRoutes from './routes/calendar.js';
import sheetsRoutes from './routes/sheets.js';
import automationRoutes from './routes/automation.js';
import { verifyAdminToken, requireSuperAdmin } from './middleware/adminAuth.js';
import { wafMiddleware } from './middleware/wafService.js';
import adminWafRoutes from './routes/adminWaf.js';
import internalToolsRoutes from './routes/internalTools.js';
import cronScheduler from './services/cronScheduler.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));


// Inicializar variables de entorno (.env)
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('[DEBUG] .env cargado. GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Presente' : 'FALTANTE');

// Inicializar conexión a PostgreSQL (Local)
connectDB();

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARES DE SEGURIDAD
// ==========================================

// ─── MIDDLEWARE: Cross-Origin-Resource-Policy para GIFs y medios estáticos ──
// Debe ir ANTES de Helmet y del static middleware.
// Elimina cross-origin-opener-policy (que Cloudflare puede cachear) y fuerza CORP+CORS correctos.
app.use((req, res, next) => {
    if (req.path.startsWith('/media') || req.path.startsWith('/api/media') || req.path.startsWith('/outputs') || req.path.startsWith('/api/outputs')) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Timing-Allow-Origin', '*');
        // Evitar que Cloudflare cachee versiones sin los headers correctos
        res.setHeader('Vary', 'Origin');
        // Eliminar header problemático que Helmet puede inyectar
        res.removeHeader('Cross-Origin-Opener-Policy');
    }
    next();
});

// [Restaurado con prevención de Vercel] Helmet estaba causando crash de FUNCTION_INVOCATION_FAILED en Vercel Serverless
if (!process.env.VERCEL) {
    app.use(helmet({
        contentSecurityPolicy: false,         // CSP custom en prod si se necesita
        crossOriginEmbedderPolicy: false,     // No bloquear recursos externos embed
        crossOriginResourcePolicy: false,     // No sobrescribir CORP manual de arriba
        crossOriginOpenerPolicy: false,       // No bloquear ventanas cross-origin
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xContentTypeOptions: true,
        xFrameOptions: { action: 'DENY' },
    }));
}

// Protección contra Accesos Directos sin Proxy
const PROXY_SECRET = process.env.PROXY_SECRET || 'Zilla-5uper-S3cr3t-2026';
app.use((req, res, next) => {
    // Si la cabecera dice Vercel Proxy, exigimos el secreto.
    if (req.headers['x-vercel-proxy'] === '1') {
        if (req.headers['x-vercel-proxy-secret'] !== PROXY_SECRET) {
            return res.status(403).json({ error: '🚨 Firewall: Secret Invalido. Acceso denegado.' });
        }
    }
    next();
});

// Cabecera anti-fingerprinting: oculta que es Express
app.disable('x-powered-by');

// CORS: Define qué dominios pueden hacer peticiones a este servidor
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://godzillaconsulting.ai',
    'https://www.godzillaconsulting.ai',
    'https://bot.godzillaconsulting.ai',
];

app.use(cors({
    origin: function (origin, callback) {
        // En prod, si origin existe y no está en la lista blanca, bloquearlo.
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost') || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS de Godzilla: Origen no autorizado.'));
        }
    },
    methods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    optionsSuccessStatus: 200
}));


// Rate Limit: Previene ataques de SPAM (fuerza bruta en el formulario)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 5,
    message: { error: 'Demasiadas solicitudes: intenta nuevamente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit específico para el Chat (más permisivo)
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: process.env.NODE_ENV === 'development' ? 1000 : 50,
    message: { error: 'Demasiados mensajes: espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit para auth (login): 10 intentos por 15 min — anti brute-force REAL
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
    message: { error: 'Demasiados intentos de inicio de sesión. Cuenta bloqueada preventivamente 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // No contar logins exitosos
    keyGenerator: (req) => {
        // Track por IP + username combinado para ser más granular
        const username = req.body?.username || 'anon';
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
        return `${ip}_${username}`;
    }
});

// Anti-Spam de Competidores (Evita inyección masiva de basura a la Base de Datos)
const downloadSubLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
    message: { error: 'Límite de suscripciones alcanzado. Intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Firewall de Minería de Datos (Evita saturación de Logs por raspado automático)
const analyticsLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: process.env.NODE_ENV === 'development' ? 1000 : 80, // Generoso porque una persona recarga la página
    message: { error: 'Trafico bloqueado preventivamente por exceso de consultas.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Parsea el Body como JSON (si no haces esto req.body es undefined)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// ==========================================
// FIREWALL WAF: BLOQUEA ATAQUES ANTES DE LAS RUTAS
// ==========================================
app.use(wafMiddleware);

// ==========================================
// 2. RUTAS DE LA API
// ==========================================

// Montamos el limitador y el router en el path `/api/leads`
app.use('/api/leads', leadsRoutes);
app.use('/api/abordaje', abordajeRoutes); // 📋 Formulario de Abordaje (5 pasos)
app.use('/api/contact', contactRoutes);
app.use('/api/bugs', bugsRoutes); // IT Bugs Router
app.use('/api/chat', chatRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/locales', localesRoutes);

// Auth limiter SOLO para login (evita brute-force).
// /api/auth/verify NO lleva rate limit — es solo validación JWT, sin DB.
app.use('/api/auth', authRoutes);
// Aplicamos limitadores de Descargas y Analíticas Públicas
app.use('/api/media', mediaRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/lead-magnets', leadMagnetsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/tiktok', tiktokRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/social', socialRoutes);
import { router as premiumRoutes } from './routes/premium.js';

app.use('/api/admin', adminMigrationRoutes); // Migración y audit — protegido por token
app.use('/api/admin/waf', adminWafRoutes); // Interfaz del Firewall en vivo
app.use('/api/studio', aiStudioRoutes); // Integradora Oficial KLING AI + FLOWVEO
app.use('/api/premium', premiumRoutes); // Endpoint JIT Multilenguaje
app.use('/api/bots/config', botConfigsRoutes); // Configuración de bots
app.use('/api/calendar', calendarRoutes);       // 📅 Calendario Colaborativo (SSE + CRUD)
app.use('/api/sheets', sheetsRoutes);           // 📊 Google Sheets Importer
app.use('/api/db-studio', verifyAdminToken, requireSuperAdmin, dbStudioRoutes); // DB Studio protegido
app.use('/api/automation', automationRoutes);   // Automation Flow
app.use('/api/internal', internalToolsRoutes); // Herramientas internas — solo para Vercel serverless
// ==========================================
// PROXY SEGURO PARA EL MOTOR GOTSORA (PYTHON)
// Supera el bloqueo Mixed Content (HTTPS -> HTTP) en el navegador
// ==========================================
app.post('/api/sora-start', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        let finalPrompt = req.body.prompt;
        
        // ===============================================
        // NIVEL 1: EL DIRECTOR DE CINE (Prompt Expander con Memoria)
        // ===============================================
        // Memoria global temporal para este proceso de Node (Conserva el contexto de la sesión actual)
        if (!global.soraDirectorMemory) global.soraDirectorMemory = [];
        if (process.env.GEMINI_API_KEY && finalPrompt.length < 400) {
            console.log(`[GOTSORA DIRECTOR] Expandiendo prompt semilla: "${finalPrompt}"`);
            try {
                const { executeAiWaterfall } = await import('./utils/aiWaterfall.js');
                
                const promptTemplate = `Eres un Maestro del Prompting estilo Midjourney V6.
Toma el siguiente concepto básico y expándelo en un prompt (en inglés) altamente visual y estético de 1 a 2 oraciones, corto pero letal.
REGLA DE ESTILO: Deduse el estilo a partir del concepto mismo (por ejemplo si dice 'dibujo', haz un prompt de ilustración con tintas artísticas; si pide '3D', hazlo render; si es corrección como 'haz al robot mas grande', aplícala a la idea anterior).
Crea atmósfera e iluminación que destaquen la escena. Prohibido usar términos de video o animación.
Historial de Creaciones Previas (Aprende del contexto y correcciones del usuario aquí):
${global.soraDirectorMemory.join("\n")}

NUEVO Concepto básico/Corrección: "${finalPrompt}"
Genera ÚNICAMENTE el nuevo prompt en inglés directo, sin explicaciones.`;

                const aiRes = await executeAiWaterfall([{ role: 'user', content: promptTemplate }], { mode: 'premium', temperature: 0.7 });
                const resultText = aiRes.content ? aiRes.content.trim() : '';
                
                if (resultText && resultText.length > 10) {
                    finalPrompt = resultText;
                    console.log(`[GOTSORA DIRECTOR] Prompt Expandido a: "${finalPrompt}"`);
                    
                    // Almacenamos en memoria global (Máximo 10 interacciones para no saturar tokens)
                    global.soraDirectorMemory.push(`User pidió: ${req.body.prompt} -> Director generó: ${finalPrompt}`);
                    if (global.soraDirectorMemory.length > 10) global.soraDirectorMemory.shift();
                }
            } catch (aiError) {
                console.error("[GOTSORA DIRECTOR] Fallo al contactar a Gemini. Usando prompt original.", aiError.message);
            }
        }
        
        req.body.prompt = finalPrompt;

        // Inyección de PyTorch
        const response = await fetch('http://127.0.0.1:5000/sora-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        
        // Agregamos feedback sutil
        if(data.success && finalPrompt !== req.body.prompt) {
             data.msg += " (El Director expandió tu Prompt con Gemini).";
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: 'Master Node Python Offline o Inaccesible.' });
    }
});

app.get('/api/sora-history', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://127.0.0.1:5000/sora-history');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: 'Memoria Histórica Python Offline.' });
    }
});

app.post('/api/sora-restore', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://127.0.0.1:5000/sora-restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: 'Python Offline.' });
    }
});

// Servir los Assets Multimedia de Video estáticamente en el mismo origen (Node.js)
// Evita el error de CORS/CORB que causaba el redirect 302 hacia Python en el reproductor de React.
app.use('/api/sora/media', express.static('E:/GodzillaSora_Outputs', { maxAge: '1y', immutable: true }));
app.use('/api/sora/media', express.static(path.join(__dirname, '..', 'outputs'), { maxAge: '1y', immutable: true }));
app.use('/api/studio/approved', express.static('E:/Godzilla_Studio_Cache/ApprovedVideos', { maxAge: '1y', immutable: true }));

app.get('/api/sora/proxy-veo', async (req, res) => {
    try {
        const { uri } = req.query;
        if (!uri) return res.status(400).send('No URI');
        const fetch = (await import('node-fetch')).default; // Use native or node-fetch for compatibility
        const dlRes = await fetch(`${uri}&key=${process.env.GEMINI_API_KEY}`);
        if (!dlRes.ok) return res.status(dlRes.status).send('Video fetch failed from Google API');
        
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for frontend
        
        if (dlRes.body.pipe) {
            dlRes.body.pipe(res); // Node-fetch usa Node Readable stream
        } else {
            Readable.fromWeb(dlRes.body).pipe(res); // Native fetch usa Web stream
        }
    } catch (e) {
        console.error('Proxy Error:', e);
        res.status(500).send('Proxy streaming error');
    }
});


// Servir archivos subidos como estáticos en /media/* (y también /api/media/ para compatibilidad con Vite)
// Cloudflare CDN Cache: 1h para estabilizar conexiones recurrentes simultaneas
// Cross-Origin-Resource-Policy: cross-origin → permite carga de imágenes/GIFs cross-origin (godzillaconsulting.ai → bot.godzillaconsulting.ai)
const staticMediaOptions = {
    maxAge: '1h',
    setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
};
app.use('/media', express.static(path.join(__dirname, 'uploads'), staticMediaOptions));
app.use('/api/media', express.static(path.join(__dirname, 'uploads'), staticMediaOptions));
app.use('/api/api/media', express.static(path.join(__dirname, 'uploads'), staticMediaOptions));
// Servir los videos generados por MediaWorker desde el directorio de caché de render
const RENDER_OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || 'E:/Godzilla_Studio_Cache/outputs';
app.use('/outputs', express.static(RENDER_OUTPUT_DIR, { ...staticMediaOptions, maxAge: '1h' }));
app.use('/api/outputs', express.static(RENDER_OUTPUT_DIR, { ...staticMediaOptions, maxAge: '1h' }));
// Fallback al directorio local del proyecto por compatibilidad
app.use('/outputs', express.static(path.join(__dirname, '..', 'outputs'), staticMediaOptions));
app.use('/api/outputs', express.static(path.join(__dirname, '..', 'outputs'), staticMediaOptions));

// Configuración para servir el Front-End compilado (React/Vite)
// Esto independiza totalmente a Godzilla de Vercel (Host Autónomo)
const distPath = path.join(__dirname, '..', 'dist');

// Habilitar compresión Gzip/Brotli globalmente para reducir tamaño de payloads
app.use(compression());

// Servir la carpeta dist con caché súper agresivo para assets de React (Vite usa hashes)
app.use(express.static(distPath, {
    setHeaders: (res, reqPath) => {
        if (reqPath.includes('/assets/')) {
            // Assets cacheados por 1 año en el navegador del cliente
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (reqPath.endsWith('.html')) {
            // El index.html NUNCA debe cachearse para que los despliegues impacten de inmediato
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        }
    }
}));

// Endpoint de prueba para estado backend
app.get('/api', (req, res) => res.send('Godzilla API Activa 🦖'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// Endpoint para traer las citas al CM Calendar
app.get('/api/citas', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM citas ORDER BY fecha DESC, hora DESC");
        res.json({ success: true, citas: result.rows });
    } catch (error) {
        console.error('[API Citas] Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch citas', details: error.message });
    }
});

// Diagnóstico de variables de entorno (sin exponer valores)
app.get('/api/env-check', (req, res) => {
    const vars = ['GEMINI_API_KEY','PAGE_ACCESS_TOKEN','WP_ACCESS_TOKEN','MY_VERIFY_TOKEN',
                  'GOOGLE_CALENDAR_ID','GOOGLE_CLIENT_EMAIL','GOOGLE_PRIVATE_KEY','DATABASE_URL'];
    const result = {};
    for (const v of vars) {
        result[v] = process.env[v] ? `✅ (${process.env[v].length} chars)` : '❌ FALTANTE';
    }
    res.json({ env: result, node_env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// 🔬 Diagnóstico de Google Calendar (temporal)
app.get('/api/test-calendar', async (req, res) => {
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const rawB64 = process.env.GOOGLE_PRIVATE_KEY_B64 || '';
    let decodedB64 = '';
    try { decodedB64 = rawB64 ? Buffer.from(rawB64, 'base64').toString('utf8') : ''; } catch {}

    const keyDiag = {
        // Clave raw
        raw_length: rawKey.length,
        raw_first30: JSON.stringify(rawKey.substring(0, 30)),
        raw_startsCorrect: rawKey.trimStart().startsWith('-----BEGIN'),
        // Clave B64
        b64_present: rawB64.length > 0,
        b64_length: rawB64.length,
        b64_decoded_len: decodedB64.length,
        b64_decoded_starts: JSON.stringify(decodedB64.substring(0, 30)),
        b64_decoded_valid: decodedB64.trimStart().startsWith('-----BEGIN'),
    };
    try {
        const { agendarEnGoogleCalendar } = await import('./services/calendarService.js');
        const result = await agendarEnGoogleCalendar({
            nombre: 'Test Diagnostico', correo: 'diag@test.com', telefono: '6560000000',
            servicio: 'Prueba', fecha: '2026-03-31', hora: '09:00', notas: 'Test'
        });
        res.json({ success: true, eventId: result.id, link: result.htmlLink, keyDiag });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, code: err.code, keyDiag });
    }
});

// Catch-All (React Router): Todo lo que no sea API o archivos estáticos
// será redirigido al Front-End sin pedirselo a Vercel.
app.get('*', (req, res) => {
    // Excluir errores de rutas API internas que no existan para que no rompa JSON apps
    if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/outputs')) {
        return res.status(404).json({ error: 'Endpoint no encontrado' });
    }
    // Servir la vista de Diseño / Admin Panels / Landing Pages desde el PC!
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.sendFile(path.join(distPath, 'index.html'));
});

// Global Error Handler (Prevents crashes like SyntaxError from body-parser)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'JSON malformado' });
    }
    console.error('[GLOBAL ERROR HANDLER]', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ==========================================
// 3. INICIO DEL SERVIDOR (Solo local)
// ==========================================
if (!process.env.VERCEL) {
    function startServer(retries = 3) {
        const server = app.listen(port);

        server.on('listening', () => {
            console.log(`🚀 Servidor backend encendido en el puerto ${port}`);
            console.log(`🔒 Dominio frontend autorizado: ${process.env.FRONTEND_URL}`);
            server.keepAliveTimeout = 65000;
            server.headersTimeout = 66000;
            cronScheduler.start(60_000);
            import('./workers/mediaWorker.js').catch(err => console.error('[MediaWorker] Error al importar:', err));
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && retries > 0) {
                console.warn(`[Server] ⚠️ Puerto ${port} ocupado. Liberando con taskkill y reintentando en 4s (${retries} intentos)...`);
                // Matar directamente cualquier proceso en el puerto usando netstat + taskkill
                exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (e, stdout) => {
                    const lines = stdout.trim().split('\n').filter(Boolean);
                    const pids = new Set();
                    lines.forEach(line => {
                        const parts = line.trim().split(/\s+/);
                        const pid = parts[parts.length - 1];
                        if (pid && pid !== '0') pids.add(pid);
                    });
                    const killAll = Array.from(pids).map(pid =>
                        new Promise(res => exec(`taskkill /PID ${pid} /F`, () => res()))
                    );
                    Promise.all(killAll).then(() => {
                        console.log(`[Server] 🔓 Puerto ${port} liberado. Reintentando en 4s...`);
                        setTimeout(() => startServer(retries - 1), 4000);
                    });
                });
            } else {
                console.error('[Server] Error fatal al iniciar:', err.message);
                process.exit(1);
            }
        });
    }

    startServer();
}

// Exportar para Vercel
export default app;
