import pool from '../config/db.js';
import nodemailer from 'nodemailer';

// ── Singleton de transporter SMTP (no crear uno nuevo por cada email) ────────
let _mailerTransport = null;
function getMailer() {
    if (_mailerTransport) return _mailerTransport;
    _mailerTransport = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    return _mailerTransport;
}

// ── Cache de flujos en memoria (TTL 30s) ─────────────────────────────────────
const _flowCache = new Map(); // flowId → { data, ts }
const FLOW_CACHE_TTL = 30_000;
async function getFlow(flowId) {
    const cached = _flowCache.get(flowId);
    if (cached && Date.now() - cached.ts < FLOW_CACHE_TTL) return cached.data;
    const r = await pool.query('SELECT id, nodes, edges FROM automation_flow WHERE id=$1', [flowId]);
    const data = r.rows[0] || null;
    if (data) _flowCache.set(flowId, { data, ts: Date.now() });
    return data;
}
function invalidateFlowCache(flowId) { _flowCache.delete(flowId); }

// ══════════════════════════════════════════════════════════════════════════════
//  GODZILLA WORKFLOW ENGINE v3 — El n8n que nos pertenece 😈
//
//  Cómo funciona:
//   1. triggerFlow(sourceTitle, payload)  → busca el nodo, ordena el grafo, ejecuta
//   2. triggerNode(nodeId, payload)       → dispara desde un nodo específico (webhooks)
//   3. topologicalSort()                  → resuelve el orden correcto A→B→C
//   4. _executeNodePath()                 → ejecuta cada nodo en secuencia, pasa el contexto
//   5. NODE_ACTIONS                       → catálogo de acciones reales por tipo de nodo
//
//  Agregar un nodo nuevo:
//   1. Añade su entrada en NODE_ACTIONS con el mismo nombre que en el editor visual
//   2. Recibe (node, context) y devuelve el nuevo context con datos añadidos
//   3. Listo — el motor lo encuentra automáticamente cuando está en el grafo
// ══════════════════════════════════════════════════════════════════════════════

class AutomationEngine {

