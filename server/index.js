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

// Parsea el Body como JSON (si no haces esto req.body es undefined)
app.use(express.json());

// ==========================================
// 2. RUTAS DE LA API
// ==========================================

// Montamos el limitador y el router en el path `/api/leads`
app.use('/api/leads', apiLimiter, leadsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);

// Endpoint de prueba ("Ping/Healthcheck") para ver si el server está vivo
app.get('/', (req, res) => res.send('Godzilla Backend Activo 🦖'));

// ==========================================
// 3. INICIO DEL SERVIDOR
// ==========================================
app.listen(port, () => {
    console.log(`🚀 Servidor backend encendido en el puerto ${port}`);
    console.log(`🔒 Dominio frontend autorizado: ${process.env.FRONTEND_URL}`);
});
