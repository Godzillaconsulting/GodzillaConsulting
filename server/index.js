import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import leadsRoutes from './routes/leads.js';
import contactRoutes from './routes/contact.js';
import mediaRoutes from './routes/media.js';
import tiktokRoutes from './routes/tiktok.js';
import socialRoutes from './routes/social.js';
import resourcesRoutes from './routes/resources.js';
import { connectDB } from './config/db.js';

import chatRoutes from './routes/chat.js';
import nodesRoutes from './routes/nodes.js';
import webhookRoutes from './routes/webhook.js';
import authRoutes from './routes/auth.js';
import adminMigrationRoutes from './routes/adminMigration.js';
import newsletterRoutes from './routes/newsletter.js';
import leadMagnetsRoutes from './routes/leadMagnets.js';
import analyticsRoutes from './routes/analytics.js';
import usersRoutes from './routes/users.js';
import trendsRoutes from './routes/trends.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


// Inicializar variables de entorno (.env)
dotenv.config();
console.log('[DEBUG] .env cargado. GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Presente' : 'FALTANTE');

// Inicializar conexión a PostgreSQL (Neon)
connectDB();

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARES DE SEGURIDAD
// ==========================================

// Helmet: Headers de seguridad HTTP — protege clickjacking, sniffing, XSS
app.use(helmet({
    contentSecurityPolicy: false, // CSP custom en prod si se necesita
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,      // Previene MIME sniffing
    xFrameOptions: { action: 'DENY' }, // Previene clickjacking
}));

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
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app') || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS: Origen no permitido.'));
        }
    },
    methods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    credentials: true
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
app.use(express.json());

// ==========================================
// 2. RUTAS DE LA API
// ==========================================

// Montamos el limitador y el router en el path `/api/leads`
app.use('/api/leads', apiLimiter, leadsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/webhook', webhookRoutes);

// Auth limiter SOLO para login (evita brute-force).
// /api/auth/verify NO lleva rate limit — es solo validación JWT, sin DB.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
// Aplicamos limitadores de Descargas y Analíticas Públicas
app.use('/api/media', mediaRoutes);
app.use('/api/newsletter', downloadSubLimiter, newsletterRoutes);
app.use('/api/lead-magnets', downloadSubLimiter, leadMagnetsRoutes);
app.use('/api/resources', downloadSubLimiter, resourcesRoutes);
app.use('/api/tiktok', tiktokRoutes);
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/admin', adminMigrationRoutes); // Migración y audit — protegido por token


// Servir archivos subidos como estáticos en /media/*
app.use('/media', express.static(path.join(__dirname, 'uploads')));

// Configuración para servir el Front-End compilado (React/Vite)
// Esto independiza totalmente a Godzilla de Vercel (Host Autónomo)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Endpoint de prueba para estado backend
app.get('/api', (req, res) => res.send('Godzilla API Activa 🦖'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

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
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
        return res.status(404).json({ error: 'Endpoint no encontrado' });
    }
    // Servir la vista de Diseño / Admin Panels / Landing Pages desde el PC!
    res.sendFile(path.join(distPath, 'index.html'));
});


// ==========================================
// 3. INICIO DEL SERVIDOR (Solo local)
// ==========================================
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`🚀 Servidor backend encendido en el puerto ${port}`);
        console.log(`🔒 Dominio frontend autorizado: ${process.env.FRONTEND_URL}`);
    });

    // 🤖 Inicializar WhatsApp Bot (whatsapp-web.js) — Solo modo local/PM2
    // Usa Puppeteer/Chrome para mantener sesión activa 24/7
    // [IMPORTANTE] Escondido de @vercel/nft para evitar empaquetar Puppeteer y exceder el límite de 250MB
    const botPath = './whatsappBot.js';
    import(/* @vite-ignore */ /* webpackIgnore: true */ botPath).then(({ initWhatsAppBot }) => {
        initWhatsAppBot();
        console.log('📱 [WhatsApp] Bot iniciado. Escanea QR en http://localhost:3002/qr');
    }).catch(err => {
        console.error('❌ [WhatsApp] Error al iniciar bot:', err.message);
    });
}

// Exportar para Vercel
export default app;
