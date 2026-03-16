import express from 'express';
import { validateEmailRequest } from '../middlewares/validateEmail.js';
import { processLead } from '../controllers/leadController.js';

const router = express.Router();

/**
 * -------------------------------------------
 * ENDPOINT: POST /api/leads
 * -------------------------------------------
 * RECIBE:
 * {
 *   "email": "cliente@ejemplo.com",
 *   "lead_magnet_slug": "prompts-ia-marketing"
 * }
 */
// Insertamos nuestro middleware `validateEmailRequest` ANTES de llegar al controlador `processLead`
router.post('/', validateEmailRequest, processLead);

export default router;
