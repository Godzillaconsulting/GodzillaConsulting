import express from 'express';
import { verifyAdminToken, requireSuperAdmin } from '../middleware/adminAuth.js';
import { getWafStats } from '../middleware/wafService.js';

const router = express.Router();

// Ruta para obtener logs y stats del WAF en vivo
// Requiere autenticación de Administrador
router.get('/live', verifyAdminToken, (req, res) => {
    try {
        const data = getWafStats();
        res.json({ success: true, data });
    } catch (error) {
        console.error("WAF Fetch Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

export default router;
