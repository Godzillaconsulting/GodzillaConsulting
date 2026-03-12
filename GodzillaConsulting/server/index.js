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
console.log('[DEBUG] .env cargado. GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Presente' : 'FALTANTE');
console.log('[DEBUG] MY_VERIFY_TOKEN:', process.env.MY_VERIFY_TOKEN ? 'Presente' : 'FALTANTE ⚠️');
console.log('[DEBUG] PAGE_ACCESS_TOKEN:', process.env.PAGE_ACCESS_TOKEN ? 'Presente' : 'FALTANTE ⚠️');

// Inicializar conexión a PostgreSQL (Neon)
connectDB();

const app = express();
// Confiar en el proxy inverso de Vercel (Requerido por express-rate-limit)
app.set('trust proxy', 1);
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
    'https://www.godzillaconsulting.ai'
];

app.use(cors({
    origin: function (origin, callback) {
        // En POSTMAN/local origin puede ser undefined. 
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS: Origen no permitido.'));
        }
    },
    methods: ['POST', 'GET', 'OPTIONS'],
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

// Rate Limit especial para Webhooks de Meta (envía muchas requests automatizadas)
const webhookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});

// Parsea el Body como JSON (si no haces esto req.body es undefined)
app.use(express.json());

// ==========================================
// 2. RUTAS DE LA API
// ==========================================

import chatRoutes from './routes/chat.js';
import webhookRoutes from './routes/webhook.js';

// Montamos el limitador y el router en el path `/api/leads`
app.use('/api/leads', apiLimiter, leadsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/chat', apiLimiter, chatRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes); // Meta necesita un límite alto

// Endpoint de prueba ("Ping/Healthcheck") para ver si el server está vivo
app.get('/', (req, res) => res.send('Godzilla Backend Activo 🦖'));
app.get('/api', (req, res) => res.send('Godzilla API Activa 🦖'));


// ==========================================
// 3. INICIO DEL SERVIDOR (Solo local)
// ==========================================
import { initWhatsAppBot } from './whatsappBot.js';

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`🚀 Godzilla Bot Activo en Puerto ${port}`);
        console.log(`🔒 Dominio frontend autorizado: ${process.env.FRONTEND_URL}`);
        console.log(`🤖 Gestionado por PM2 (si aplica) | Entorno: ${process.env.NODE_ENV}`);
        
        // Iniciar instancia local de WhatsApp
        initWhatsAppBot();
    });
}

// Exportar para Vercel
export default app;
