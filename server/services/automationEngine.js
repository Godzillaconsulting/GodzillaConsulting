import pool from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
// GODZILLA WORKFLOW ENGINE v2
// El equivalente a n8n — 100% interno y nativo.
//
// Arquitectura:
//   1. triggerFlow()     — Entry point. Lee el grafo de la DB e inicia la ejecución.
//   2. topologicalSort() — Ordena los nodos para que A se ejecute antes que B.
//   3. executeNode()     — Ejecuta la acción del nodo con el contexto actual.
//   4. NODE_ACTIONS      — Registro de acciones reales para cada tipo de nodo.
// ══════════════════════════════════════════════════════════════════════════════

class AutomationEngine {

    // ─── Registro de Acciones por Tipo de Nodo ─────────────────────────────────
    static NODE_ACTIONS = {
        // ORIGEN: El planificador ya trajo los datos, solo los pasa.
        'Planificador IA': async (node, context) => {
            return context; // Pass-through — los datos ya vienen del trigger
        },

        // TRANSFORM: Prepara los prompts visuales organizados por escena
        'Generador Visual': async (node, context) => {
            if (!context.plan) return context;
            const enriched = context.plan.map((day, idx) => ({
                ...day,
                _visualJobs: [1, 2, 3, 4, 5].map(n => ({
                    scene: n,
                    prompt: day[`VISUAL ESCENA ${n} (Prompt Imagen Detallado)`] || ''
                })).filter(j => j.prompt)
            }));
            return { ...context, plan: enriched };
        },

        // TRANSFORM: Prepara los prompts de video organizados por escena
        'Generador Video': async (node, context) => {
            if (!context.plan) return context;
            const enriched = context.plan.map(day => ({
                ...day,
                _videoJobs: [1, 2, 3, 4, 5].map(n => ({
                    scene: n,
                    prompt: day[`VIDEO ESCENA ${n} (Prompt Movimiento Detallado)`] || ''
                })).filter(j => j.prompt)
            }));
            return { ...context, plan: enriched };
        },

        // SINK: Crea 1 studio_task por cada día del plan con todo el contexto acumulado
        'Tarea de Studio': async (node, context) => {
            if (!context.plan || !Array.isArray(context.plan)) return context;

            let created = 0;
            for (const day of context.plan) {
                const title = day['Tema'] || 'Día sin título';

                // Concatenar narraciones para el prompt principal
                const narrations = [1, 2, 3, 4, 5].map(n => {
                    const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
                    return day[key] ? `Escena ${n}: ${day[key]}` : null;
                }).filter(Boolean).join('\n');

                // Empaquetar todo el contexto en media_payload
                const mediaPayload = {
                    source: 'automation_flow',
                    niche: context.niche,
                    month: context.month,
                    year: context.year,
                    scenes: day,
                    visualJobs: day._visualJobs || [],
                    videoJobs: day._videoJobs || []
                };

                await pool.query(`
                    INSERT INTO studio_tasks
                        (title, prompt, assigned_to, tags, priority, content_type, status, media_payload)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    title,
                    narrations,
                    'auto',
                    JSON.stringify([context.niche || 'auto', 'auto-generated']),
                    'Media',
                    'Video Corto',
                    'pending_cm_approval',
                    JSON.stringify(mediaPayload)
                ]);
                created++;
            }
            return { ...context, _studioTasksCreated: created };
        },

        // NOTIFY: Registra en log que el Email Worker debe notificar
        'Email Worker': async (node, context) => {
            console.log(`[AutomationEngine] 📧 Email Worker notificado: ${context._studioTasksCreated || 0} tareas creadas.`);
            return context;
        },

        // NOTIFY: Registra en log que el Bot de WA debe notificar
        'WhatsApp Bot': async (node, context) => {
            console.log(`[AutomationEngine] 📱 WhatsApp Bot notificado: flujo completado.`);
            return context;
        },

        // DEFAULT: Nodos sin acción programada (solo visual)
        '_default': async (node, context) => {
            console.log(`[AutomationEngine] ℹ️ Nodo "${node.title}" no tiene acción programada (nodo decorativo).`);
            return context;
        }
    };

    // ─── Orden Topológico (de origen a destino) ────────────────────────────────
    static topologicalSort(nodes, edges, startId) {
        const visited = new Set();
        const order = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        function dfs(nodeId) {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const outEdges = edges.filter(e => e.source === nodeId);
            for (const edge of outEdges) {
                dfs(edge.target);
            }
            order.unshift(nodeId);
        }

        dfs(startId);
        return order.map(id => nodeMap.get(id)).filter(Boolean);
    }

    // ─── Entry Point Principal ─────────────────────────────────────────────────
    static async triggerFlow(sourceTitle, inputPayload) {
        const startedAt = Date.now();
        const runLog = [];
        let runId = null;

        try {
            console.log(`\n[AutomationEngine] ════ INICIANDO FLUJO desde: "${sourceTitle}" ════`);

            // 1. Cargar el grafo desde la DB
            const result = await pool.query('SELECT nodes, edges FROM automation_flow WHERE id = 1');
            if (!result.rows.length || !result.rows[0].nodes?.length) {
                console.log('[AutomationEngine] Sin grafo configurado. Nada que ejecutar.');
                return;
            }

            const nodes = result.rows[0].nodes;
            const edges = result.rows[0].edges || [];

            // 2. Encontrar el/los nodos de origen
            const sourceNodes = nodes.filter(n => n.title === sourceTitle);
            if (!sourceNodes.length) {
                console.log(`[AutomationEngine] No se encontró el nodo origen "${sourceTitle}".`);
                return;
            }

            // 3. Crear registro de ejecución en DB
            const runResult = await pool.query(
                `INSERT INTO flow_runs (flow_id, status, source) VALUES (1, 'running', $1) RETURNING id`,
                [sourceTitle]
            );
            runId = runResult.rows[0].id;

            // 4. Ejecutar desde cada nodo origen
            for (const sourceNode of sourceNodes) {
                const executionOrder = this.topologicalSort(nodes, edges, sourceNode.id);
                console.log(`[AutomationEngine] Orden de ejecución: ${executionOrder.map(n => n.title).join(' → ')}`);

                let context = { ...inputPayload };

                for (const node of executionOrder) {
                    const stepStart = Date.now();
                    try {
                        const action = this.NODE_ACTIONS[node.title] || this.NODE_ACTIONS['_default'];
                        context = await action(node, context);

                        const stepLog = { node: node.title, status: 'success', duration_ms: Date.now() - stepStart };
                        runLog.push(stepLog);
                        console.log(`[AutomationEngine] ✅ ${node.title} — ${stepLog.duration_ms}ms`);
                    } catch (nodeErr) {
                        const stepLog = { node: node.title, status: 'error', error: nodeErr.message, duration_ms: Date.now() - stepStart };
                        runLog.push(stepLog);
                        console.error(`[AutomationEngine] ❌ ${node.title} falló: ${nodeErr.message}`);
                    }
                }
            }

            // 5. Actualizar el registro de ejecución como completado
            await pool.query(
                `UPDATE flow_runs SET status = 'success', finished_at = NOW(), duration_ms = $1, log = $2 WHERE id = $3`,
                [Date.now() - startedAt, JSON.stringify(runLog), runId]
            );

            console.log(`[AutomationEngine] ════ FLUJO COMPLETADO en ${Date.now() - startedAt}ms ════\n`);

        } catch (err) {
            console.error('[AutomationEngine] Error fatal en el flujo:', err.message);
            if (runId) {
                await pool.query(
                    `UPDATE flow_runs SET status = 'error', finished_at = NOW(), log = $1 WHERE id = $2`,
                    [JSON.stringify([...runLog, { node: 'engine', status: 'error', error: err.message }]), runId]
                );
            }
        }
    }
}

export default AutomationEngine;
