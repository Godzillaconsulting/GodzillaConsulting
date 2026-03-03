import express from 'express';
import { processContactForm } from '../controllers/contactController.js';

const router = express.Router();

router.post('/', processContactForm);

export default router;
