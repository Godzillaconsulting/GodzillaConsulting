import express from 'express';
import { getTrends, analyzeTrendVideo } from '../controllers/trendsController.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', requireAdmin, getTrends);
router.post('/analyze', requireAdmin, analyzeTrendVideo);

export default router;
