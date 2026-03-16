import express from 'express';
import { verifyWebhook, processWebhookMessage } from '../controllers/webhookController.js';

const router = express.Router();

/**
 * @desc    Validate webhook verification request from Meta
 * @route   GET /api/webhook
 * @access  Public (Meta IP ranges)
 */
router.get('/', verifyWebhook);

/**
 * @desc    Receive incoming messages and status 
 * @route   POST /api/webhook
 * @access  Public (Meta IP ranges)
 */
router.post('/', processWebhookMessage);

export default router;
