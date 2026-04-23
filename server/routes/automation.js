import express from 'express';
import pool from '../config/db.js';
import { verifyAdminToken } from '../middleware/adminAuth.js';
import { exec } from 'child_process';
import util from 'util';
import AutomationEngine from '../services/automationEngine.js';

const execPromise = util.promisify(exec);
const router = express.Router();

// ─── DB Bootstrap ────────────────────────────────────────────────────────────
// Asegura que las tablas existan con las columnas correctas
async function ensureSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS automation_flow (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) DEFAULT 'Sistema Central',
                nodes JSONB DEFAULT '[]'::jsonb,
                edges JSONB DEFAULT '[]'::jsonb,
                created_by VARCHAR(100) DEFAULT 'jareg',
                health VARCHAR(20) DEFAULT 'online',
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        // Agregar columnas si no existen (idempotente)
        await pool.query(`ALTER TABLE automation_flow ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Sistema Central'`);
        await pool.query(`ALTER TABLE automation_flow ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'jareg'`);
        await pool.query(`ALTER TABLE automation_flow ADD COLUMN IF NOT EXISTS health VARCHAR(20) DEFAULT 'online'`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS flow_change_requests (
                id SERIAL PRIMARY KEY,
                flow_id INTEGER NOT NULL,
                requested_by VARCHAR(100) NOT NULL,
                reason TEXT NOT NULL,
                idea TEXT NOT NULL,
                nodes_snapshot JSONB,
                edges_snapshot JSONB,
                status VARCHAR(20) DEFAULT 'pending',
                reviewed_by VARCHAR(100),
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch(e) {
        console.error('[Automation] Schema bootstrap error:', e.message);
    }
}
ensureSchema();

// ─── GET /api/automation/flows ─ Lista todos los flujos (para Galaxy View) ───
router.get('/flows', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, created_by, health, updated_at,
                    jsonb_array_length(nodes) AS node_count,
                    jsonb_array_length(edges) AS edge_count
             FROM automation_flow ORDER BY id ASC`
        );
        res.json({ success: true, flows: result.rows });
    } catch (err) {
        console.error('[Automation] GET /flows Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/automation/flow?id=1 ─ Obtener un flujo específico ─────────────
router.get('/flow', verifyAdminToken, async (req, res) => {
    try {
        const flowId = parseInt(req.query.id) || 1;
        const result = await pool.query('SELECT * FROM automation_flow WHERE id = $1', [flowId]);
        if (result.rows.length > 0) {
            res.json({ success: true, ...result.rows[0] });
        } else {
            res.json({ success: true, id: flowId, name: 'Sin nombre', nodes: [], edges: [] });
        }
    } catch (err) {
        console.error('[Automation] GET /flow Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/automation/flow ─ Guardar flujo (con control de permisos) ─────
router.post('/flow', verifyAdminToken, async (req, res) => {
    try {
        const { nodes, edges, flowId = 1, name } = req.body;
        const username = (req.user?.username || '').toLowerCase();

        // Verificación de permisos: Solo JareG puede guardar el Sistema Central (ID=1)
        if (parseInt(flowId) === 1 && username !== 'jareg') {
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'Solo JareG puede modificar el Sistema Central. Tu solicitud fue registrada.'
            });
        }

        const finalName = name || (flowId === 1 ? 'Sistema Central' : 'Neurona sin nombre');

        await pool.query(
            `INSERT INTO automation_flow (id, name, nodes, edges, created_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET name = $2, nodes = $3, edges = $4, updated_at = NOW()`,
            [flowId, finalName, JSON.stringify(nodes), JSON.stringify(edges), username]
        );

        res.json({ success: true, message: 'Flujo guardado con éxito', flowId });
    } catch (err) {
        console.error('[Automation] POST /flow Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/automation/flow/new ─ Crear nueva Neurona ─────────────────────
router.post('/flow/new', verifyAdminToken, async (req, res) => {
    try {
        const { name, nodes = [], edges = [] } = req.body;
        const username = (req.user?.username || 'admin').toLowerCase();

        const result = await pool.query(
            `INSERT INTO automation_flow (name, nodes, edges, created_by, updated_at)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [name || 'Nueva Neurona', JSON.stringify(nodes), JSON.stringify(edges), username]
        );

        res.json({ success: true, flowId: result.rows[0].id, message: 'Nueva Neurona creada' });
    } catch (err) {
        console.error('[Automation] POST /flow/new Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── DELETE /api/automation/flow/:id ─ Eliminar una Neurona ──────────────────
router.delete('/flow/:id', verifyAdminToken, async (req, res) => {
    try {
        const flowId = parseInt(req.params.id);
        const username = (req.user?.username || '').toLowerCase();

        if (flowId === 1) {
            return res.status(403).json({ success: false, error: 'El Sistema Central no se puede eliminar.' });
        }
        if (username !== 'jareg') {
            return res.status(403).json({ success: false, error: 'Solo JareG puede eliminar Neuronas.' });
        }

        await pool.query('DELETE FROM automation_flow WHERE id = $1', [flowId]);
        res.json({ success: true, message: `Neurona ${flowId} eliminada.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/automation/change-request ─ Solicitar cambio (no-JareG) ───────
router.post('/change-request', verifyAdminToken, async (req, res) => {
    try {
        const { flowId, reason, idea, nodes, edges } = req.body;
        const username = (req.user?.username || 'desconocido').toLowerCase();

        if (!reason || !idea) {
            return res.status(400).json({ success: false, error: 'Razón e idea son requeridas.' });
        }

        await pool.query(
            `INSERT INTO flow_change_requests (flow_id, requested_by, reason, idea, nodes_snapshot, edges_snapshot)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [flowId || 1, username, reason, idea, JSON.stringify(nodes || []), JSON.stringify(edges || [])]
        );

        res.json({ success: true, message: 'Solicitud enviada a JareG para revisión.' });
    } catch (err) {
        console.error('[Automation] POST /change-request Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/automation/change-requests ─ Ver solicitudes pendientes ─────────
router.get('/change-requests', verifyAdminToken, async (req, res) => {
    try {
        const username = (req.user?.username || '').toLowerCase();
        if (username !== 'jareg') {
            return res.status(403).json({ success: false, error: 'Solo JareG puede ver las solicitudes.' });
        }
        const result = await pool.query(
            `SELECT * FROM flow_change_requests WHERE status = 'pending' ORDER BY created_at DESC`
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/automation/change-requests/:id/approve ─ Aprobar solicitud ────
router.post('/change-requests/:id/approve', verifyAdminToken, async (req, res) => {
    try {
        const username = (req.user?.username || '').toLowerCase();
        if (username !== 'jareg') {
            return res.status(403).json({ success: false, error: 'Solo JareG puede aprobar solicitudes.' });
        }

        const reqResult = await pool.query(`SELECT * FROM flow_change_requests WHERE id = $1`, [req.params.id]);
        if (reqResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Solicitud no encontrada.' });

        const cr = reqResult.rows[0];
        // Aplicar los nodos del snapshot
        await pool.query(
            `UPDATE automation_flow SET nodes = $1, edges = $2, updated_at = NOW() WHERE id = $3`,
            [cr.nodes_snapshot, cr.edges_snapshot, cr.flow_id]
        );
        await pool.query(
            `UPDATE flow_change_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
            [username, req.params.id]
        );

        res.json({ success: true, message: 'Solicitud aprobada y flujo actualizado.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/automation/change-requests/:id/reject ─ Rechazar solicitud ────
router.post('/change-requests/:id/reject', verifyAdminToken, async (req, res) => {
    try {
        const username = (req.user?.username || '').toLowerCase();
        if (username !== 'jareg') return res.status(403).json({ success: false });
        await pool.query(
            `UPDATE flow_change_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
            [username, req.params.id]
        );
        res.json({ success: true, message: 'Solicitud rechazada.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/automation/status ─ Estado PM2 ─────────────────────────────────
router.get('/status', verifyAdminToken, async (req, res) => {
    try {
        const { stdout } = await execPromise('npx pm2 jlist', { windowsHide: true });
        const processes = JSON.parse(stdout);
        const activeProcesses = processes.map(p => ({
            name: p.name,
            status: p.pm2_env.status,
            memory: p.monit ? p.monit.memory : 0,
            cpu: p.monit ? p.monit.cpu : 0
        }));
        res.json({ success: true, pm2: activeProcesses });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Fallo al contactar PM2', details: err.message });
    }
});

// ─── POST /api/automation/trigger ─────────────────────────────────────────────
router.post('/trigger', verifyAdminToken, async (req, res) => {
    try {
        const { sourceTitle, payload } = req.body;
        if (!sourceTitle) return res.status(400).json({ success: false, error: 'sourceTitle requerido' });
        AutomationEngine.triggerFlow(sourceTitle, payload || {});
        res.json({ success: true, message: `Flujo disparado desde "${sourceTitle}".` });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Fallo al disparar flujo', details: err.message });
    }
});

// ─── GET /api/automation/runs ─────────────────────────────────────────────────
router.get('/runs', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, status, source, started_at, finished_at, duration_ms, log
             FROM flow_runs ORDER BY started_at DESC LIMIT 10`
        );
        res.json({ success: true, runs: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/automation/restart ─────────────────────────────────────────────
router.post('/restart', verifyAdminToken, async (req, res) => {
    try {
        const { processName } = req.body;
        if (!processName) return res.status(400).json({ success: false, error: 'processName requerido' });
        if (!/^[a-zA-Z0-9_-]+$/.test(processName)) return res.status(400).json({ success: false, error: 'Nombre inválido' });
        await execPromise(`npx pm2 restart ${processName}`, { windowsHide: true });
        res.json({ success: true, message: `Proceso ${processName} reiniciado.` });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Fallo al reiniciar', details: err.message });
    }
});

export default router;
