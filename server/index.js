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

// Helmet: Añade headers de seguridad (previene ataques XSS y Clickjacking básicos)
app.use(helmet());

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
// Auth limiter SOLO para login (evita brute-force).
// /api/auth/verify NO lleva rate limit — es solo validación JWT, sin DB.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);

// Servir archivos subidos como estáticos en /media/*
app.use('/media', express.static(path.join(__dirname, 'uploads')));

// Endpoint de prueba ("Ping/Healthcheck") para ver si el server está vivo
app.get('/', (req, res) => res.send('Godzilla Backend Activo 🦖'));
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
    // Diagnóstico previo de la llave
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const keyDiag = {
        length: rawKey.length,
        first50: JSON.stringify(rawKey.substring(0, 50)),
        last50: JSON.stringify(rawKey.substring(rawKey.length - 50)),
        hasLiteralN: rawKey.includes('\\n'),
        hasRealN: rawKey.includes('\n'),
        hasCR: rawKey.includes('\r'),
        startsCorrect: rawKey.trimStart().startsWith('-----BEGIN'),
    };
    try {
        const { agendarEnGoogleCalendar } = await import('./services/calendarService.js');
        const result = await agendarEnGoogleCalendar({
            nombre: 'Test Diagnostico', correo: 'diag@test.com', telefono: '6560000000',
            servicio: 'Prueba', fecha: '2026-03-30', hora: '09:00', notas: 'Test diagnóstico'
        });
        res.json({ success: true, eventId: result.id, link: result.htmlLink, keyDiag });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, code: err.code, keyDiag });
    }
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
