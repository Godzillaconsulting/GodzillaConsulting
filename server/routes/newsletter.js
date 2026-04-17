import express from 'express';
import {
    subscribe,
    unsubscribe,
    getSubscribers,
    sendNewsletter,
    getHistory,
} from '../controllers/newsletterController.js';

import { generateAndSendAutoNewsletter } from '../services/newsletterGenerator.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Públicas
router.post('/subscribe',     subscribe);
router.get ('/unsubscribe',   unsubscribe);

// Privadas (protegidas por JWT en Backend)
router.get ('/subscribers',   requireAdmin, getSubscribers);
router.post('/send',          requireAdmin, sendNewsletter);
router.get ('/history',       requireAdmin, getHistory);
router.post('/generate-draft', requireAdmin, async (req, res) => {
    try {
        const feedback = req.body.feedback || null;
        const result = await generateAndSendAutoNewsletter(feedback);
        res.json({ success: true, ...result });
    } catch (e) {
        console.error("Generator Error", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
