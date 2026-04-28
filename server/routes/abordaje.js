import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { processAbordaje, getAbordajes } from '../controllers/abordajeController.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Rate limit específico para el formulario de abordaje:
// Máx 10 envíos por IP cada 15 minutos (evita spam)
const abordajeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
    message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware de Jitter: Agrega un retardo aleatorio (500ms - 2000ms) para frenar bots
const jitterMiddleware = (req, res, next) => {
    const delay = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
    setTimeout(next, delay);
};

/**
 * POST /api/abordaje
 * Recibe el formulario de 5 pasos de FormAbordaje.jsx
 * Guarda en tabla abordajes, agenda en Google Calendar,
 * Envía correo y WhatsApp de confirmación a cliente y alertas internas al equipo.
 */
router.post('/', abordajeLimiter, jitterMiddleware, processAbordaje);

/**
 * GET /api/abordaje/leads
 * Recupera los leads encriptados y los desencripta al vuelo para el Panel IT.
 * Requiere ser administrador técnico.
 */
router.get('/leads', requireAdmin, getAbordajes);

export default router;
