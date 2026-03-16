// ==========================================
// api/server.js — Punto de entrada para Vercel Serverless
// ==========================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import leadsRoutes from './routes/leads.js';
import contactRoutes from './routes/contact.js';
import chatRoutes from './routes/chat.js';
import webhookRoutes from './routes/webhook.js';

// Inicializar variables de entorno (.env)
dotenv.config();

// Inicializar conexión a PostgreSQL (Neon)
connectDB();

const app = express();
app.set('trust proxy', 1);

// ==========================================
// 1. MIDDLEWARES DE SEGURIDAD Y FIREWALL
// ==========================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://godzillaconsulting.ai"],
            connectSrc: ["'self'", "https://godzillaconsulting.ai"],
            imgSrc: ["'self'", "data:", "https://*"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://godzillaconsulting.ai',
    'https://www.godzillaconsulting.ai'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || (origin && origin.includes('vercel.app'))) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS: Origen no permitido.'));
        }
    },
    methods: ['POST', 'GET', 'OPTIONS'],
    credentials: true
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    message: { error: 'Demasiadas solicitudes: intenta nuevamente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: { error: 'Por favor, espera unos minutos antes de enviar más mensajes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const webhookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.json());

// ==========================================
// 2. RUTAS DE LA API
// ==========================================

app.use('/api/leads', apiLimiter, leadsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);

app.get('/', (req, res) => res.send('Godzilla Backend Activo 🦖'));
app.get('/api', (req, res) => res.send('Godzilla API Activa 🦖'));

export default app;

