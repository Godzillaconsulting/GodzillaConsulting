import express from 'express';
import { generateRenderJob, checkRenderStatus } from '../controllers/aiStudioController.js';
import { authenticateToken } from '../middleware/adminAuth.js';

const router = express.Router();

// Aplica el token de autenticación para que un usuario curioso sin sesión de backoffice no pueda vaciar todo el saldo en API de Kling.
router.post('/generate', authenticateToken, generateRenderJob);
router.get('/status/:taskId', authenticateToken, checkRenderStatus);

export default router;
