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
import { connectDB } from './config/db.js';

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

// Helmet: Añade headers de seguridad. Desactivamos CSP para no bloquear a Sanity ni archivos estáticos de React.
app.use(helmet({ contentSecurityPolicy: false }));

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

// Rate limit para auth (login): 30 intentos por 15 min
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 30,
    message: { error: 'Demasiados intentos de login: espera 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Parsea el Body como JSON (si no haces esto req.body es undefined)
app.use(express.json());

// ==========================================
// 2. RUTAS DE LA API
// ==========================================

import chatRoutes from './routes/chat.js';
import nodesRoutes from './routes/nodes.js';
import webhookRoutes from './routes/webhook.js';
import authRoutes from './routes/auth.js';

// Montamos el limitador y el router en el path `/api/leads`
app.use('/api/leads', apiLimiter, leadsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/webhook', webhookRoutes);
import newsletterRoutes from './routes/newsletter.js';
import leadMagnetsRoutes from './routes/leadMagnets.js';
import analyticsRoutes from './routes/analytics.js';

// Auth limiter SOLO para login (evita brute-force).
// /api/auth/verify NO lleva rate limit — es solo validación JWT, sin DB.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/lead-magnets', leadMagnetsRoutes);
app.use('/api/tiktok', tiktokRoutes);
app.use('/api/analytics', analyticsRoutes);


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

    // 🤖 Inicializar WhatsApp Bot (whatsapp-web.js) — Solo modo servidor local
    // Usa Puppeteer/Chrome para mantener sesión aktiva 24/7
    import('./whatsappBot.js').then(({ initWhatsAppBot }) => {
        initWhatsAppBot();
        console.log('📱 [WhatsApp] Bot iniciado. Escanea QR en http://localhost:3002/qr');
    }).catch(err => {
        console.error('❌ [WhatsApp] Error al iniciar bot:', err.message);
    });
}

// Exportar para Vercel
export default app;
