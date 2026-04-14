import { Router } from 'express';
import { importFromSheets } from '../controllers/sheetsController.js';
import { verifyAdminToken as authenticateToken } from '../middleware/adminAuth.js';

const router = Router();

// GET /api/sheets/import?spreadsheetId=...&range=...
router.get('/import', authenticateToken, importFromSheets);

export default router;
