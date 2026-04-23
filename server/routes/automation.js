import express from 'express';
import pool from '../config/db.js';
import { verifyAdminToken } from '../middleware/adminAuth.js';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const router = express.Router();

// GET /api/automation/flow - Obtener el layout guardado
router.get('/flow', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT nodes, edges FROM automation_flow WHERE id = 1');
        if (result.rows.length > 0) {
            res.json({ success: true, nodes: result.rows[0].nodes, edges: result.rows[0].edges });
        } else {
            res.json({ success: true, nodes: [], edges: [] });
        }
    } catch (err) {
        console.error('[Automation] GET /flow Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/automation/flow - Guardar el layout
router.post('/flow', verifyAdminToken, async (req, res) => {
    try {
        const { nodes, edges } = req.body;
        if (!nodes || !edges) {
            return res.status(400).json({ success: false, error: 'nodes y edges requeridos' });
        }

        await pool.query(
            `INSERT INTO automation_flow (id, nodes, edges, updated_at) 
             VALUES (1, $1, $2, NOW()) 
             ON CONFLICT (id) DO UPDATE SET nodes = $1, edges = $2, updated_at = NOW()`,
            [JSON.stringify(nodes), JSON.stringify(edges)]
        );

        res.json({ success: true, message: 'Flujo guardado con éxito' });
    } catch (err) {
        console.error('[Automation] POST /flow Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/automation/status - Obtener el status de PM2
router.get('/status', verifyAdminToken, async (req, res) => {
    try {
        // Ejecutamos pm2 jlist para obtener un JSON purificado de los procesos
        // windowsHide: true evita que salten ventanas de CMD negras cada 5 segundos en Windows
        const { stdout } = await execPromise('npx pm2 jlist', { windowsHide: true });
        const processes = JSON.parse(stdout);
        
        // Mapear los nombres de procesos activos
        const activeProcesses = processes.map(p => ({
            name: p.name,
            status: p.pm2_env.status, // "online", "stopped", "errored"
            memory: p.monit ? p.monit.memory : 0,
            cpu: p.monit ? p.monit.cpu : 0
        }));

        res.json({ success: true, pm2: activeProcesses });
    } catch (err) {
        console.error('[Automation] GET /status Error:', err.message);
        res.status(500).json({ success: false, error: 'Fallo al contactar PM2', details: err.message });
    }
});

// POST /api/automation/restart - Reiniciar un proceso de PM2
router.post('/restart', verifyAdminToken, async (req, res) => {
    try {
        const { processName } = req.body;
        if (!processName) {
            return res.status(400).json({ success: false, error: 'processName requerido' });
        }

        // Validación básica de seguridad para evitar inyección de comandos
        if (!/^[a-zA-Z0-9_-]+$/.test(processName)) {
            return res.status(400).json({ success: false, error: 'Nombre de proceso inválido' });
        }

        console.log(`[Automation] Solicitando reinicio del proceso PM2: ${processName}`);
        
        // Ejecutamos pm2 restart
        const { stdout, stderr } = await execPromise(`npx pm2 restart ${processName}`, { windowsHide: true });
        
        if (stderr && stderr.toLowerCase().includes('error')) {
            console.error('[Automation] PM2 stderr:', stderr);
        }

        res.json({ success: true, message: `Proceso ${processName} reiniciado con éxito.` });
    } catch (err) {
        console.error('[Automation] POST /restart Error:', err.message);
        res.status(500).json({ success: false, error: 'Fallo al reiniciar el proceso PM2', details: err.message });
    }
});

export default router;
