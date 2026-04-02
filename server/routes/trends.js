import express from 'express';
import { getTrends } from '../controllers/trendsController.js';
import { requireAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

router.get('/', requireAdmin, getTrends);

export default router;