    // ─── Evaluador de Variables Dinámicas ─────────────────────────────────────
    // Soporta {{ $json.fieldName }} y {{ $json.nested.field }}
    static evaluateConfig(config, context) {
        if (!config) return {};

        const evaluateString = (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/\{\{\s*\$json\.([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
                const parts = path.split('.');
                let val = context;
                for (const p of parts) { if (val !== undefined) val = val[p]; }
                return val !== undefined ? String(val) : '';
            });
        };

        const evaluateNode = (node) => {
            if (typeof node === 'string') return evaluateString(node);
            if (Array.isArray(node)) return node.map(evaluateNode);
            if (node !== null && typeof node === 'object') {
                const out = {};
                for (const [k, v] of Object.entries(node)) out[k] = evaluateNode(v);
                return out;
            }
            return node;
        };

        return evaluateNode(config);
    }

    // ─── Catálogo de Acciones por Tipo de Nodo ────────────────────────────────
    // Cada función recibe (node, context) y DEBE devolver el nuevo context.
    // El context es el "paquete de datos" que viaja de nodo en nodo.
    static NODE_ACTIONS = {

        // ── ORIGEN: Planificador IA ────────────────────────────────────────────
        // Genera planes de contenido por día, semana o mes — en BLOQUES
        // para no gastar tokens de golpe y evitar JSON truncado.
        'Planificador IA': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const period   = cfg.period      || ctx.period      || 'month';
            const niche    = cfg.niche       || ctx.niche       || 'negocio digital';
            const extraCtx = cfg.extraContext || ctx.extraContext || '';

            // Si ya viene un plan en el contexto (disparado desde UI), lo pasamos sin re-generar
            if (ctx.plan && Array.isArray(ctx.plan) && ctx.plan.length > 0) {
                console.log(`[Engine] 🧠 Planificador IA — plan ya en contexto (${ctx.plan.length} entradas), pasando...`);
                return { ...ctx, period, niche };
            }

            const apiKey = process.env.SAMBANOVA_API_KEY;
            if (!apiKey) {
                console.log(`[Engine] ⚠️  Planificador IA — sin SAMBANOVA_API_KEY`);
                return { ...ctx, plan: [], period, niche };
            }

            // ─── Configuración de bloques por periodo ─────────────────────────
            // 1 día  ≈  500 tokens de output → 1,024 es seguro
            // 7 días ≈ 3,500 tokens → split en 2 bloques de 3-4 días a 2,048
            // 30 días ≈ 15,000 tokens → split en 6 bloques de 5 días a 3,072
            // Llama 3.1 405B en SambaNova tiene un límite altísimo
            const blockConfig = {
                day:   { totalDays: 1,  blockSize: 1, blocks: 1,  },
                week:  { totalDays: 7,  blockSize: 4, blocks: 2,  },
                month: { totalDays: 30, blockSize: 5, blocks: 6,  },
            };
            const { totalDays, blockSize, blocks } = blockConfig[period] || blockConfig.month;

            // ─── Helper: genera un bloque de N días ───────────────────────────
            const generateBlock = async (startDay, count, blockNum) => {
                const dayLabel = count === 1
                    ? `el día ${startDay}`
                    : `los días del ${startDay} al ${startDay + count - 1}`;

                const blockPrompt = `Nicho/producto: "${niche}"${extraCtx ? `\nContexto: ${extraCtx}` : ''}

Genera el plan de contenido SOLO para ${dayLabel} de ${totalDays} (bloque ${blockNum}/${blocks}).
Devuelve EXACTAMENTE un JSON array con ${count} objeto(s). Sin markdown, sin texto extra.

Cada objeto DEBE tener estas claves exactas:
{
  "Tema": "título del video",
  "NARRACION ESCENA 1": "texto narrado escena 1",
  "NARRACION ESCENA 2": "texto narrado escena 2",
  "NARRACION ESCENA 3": "texto narrado escena 3",
  "NARRACION ESCENA 4": "texto narrado escena 4",
  "NARRACION ESCENA 5 (CTA)": "llamada a la acción",
  "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "prompt detallado para generar imagen",
  "VIDEO ESCENA 1 (Prompt Movimiento Detallado)": "prompt de movimiento para video"
}

Solo el JSON array, nada más.`;

                const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "Meta-Llama-3.1-405B-Instruct",
                        messages: [
                            { role: "system", content: "Eres un estratega de contenido experto en redes sociales. DEBES responder estrictamente con un array JSON válido y nada de markdown." },
                            { role: "user", content: blockPrompt }
                        ],
                        temperature: 0.75,
                        max_tokens: maxTokens
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || `SambaNova HTTP ${res.status}`);
                
                const raw  = data?.choices?.[0]?.message?.content || '[]';
                const clean = raw
                    .replace(/```json\n?/gi, '')
                    .replace(/```\n?/gi, '')
                    .trim();
                return JSON.parse(clean);
            };

            // ─── Generar todos los bloques secuencialmente ────────────────────
            const fullPlan = [];
            console.log(`[Engine] 🧠 Planificador IA — ${period} → ${blocks} bloque(s) de ~${blockSize} días`);

            for (let b = 0; b < blocks; b++) {
                const startDay = b * blockSize + 1;
                const count    = Math.min(blockSize, totalDays - b * blockSize);
                try {
                    console.log(`[Engine] 📦 Bloque ${b + 1}/${blocks} — días ${startDay} al ${startDay + count - 1}`);
                    const block = await generateBlock(startDay, count, b + 1);
                    fullPlan.push(...block);
                    console.log(`[Engine] ✅ Bloque ${b + 1} — ${block.length} entradas OK`);
                } catch (e) {
                    console.error(`[Engine] ❌ Bloque ${b + 1} falló: ${e.message}`);
                    // Continuamos con los demás bloques aunque uno falle
                }
            }

            console.log(`[Engine] 🎉 Planificador IA — ${fullPlan.length}/${totalDays} días generados`);
            return { ...ctx, plan: fullPlan, period, niche, days: totalDays };
        },

        'Webhook Entrada': async (node, ctx) => {
            console.log(`[Engine] 🌐 Webhook Entrada — payload recibido`);
            return ctx;
        },

        'Reloj / Cron': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] ⏰ Cron disparado — expresión: ${cfg.cron || 'inmediato'}`);
            return { ...ctx, _cronFiredAt: new Date().toISOString() };
        },

        // ── TRANSFORMADORES ───────────────────────────────────────────────────
        'Generador Visual': async (node, ctx) => {
            if (!ctx.plan) return ctx;
            const enriched = ctx.plan.map(day => ({
                ...day,
                _visualJobs: [1, 2, 3, 4, 5].map(n => ({
                    scene: n,
                    prompt: day[`VISUAL ESCENA ${n} (Prompt Imagen Detallado)`] || ''
                })).filter(j => j.prompt)
            }));
            console.log(`[Engine] 🖼  Generador Visual — ${enriched.reduce((a, d) => a + d._visualJobs.length, 0)} jobs de imagen preparados`);
            return { ...ctx, plan: enriched };
        },

        'Generador Video': async (node, ctx) => {
            if (!ctx.plan) return ctx;
            const enriched = ctx.plan.map(day => ({
                ...day,
                _videoJobs: [1, 2, 3, 4, 5].map(n => ({
                    scene: n,
                    prompt: day[`VIDEO ESCENA ${n} (Prompt Movimiento Detallado)`] || ''
                })).filter(j => j.prompt)
            }));
            console.log(`[Engine] 🎬 Generador Video — ${enriched.reduce((a, d) => a + d._videoJobs.length, 0)} jobs de video preparados`);
            return { ...ctx, plan: enriched };
        },

        'Transformador JSON': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (cfg.outputField && cfg.value !== undefined) {
                ctx[cfg.outputField] = cfg.value;
            }
            console.log(`[Engine] 🔧 Transformador JSON ejecutado`);
            return ctx;
        },

        'Router / Switch': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const field = cfg.field;
            const value = cfg.value;
            const match = ctx[field] === value || String(ctx[field]) === String(value);
            console.log(`[Engine] 🔀 Router — ${field}=${ctx[field]} ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
            } return ctx;
        },

        // ── SINKS / ACCIONES REALES ───────────────────────────────────────────

        // Crea tareas en studio_tasks (una por día del plan)
        'Tarea de Studio': async (node, ctx) => {
            if (!ctx.plan || !Array.isArray(ctx.plan)) {
                console.log(`[Engine] ⚠️  Tarea de Studio — sin plan en contexto (skipped)`);
                ctx._skippedNodes = [...(ctx._skippedNodes || []), 'Tarea de Studio'];
                return ctx;
            }
            const now = new Date();
            const monthMap = { 'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
                               'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11 };
            const yr  = parseInt(ctx.year)  || now.getFullYear();
            const mon = monthMap[(ctx.month||'').toLowerCase().trim()] ?? now.getMonth();

            let created = 0;
            for (let i = 0; i < ctx.plan.length; i++) {
                const day = ctx.plan[i];
                const narrations = [1,2,3,4,5].map(n => {
                    const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
                    return day[key] ? `Escena ${n}: ${day[key]}` : null;
                }).filter(Boolean).join('\n');

                const mediaPayload = {
                    source: 'automation_flow',
                    niche: ctx.niche, month: ctx.month, year: ctx.year,
                    scenes: day,
                    visualJobs: day._visualJobs || [],
                    videoJobs:  day._videoJobs  || []
                };

                const isoDate = new Date(yr, mon, i + 1).toISOString().split('T')[0];

                await pool.query(`
                    INSERT INTO studio_tasks
                        (title, prompt, assigned_to, tags, priority, content_type,
                         status, media_payload, ig_publish_date, publish_targets)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                `, [
                    day['Tema'] || `Día ${i+1}`,
                    narrations,
                    'auto',
                    JSON.stringify([ctx.niche || 'auto', 'ai-planner']),
                    'Media', 'Video Corto', 'pending_cm_approval',
                    JSON.stringify(mediaPayload),
                    isoDate,
                    JSON.stringify(['instagram', 'tiktok'])
                ]);
                created++;
            }
            console.log(`[Engine] ✅ Tarea de Studio — ${created} tareas creadas en DB`);
            return { ...ctx, _studioTasksCreated: created };
        },

        // Calendario Global — crea evento en calendar_events
        'Calendario Global': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (cfg.action === 'create' && cfg.title) {
                try {
                    await pool.query(`
                        INSERT INTO calendar_events (title, platform, status, start_date, end_date, empresa, assigned_to)
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                    `, [
                        cfg.title,
                        cfg.platform || 'ALL',
                        'warning',
                        cfg.date || new Date().toISOString().split('T')[0],
                        cfg.date || new Date().toISOString().split('T')[0],
                        cfg.empresa || 'godzilla',
                        cfg.assignTo || 'auto'
                    ]);
                    console.log(`[Engine] 📅 Calendario Global — evento "${cfg.title}" creado`);
                } catch (e) {
                    console.error(`[Engine] ❌ Calendario Global error: ${e.message}`);
                }
            }
            return ctx;
        },

        // Base de Datos — query personalizada (SELECT guarda en ctx, INSERT/UPDATE ejecuta)
        'Base de Datos': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (cfg.query) {
                try {
                    const result = await pool.query(cfg.query, cfg.params || []);
                    console.log(`[Engine] 🗄  Base de Datos — ${result.rowCount} filas afectadas`);
                    return { ...ctx, _dbResult: result.rows };
                } catch (e) {
                    console.error(`[Engine] ❌ Base de Datos error: ${e.message}`);
                }
            }
            return ctx;
        },

        // Email Worker — nodemailer con template dinámico
        'Email Worker': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const to = cfg.to || ctx.userEmail;
            if (!to) {
                console.log(`[Engine] ⚠️  Email Worker — sin destinatario`);
                return ctx;
            }

            let html = cfg.body || '';
            if (!html && ctx.plan) {
                const rows = ctx.plan.map((day, i) => `
                    <tr style="border-bottom:1px solid #333">
                        <td style="padding:12px;color:#a78bfa;font-weight:900">${i+1}</td>
                        <td style="padding:12px;color:#fff">${day['Tema'] || '—'}</td>
                        <td style="padding:12px;color:#6ee7b7;font-size:11px">${(day['NARRACION ESCENA 1'] || '').substring(0,60)}...</td>
                    </tr>`).join('');
                html = `
                    <div style="font-family:'Inter',sans-serif;background:#09090b;padding:32px;color:#fff;max-width:640px;margin:0 auto;border-radius:16px">
                        <h1 style="color:#CC0000;margin-bottom:4px">🤖 Godzilla AI Studio</h1>
                        <p style="color:#71717a;margin-bottom:24px">Plan de Contenido Generado Automáticamente</p>
                        <table style="width:100%;border-collapse:collapse;background:#18181b;border-radius:12px;overflow:hidden">
                            <thead><tr style="background:#27272a">
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">DÍA</th>
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">TEMA</th>
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">PREVIEW</th>
                            </tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        <p style="color:#52525b;font-size:12px;margin-top:24px">Godzilla Consulting · Sistema Autónomo</p>
                    </div>`;
            }

            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
                });
                await transporter.sendMail({
                    from: `"Godzilla AI Studio" <${process.env.EMAIL_USER}>`,
                    to,
                    subject: cfg.subject || '🤖 Godzilla — Notificación Automática',
                    html
                });
                console.log(`[Engine] 📧 Email Worker — enviado a ${to}`);
            } catch (e) {
                console.error(`[Engine] ❌ Email Worker error: ${e.message}`);
            }
            return ctx;
        },

        // WhatsApp Bot — encola en bot_outbound_queue
        'WhatsApp Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const to      = cfg.to;
            const message = cfg.fallback || cfg.message;
            if (to && message) {
                try {
                    await pool.query(
                        `INSERT INTO bot_outbound_queue (bot_name, payload) VALUES ($1, $2)`,
                        ['whatsapp', JSON.stringify({ to, message })]
                    );
                    console.log(`[Engine] 📱 WhatsApp Bot — mensaje encolado para ${to}`);
                } catch (e) {
                    console.error(`[Engine] ❌ WhatsApp Bot error: ${e.message}`);
                }
            } else {
                console.log(`[Engine] ⚠️  WhatsApp Bot — falta 'to' o 'message' en config del nodo`);
            }
            return ctx;
        },

        // TikTok Bot — encola tarea de publicación
        'TikTok Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            try {
                await pool.query(
                    `INSERT INTO bot_outbound_queue (bot_name, payload) VALUES ($1, $2)`,
                    ['tiktok', JSON.stringify({ action: cfg.action || 'post', payload: ctx })]
                );
                console.log(`[Engine] 🎵 TikTok Bot — tarea encolada`);
            } catch (e) {
                console.error(`[Engine] ❌ TikTok Bot error: ${e.message}`);
            }
            return ctx;
        },

        // IG / Messenger Bot
        'IG / Messenger Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            try {
                await pool.query(
                    `INSERT INTO bot_outbound_queue (bot_name, payload) VALUES ($1, $2)`,
                    ['instagram', JSON.stringify({ action: cfg.action || 'post', payload: ctx })]
                );
                console.log(`[Engine] 🟣 IG Bot — tarea encolada`);
            } catch (e) {
                console.error(`[Engine] ❌ IG Bot error: ${e.message}`);
            return { ...ctx, _routerMatch: match };
        },

        // ── SINKS / ACCIONES REALES ───────────────────────────────────────────

        // Crea tareas en studio_tasks (una por día del plan)
        'Tarea de Studio': async (node, ctx) => {
            if (!ctx.plan || !Array.isArray(ctx.plan)) {
                console.log(`[Engine] ⚠️  Tarea de Studio — sin plan en contexto (skipped)`);
                ctx._skippedNodes = [...(ctx._skippedNodes || []), 'Tarea de Studio'];
                return ctx;
            }
            const now = new Date();
            const monthMap = { 'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
                               'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11 };
            const yr  = parseInt(ctx.year)  || now.getFullYear();
            const mon = monthMap[(ctx.month||'').toLowerCase().trim()] ?? now.getMonth();

            let created = 0;
            for (let i = 0; i < ctx.plan.length; i++) {
                const day = ctx.plan[i];
                const narrations = [1,2,3,4,5].map(n => {
                    const key = n === 5 ? 'NARRACION ESCENA 5 (CTA)' : `NARRACION ESCENA ${n}`;
                    return day[key] ? `Escena ${n}: ${day[key]}` : null;
                }).filter(Boolean).join('\n');

                const mediaPayload = {
                    source: 'automation_flow',
                    niche: ctx.niche, month: ctx.month, year: ctx.year,
                    scenes: day,
                    visualJobs: day._visualJobs || [],
                    videoJobs:  day._videoJobs  || []
                };

                const isoDate = new Date(yr, mon, i + 1).toISOString().split('T')[0];

                await pool.query(`
                    INSERT INTO studio_tasks
                        (title, prompt, assigned_to, tags, priority, content_type,
                         status, media_payload, ig_publish_date, publish_targets)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                `, [
                    day['Tema'] || `Día ${i+1}`,
                    narrations,
                    'auto',
                    JSON.stringify([ctx.niche || 'auto', 'ai-planner']),
                    'Media', 'Video Corto', 'pending_cm_approval',
                    JSON.stringify(mediaPayload),
                    isoDate,
                    JSON.stringify(['instagram', 'tiktok'])
                ]);
                created++;
            }
            console.log(`[Engine] ✅ Tarea de Studio — ${created} tareas creadas en DB`);
            return { ...ctx, _studioTasksCreated: created };
        },

        // Calendario Global — crea evento en calendar_events
        'Calendario Global': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (cfg.action === 'create' && cfg.title) {
                try {
                    await pool.query(`
                        INSERT INTO calendar_events (title, platform, status, start_date, end_date, empresa, assigned_to)
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                    `, [
                        cfg.title,
                        cfg.platform || 'ALL',
                        'warning',
                        cfg.date || new Date().toISOString().split('T')[0],
                        cfg.date || new Date().toISOString().split('T')[0],
                        cfg.empresa || 'godzilla',
                        cfg.assignTo || 'auto'
                    ]);
                    console.log(`[Engine] 📅 Calendario Global — evento "${cfg.title}" creado`);
                } catch (e) {
                    console.error(`[Engine] ❌ Calendario Global error: ${e.message}`);
                }
            }
            return ctx;
        },

        // Base de Datos — query personalizada (SELECT guarda en ctx, INSERT/UPDATE ejecuta)
        'Base de Datos': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (cfg.query) {
                try {
                    const result = await pool.query(cfg.query, cfg.params || []);
                    console.log(`[Engine] 🗄  Base de Datos — ${result.rowCount} filas afectadas`);
                    return { ...ctx, _dbResult: result.rows };
                } catch (e) {
                    console.error(`[Engine] ❌ Base de Datos error: ${e.message}`);
                }
            }
            return ctx;
        },

        // Email Worker — nodemailer con template dinámico
        'Email Worker': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const to = cfg.to || ctx.userEmail;
            if (!to) {
                console.log(`[Engine] ⚠️  Email Worker — sin destinatario`);
                return ctx;
            }

            let html = cfg.body || '';
            if (!html && ctx.plan) {
                const rows = ctx.plan.map((day, i) => `
                    <tr style="border-bottom:1px solid #333">
                        <td style="padding:12px;color:#a78bfa;font-weight:900">${i+1}</td>
                        <td style="padding:12px;color:#fff">${day['Tema'] || '—'}</td>
                        <td style="padding:12px;color:#6ee7b7;font-size:11px">${(day['NARRACION ESCENA 1'] || '').substring(0,60)}...</td>
                    </tr>`).join('');
                html = `
                    <div style="font-family:'Inter',sans-serif;background:#09090b;padding:32px;color:#fff;max-width:640px;margin:0 auto;border-radius:16px">
                        <h1 style="color:#CC0000;margin-bottom:4px">🤖 Godzilla AI Studio</h1>
                        <p style="color:#71717a;margin-bottom:24px">Plan de Contenido Generado Automáticamente</p>
                        <table style="width:100%;border-collapse:collapse;background:#18181b;border-radius:12px;overflow:hidden">
                            <thead><tr style="background:#27272a">
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">DÍA</th>
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">TEMA</th>
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">PREVIEW</th>
                            </tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        <p style="color:#52525b;font-size:12px;margin-top:24px">Godzilla Consulting · Sistema Autónomo</p>
                    </div>`;
            }

            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
                });
                await transporter.sendMail({
                    from: `"Godzilla AI Studio" <${process.env.EMAIL_USER}>`,
                    to,
                    subject: cfg.subject || '🤖 Godzilla — Notificación Automática',
                    html
                });
                console.log(`[Engine] 📧 Email Worker — enviado a ${to}`);
            } catch (e) {
                console.error(`[Engine] ❌ Email Worker error: ${e.message}`);
            }
            return ctx;
        },

        // WhatsApp Bot — encola en bot_outbound_queue
        'WhatsApp Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const to      = cfg.to;
            const message = cfg.fallback || cfg.message;
            if (to && message) {
                try {
                    await pool.query(
                        `INSERT INTO bot_outbound_queue (bot_name, payload) VALUES ($1, $2)`,
                        ['whatsapp', JSON.stringify({ to, message })]
                    );
                    console.log(`[Engine] 📱 WhatsApp Bot — mensaje encolado para ${to}`);
                } catch (e) {
                    console.error(`[Engine] ❌ WhatsApp Bot error: ${e.message}`);
                }
            } else {
                console.log(`[Engine] ⚠️  WhatsApp Bot — falta 'to' o 'message' en config del nodo`);
            }
            return ctx;
        },

        // TikTok Bot — encola tarea de publicación
        'TikTok Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            try {
                await pool.query(
                    `INSERT INTO bot_outbound_queue (bot_name, payload) VALUES ($1, $2)`,
                    ['tiktok', JSON.stringify({ action: cfg.action || 'post', payload: ctx })]
                );
                console.log(`[Engine] 🎵 TikTok Bot — tarea encolada`);
            } catch (e) {
                console.error(`[Engine] ❌ TikTok Bot error: ${e.message}`);
            }
            return ctx;
        },

        // IG / Messenger Bot
        'IG / Messenger Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            try {
                await pool.query(
                    `INSERT INTO bot_outbound_queue (bot_name, payload) VALUES ($1, $2)`,
                    ['instagram', JSON.stringify({ action: cfg.action || 'post', payload: ctx })]
                );
                console.log(`[Engine] 🟣 IG Bot — tarea encolada`);
            } catch (e) {
                console.error(`[Engine] ❌ IG Bot error: ${e.message}`);
            }
            return ctx;
        },

        // HTTP Request — llamada a API externa
        'HTTP Request': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.url) { console.log(`[Engine] ⚠️  HTTP Request — sin URL configurada`); return ctx; }

            const opts = {
                method: cfg.method || 'POST',
                headers: { 'Content-Type': 'application/json', ...(cfg.headers || {}) }
            };
            if (['POST','PUT','PATCH'].includes(opts.method) && cfg.body) {
                let body = cfg.body;
                if (typeof body === 'string') try { body = JSON.parse(body); } catch(_) {}
                opts.body = JSON.stringify(body);
            }
            try {
                const res  = await fetch(cfg.url, opts);
                let data;
                try { data = await res.json(); } catch(_) { data = await res.text(); }
                console.log(`[Engine] 📡 HTTP Request — ${opts.method} ${cfg.url} → ${res.status}`);
                return { ...ctx, _httpResponse: data, _httpStatus: res.status };
            } catch (e) {
                console.error(`[Engine] ❌ HTTP Request error: ${e.message}`);
                return { ...ctx, _httpError: e.message };
            }
        },

        // Gemini API (SambaNova Llama 3.1 405B) — reemplazo del Cerebro Central AI
        'Gemini API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const prompt = cfg.prompt;
            if (!prompt) { console.log(`[Engine] ⚠️  Gemini API — sin prompt configurado`); return ctx; }

            try {
                const apiKey = process.env.SAMBANOVA_API_KEY;
                if (!apiKey) throw new Error('SAMBANOVA_API_KEY no configurada');
                
                // SambaNova (Llama 3.1 405B) + retry 3x
                let result = null;
                for (let attempt = 1; attempt <= 3 && !result; attempt++) {
                    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1500) + 500));
                    try {
                        const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                messages: [{ role: 'user', content: prompt }],
                                model: 'Meta-Llama-3.1-405B-Instruct',
                                temperature: 0.85
                            })
                        });
                        if (!res.ok) {
                            if (res.status === 429) await new Promise(r => setTimeout(r, 4000 * attempt));
                            throw new Error('SambaNova ' + res.status);
                        }
                        const data  = await res.json();
                        const raw   = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '[]';
                        const clean = raw.replace(/```json\n?/gi,'').replace(/```\n?/gi,'').trim();
                        result = JSON.parse(clean);
                    } catch (e) {
                        console.warn('[Engine] Bloque intento ' + attempt + '/3: ' + e.message);
                    }
                }
                if (!result) throw new Error('SambaNova no respondio tras 3 intentos');
                return result;
