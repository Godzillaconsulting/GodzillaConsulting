import pool from '../config/db.js';
import AutomationEngine from './automationEngine.js';

// ══════════════════════════════════════════════════════════════════════════════
//  GODZILLA CRON SCHEDULER — Activa flujos automáticamente 😈
//  Sin dependencias externas. Puro Node.js.
//
//  Cómo funciona:
//   1. Cada 60s escanea TODOS los flujos en automation_flow
//   2. Busca nodos de tipo "Reloj / Cron" con config.cron configurado
//   3. Evalúa si la expresión cron coincide con la hora actual
//   4. Si sí → dispara el AutomationEngine desde ese nodo
//
//  Expresiones cron soportadas:
//   "every_minute"   → cada minuto
//   "every_hour"     → cada hora en punto
//   "every_day_9"    → cada día a las 9:00 AM
//   "every_day_18"   → cada día a las 6:00 PM
//   "every_monday"   → cada lunes
//   "HH:MM"          → hora específica del día (ej: "09:30")
// ══════════════════════════════════════════════════════════════════════════════

class CronScheduler {
    constructor() {
        this.interval = null;
        this.lastFired = new Map(); // nodeId → lastFiredMinute (evita doble disparo)
    }

    // ─── Evaluar si una expresión cron debe dispararse ahora ─────────────────
    shouldFire(cronExpr, nodeId) {
        const now   = new Date();
        const hh    = now.getHours();
        const mm    = now.getMinutes();
        const day   = now.getDay(); // 0=domingo, 1=lunes, ...
        const key   = `${nodeId}_${hh}:${String(mm).padStart(2,'0')}`;

        // Anti-doble-disparo: si ya fijamos este minuto, saltamos
        if (this.lastFired.get(nodeId) === key) return false;

        let fire = false;

        switch (cronExpr) {
            case 'every_minute':
                fire = true;
                break;
            case 'every_hour':
                fire = mm === 0;
                break;
            case 'every_day_9':
                fire = hh === 9 && mm === 0;
                break;
            case 'every_day_12':
                fire = hh === 12 && mm === 0;
                break;
            case 'every_day_18':
                fire = hh === 18 && mm === 0;
                break;
            case 'every_monday':
                fire = day === 1 && hh === 9 && mm === 0;
                break;
            case 'every_friday':
                fire = day === 5 && hh === 9 && mm === 0;
                break;
            default:
                // Formato "HH:MM" → dispara a esa hora exacta
                if (/^\d{1,2}:\d{2}$/.test(cronExpr)) {
                    const [targetH, targetM] = cronExpr.split(':').map(Number);
                    fire = hh === targetH && mm === targetM;
                }
        }

        if (fire) this.lastFired.set(nodeId, key);
        return fire;
    }

    // ─── Scan de todos los flujos y disparo de crons ──────────────────────────
    async tick() {
        try {
            const result = await pool.query(
                'SELECT id, name, nodes, edges FROM automation_flow WHERE jsonb_array_length(nodes) > 0'
            );

            for (const flow of result.rows) {
                const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];

                for (const node of nodes) {
                    if (node.title !== 'Reloj / Cron') continue;

                    const cronExpr = node.config?.cron;
                    if (!cronExpr) continue;

                    if (this.shouldFire(cronExpr, node.id)) {
                        console.log(`\n[CronScheduler] ⏰ Disparando nodo "${node.id}" en flujo "${flow.name}" (cron: ${cronExpr})`);
                        // Fire & forget — no bloqueamos el tick
                        AutomationEngine.triggerNode(node.id, { _cronTriggered: true, _firedAt: new Date().toISOString() }, flow.id)
                            .catch(e => console.error(`[CronScheduler] Error disparando flujo:`, e.message));
                    }
                }
            }
        } catch (err) {
            // DB puede estar unavailable al inicio — no crashear
            if (!err.message?.includes('ECONNREFUSED')) {
                console.error('[CronScheduler] Error en tick:', err.message);
            }
        } finally {
            // Limpiar entradas de lastFired con más de 2 minutos (evita memory leak)
            const cutoff = new Date();
            cutoff.setMinutes(cutoff.getMinutes() - 2);
            const cutoffKey = `${cutoff.getHours()}:${String(cutoff.getMinutes()).padStart(2,'0')}`;
            for (const [k, v] of this.lastFired.entries()) {
                if (v.split('_')[1] <= cutoffKey) this.lastFired.delete(k);
            }
        }
    }

    // ─── Arrancar el scheduler ────────────────────────────────────────────────
    start(intervalMs = 60_000) {
        if (this.interval) return; // Ya corriendo
        console.log(`[CronScheduler] 🚀 Iniciado — revisando flujos cada ${intervalMs / 1000}s`);
        this.interval = setInterval(() => this.tick(), intervalMs);
        // Primer tick inmediato (para "every_minute" funcione de inmediato)
        this.tick();
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('[CronScheduler] ⏹ Detenido');
        }
    }
}

export const cronScheduler = new CronScheduler();
export default cronScheduler;
