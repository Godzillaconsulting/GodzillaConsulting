import express from 'express';
import {
    subscribe,
    unsubscribe,
    getSubscribers,
    sendNewsletter,
    getHistory,
    deleteNewsletter,
    deleteSubscriber,
} from '../controllers/newsletterController.js';

import { generateAndSendAutoNewsletter } from '../services/newsletterGenerator.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Públicas
router.post('/subscribe',     subscribe);
router.get ('/unsubscribe',   unsubscribe);

// Privadas (protegidas por JWT en Backend)
router.get ('/subscribers',   requireAdmin, getSubscribers);
router.delete('/subscribers/:id', requireAdmin, deleteSubscriber);
router.post('/send',          requireAdmin, sendNewsletter);
router.get ('/history',       requireAdmin, getHistory);
router.delete('/delete/:id',  requireAdmin, deleteNewsletter);
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
