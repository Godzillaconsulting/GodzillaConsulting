import express from 'express';
import {
    subscribe,
    unsubscribe,
    getSubscribers,
    sendNewsletter,
    getHistory,
} from '../controllers/newsletterController.js';

import { requireAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

// Públicas
router.post('/subscribe',     subscribe);
router.get ('/unsubscribe',   unsubscribe);

// Privadas (protegidas por JWT en Backend)
router.get ('/subscribers',   requireAdmin, getSubscribers);
router.post('/send',          requireAdmin, sendNewsletter);
router.get ('/history',       requireAdmin, getHistory);

export default router;
