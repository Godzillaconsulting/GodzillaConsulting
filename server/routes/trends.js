import express from 'express';
import { getTrends } from '../controllers/trendsController.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', requireAdmin, getTrends);

export default router;
