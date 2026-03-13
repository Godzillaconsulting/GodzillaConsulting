import fs from 'fs';
import path from 'path';

// ==========================================
// 🛡️ ESCUDO ANTI-CAÍDAS (DEVOPS 24/7)
// ==========================================
// Previene que el bot o el servidor mueran si hay un error no contemplado.
const logErrorToFile = (type, error) => {
    try {
        if (process.env.VERCEL) return; // Vercel Cloud es Read-Only
        const errorMsg = `\n[${new Date().toISOString()}] [${type}] ${error.stack || error}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'error.log'), errorMsg);
        console.log(`🛡️ [DEVOPS] Error crítico atrapado (${type}). El bot continuará operando.`);
    } catch (e) {
        console.error("No se pudo escribir el error en el log:", e);
    }
};

process.on('uncaughtException', (err) => {
    logErrorToFile('Uncaught Exception', err);
});

process.on('unhandledRejection', (reason, promise) => {
    logErrorToFile('Unhandled Rejection', reason);
});
// ==========================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import leadsRoutes from './routes/leads.js';
import contactRoutes from './routes/contact.js';
import { connectDB } from './config/db.js';

// Inicializar variables de entorno (.env)
dotenv.config();

// Inicializar conexión a PostgreSQL (Neon)
connectDB();

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARES DE SEGURIDAD
// ==========================================

app.use(helmet());

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://godzillaconsulting.ai',
    'https://www.godzillaconsulting.ai'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
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
    max: process.env.NODE_ENV === 'development' ? 1000 : 5,
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

import chatRoutes from './routes/chat.js';
import webhookRoutes from './routes/webhook.js';

app.use('/api/leads', apiLimiter, leadsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);

app.get('/', (req, res) => res.send('Godzilla Backend Activo 🦖'));
app.get('/api', (req, res) => res.send('Godzilla API Activa 🦖'));


// ==========================================
// 3. INICIO DEL SERVIDOR 
// ==========================================

if (!process.env.VERCEL) {
    app.listen(port, async () => {
        console.log(`🚀 Godzilla Bot Activo en Puerto ${port}`);
        console.log(`🤖 Gestionado por PM2 / Node | Entorno: ${process.env.NODE_ENV}`);
        
        try {
            // Importación Dinámica: Truqueamos al Bundler de Vercel para que no descargue Puppeteer en la Nube, ya que excede los 50MB.
            const waFile = './whatsappBot.js';
            const botModule = await import(waFile);
            botModule.initWhatsAppBot();
        } catch (e) {
            console.error("Fallo al iniciar módulo de WhatsApp Local", e);
        }
    });
}

// Exportar para Vercel Serverless
export default app;
