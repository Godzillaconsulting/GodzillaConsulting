import express from 'express';
import {
    subscribe,
    unsubscribe,
    getSubscribers,
    sendNewsletter,
    getHistory,
} from '../controllers/newsletterController.js';

const router = express.Router();

// Públicas
router.post('/subscribe',     subscribe);
router.get ('/unsubscribe',   unsubscribe);

// Privadas (solo desde admin — autenticadas por JWT en el frontend)
router.get ('/subscribers',   getSubscribers);
router.post('/send',          sendNewsletter);
router.get ('/history',       getHistory);

export default router;
