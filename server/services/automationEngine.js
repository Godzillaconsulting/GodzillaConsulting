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
        // Genera planes de contenido por día, semana o mes usando Gemini
        'Planificador IA': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const period      = cfg.period      || ctx.period      || 'month';
            const niche       = cfg.niche       || ctx.niche       || 'negocio digital';
            const extraCtx    = cfg.extraContext || ctx.extraContext || '';

            // Si ya viene un plan en el contexto (ej: disparado desde UI), pasarlo
            if (ctx.plan && Array.isArray(ctx.plan) && ctx.plan.length > 0) {
                console.log(`[Engine] 🧠 Planificador IA — plan ya en contexto (${ctx.plan.length} entradas), pasando...`);
                return { ...ctx, period, niche };
            }

            // Calcular cuántos días generar
            const daysMap = { day: 1, week: 7, month: 30 };
            const days    = daysMap[period] || 30;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.log(`[Engine] ⚠️  Planificador IA — sin GEMINI_API_KEY, saltando generación`);
                return { ...ctx, plan: [], period, niche };
            }

            console.log(`[Engine] 🧠 Planificador IA — generando ${days} día(s) para nicho: "${niche}" [${period}]`);

            const prompt = `Eres un estratega de contenido. Crea un plan de ${days} día(s) para: "${niche}".
${extraCtx ? `Contexto adicional: ${extraCtx}` : ''}
Devuelve un JSON array con EXACTAMENTE ${days} objetos, uno por día.
Cada objeto debe tener: { "Tema": "...", "NARRACION ESCENA 1": "...", "NARRACION ESCENA 2": "...", "NARRACION ESCENA 3": "...", "NARRACION ESCENA 4": "...", "NARRACION ESCENA 5 (CTA)": "...", "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "...", "VIDEO ESCENA 1 (Prompt Movimiento Detallado)": "..." }
Solo responde el JSON puro, sin markdown, sin explicaciones.`;

            try {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.8, maxOutputTokens: days > 7 ? 8192 : 2048 }
                        })
                    }
                );
                const data = await res.json();
                const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
                const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const plan  = JSON.parse(clean);
                console.log(`[Engine] ✅ Planificador IA — ${plan.length} entradas generadas`);
                return { ...ctx, plan, period, niche, days };
            } catch (e) {
                console.error(`[Engine] ❌ Planificador IA error: ${e.message}`);
                return { ...ctx, plan: [], period, niche };
            }
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

        // Cerebro Central AI — llama a Gemini para procesar con prompt dinámico
        'Cerebro Central AI': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const prompt = cfg.prompt;
            if (!prompt) { console.log(`[Engine] ⚠️  Cerebro Central — sin prompt configurado`); return ctx; }

            try {
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.7, maxOutputTokens: cfg.maxTokens || 512 }
                        })
                    }
                );
                const data = await res.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log(`[Engine] 🧠 Cerebro Central AI — respuesta: "${reply.substring(0,80)}..."`);
                return { ...ctx, _aiResponse: reply };
            } catch (e) {
                console.error(`[Engine] ❌ Cerebro Central AI error: ${e.message}`);
                return { ...ctx, _aiError: e.message };
            }
        },

        // Godzilla CM — crea lead/contacto en el CRM
        'Godzilla CM': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 📊 Godzilla CM — registrando en CRM: ${cfg.name || 'sin nombre'}`);
            // Aquí va la lógica real del CRM cuando esté la tabla
            return { ...ctx, _crmRegistered: true };
        },

        // Zilla Bot — Dispara respuesta del chatbot
        'Zilla Bot': async (node, ctx) => {
            console.log(`[Engine] 🤖 Zilla Bot — activado con contexto`);
            return ctx;
        },

        // Goyi Bot
        'Goyi Bot': async (node, ctx) => {
            console.log(`[Engine] 🤖 Goyi Bot — activado con contexto`);
            return ctx;
        },

        // Monitor Servidor
        'Monitor Servidor': async (node, ctx) => {
            const health = { timestamp: new Date().toISOString(), status: 'online' };
            try {
                await pool.query(`SELECT 1`);
                health.db = 'ok';
            } catch(_) { health.db = 'error'; }
            console.log(`[Engine] 🖥  Monitor Servidor — ${JSON.stringify(health)}`);
            return { ...ctx, _healthCheck: health };
        },

        // Bot Newsletter
        'Bot Newsletter': async (node, ctx) => {
            console.log(`[Engine] 📰 Bot Newsletter — iniciando difusión`);
            return ctx;
        },

        // Trends Bot
        'Trends Bot': async (node, ctx) => {
            console.log(`[Engine] 📈 Trends Bot — analizando redes`);
            return ctx;
        },

        // ── MENSAJERÍA EXTERNA ────────────────────────────────────────────────

        // Telegram Bot — gratuito, sin límites, perfecto para alertas internas
        // Por qué: es el canal más confiable que existe sin pagar nada. Ideal para alertas del sistema,
        // notificaciones de ventas, reportes automáticos y más. API pública y estable.
        'Telegram Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const token   = cfg.botToken || process.env.TELEGRAM_BOT_TOKEN;
            const chatId  = cfg.chatId   || process.env.TELEGRAM_CHAT_ID;
            const text    = cfg.message  || `🤖 Godzilla AI: ${JSON.stringify(ctx).substring(0, 200)}`;
            if (!token || !chatId) {
                console.log(`[Engine] ⚠️  Telegram Bot — falta TELEGRAM_BOT_TOKEN o chatId`);
                return ctx;
            }
            try {
                const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
                });
                const data = await res.json();
                console.log(`[Engine] 📱 Telegram Bot — ${data.ok ? 'enviado' : 'error: ' + data.description}`);
            } catch(e) { console.error(`[Engine] ❌ Telegram error: ${e.message}`); }
            return ctx;
        },

        // Discord Webhook — notificaciones al equipo sin cuenta de pago
        // Por qué: Discord es gratis siempre. Ideal para alertas dev/ops, errores del sistema,
        // notificaciones de nuevas ventas o leads. El equipo ya lo usa para comunicarse.
        'Discord Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.webhookUrl) { console.log(`[Engine] ⚠️  Discord — sin webhookUrl`); return ctx; }
            try {
                await fetch(cfg.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: cfg.message || '🤖 Godzilla AI notificación',
                        username: cfg.username || 'Godzilla AI',
                        embeds: cfg.embeds || []
                    })
                });
                console.log(`[Engine] 🎮 Discord Webhook — enviado`);
            } catch(e) { console.error(`[Engine] ❌ Discord error: ${e.message}`); }
            return ctx;
        },

        // Slack Webhook — notificaciones al equipo de trabajo
        // Por qué: Muchos clientes y equipos usan Slack. Tener este nodo permite integrarte
        // con CUALQUIER empresa que ya use Slack sin tocar su infraestructura.
        'Slack Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.webhookUrl) { console.log(`[Engine] ⚠️  Slack — sin webhookUrl`); return ctx; }
            try {
                await fetch(cfg.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cfg.message || '🦖 Godzilla AI' })
                });
                console.log(`[Engine] 🔔 Slack Webhook — enviado`);
            } catch(e) { console.error(`[Engine] ❌ Slack error: ${e.message}`); }
            return ctx;
        },

        // Twilio SMS — SMS a cualquier número del mundo
        // Por qué: WhatsApp tiene restricciones. Twilio es el backup universal.
        // Para citas médicas, confirmaciones, códigos OTP. Funciona en cualquier país.
        'Twilio SMS': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const sid   = cfg.accountSid || process.env.TWILIO_ACCOUNT_SID;
            const token = cfg.authToken  || process.env.TWILIO_AUTH_TOKEN;
            const from  = cfg.from       || process.env.TWILIO_FROM;
            const to    = cfg.to;
            if (!sid || !token || !from || !to) {
                console.log(`[Engine] ⚠️  Twilio SMS — configuración incompleta`);
                return ctx;
            }
            try {
                const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ From: from, To: to, Body: cfg.message || 'Mensaje de Godzilla AI' })
                });
                const data = await res.json();
                console.log(`[Engine] 📟 Twilio SMS — ${data.sid ? 'enviado: '+data.sid : 'error: '+data.message}`);
                return { ...ctx, _twilioSid: data.sid };
            } catch(e) { console.error(`[Engine] ❌ Twilio error: ${e.message}`); return ctx; }
        },

        // Resend — Email transaccional de alta entregabilidad (3,000/mes gratis)
        // Por qué: Mejor que Gmail SMTP para emails de negocio. Sin spam, alta entregabilidad.
        // Ideal para confirmaciones, facturas, reportes. API limpia, sin configuración complicada.
        'Resend': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const apiKey = cfg.apiKey || process.env.RESEND_API_KEY;
            if (!apiKey || !cfg.to) { console.log(`[Engine] ⚠️  Resend — falta apiKey o to`); return ctx; }
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: cfg.from || `Godzilla AI <noreply@${process.env.RESEND_DOMAIN || 'godzillaconsulting.ai'}>`,
                        to: [cfg.to], subject: cfg.subject || 'Notificación', html: cfg.html || cfg.body || '<p>Mensaje de Godzilla AI</p>'
                    })
                });
                const data = await res.json();
                console.log(`[Engine] 📧 Resend — ${data.id ? 'enviado: '+data.id : 'error'}`);
                return { ...ctx, _resendId: data.id };
            } catch(e) { console.error(`[Engine] ❌ Resend error: ${e.message}`); return ctx; }
        },

        // ── IA / LLMs ─────────────────────────────────────────────────────────

        // OpenAI / ChatGPT — alternativa/complemento a Gemini
        // Por qué: Algunos clientes exigen GPT. Además GPT-4o-mini es baratísimo y muy capaz.
        // Tener este nodo permite ofrecer servicios con cualquier LLM sin cambiar la arquitectura.
        'OpenAI / ChatGPT': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const apiKey = cfg.apiKey || process.env.OPENAI_API_KEY;
            if (!apiKey || !cfg.prompt) { console.log(`[Engine] ⚠️  OpenAI — falta apiKey o prompt`); return ctx; }
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: cfg.model || 'gpt-4o-mini',
                        messages: [{ role: 'user', content: cfg.prompt }],
                        max_tokens: cfg.maxTokens || 512,
                        temperature: cfg.temperature || 0.7
                    })
                });
                const data = await res.json();
                const reply = data?.choices?.[0]?.message?.content || '';
                console.log(`[Engine] 🤖 OpenAI — "${reply.substring(0,80)}..."`);
                return { ...ctx, _aiResponse: reply, _openaiUsage: data.usage };
            } catch(e) { console.error(`[Engine] ❌ OpenAI error: ${e.message}`); return ctx; }
        },

        // ── BASES DE DATOS EXTERNAS ───────────────────────────────────────────

        // Airtable — base de datos visual, muchos clientes la usan como CRM
        // Por qué: Es el "Excel con superpoderes" que muchas PyMEs usan para gestionar contactos,
        // pedidos e inventario. Este nodo permite leer/escribir sin que cambien su sistema.
        'Airtable': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const apiKey = cfg.apiKey || process.env.AIRTABLE_API_KEY;
            const baseId = cfg.baseId;
            const table  = cfg.table;
            if (!apiKey || !baseId || !table) { console.log(`[Engine] ⚠️  Airtable — falta apiKey, baseId o table`); return ctx; }
            try {
                const url = cfg.action === 'read'
                    ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?maxRecords=${cfg.maxRecords||10}`
                    : `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
                const opts = cfg.action === 'read'
                    ? { headers: { 'Authorization': `Bearer ${apiKey}` } }
                    : { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fields: cfg.fields || {} }) };
                const res  = await fetch(url, opts);
                const data = await res.json();
                console.log(`[Engine] 📊 Airtable — ${cfg.action||'write'} completado`);
                return { ...ctx, _airtableResult: data };
            } catch(e) { console.error(`[Engine] ❌ Airtable error: ${e.message}`); return ctx; }
        },

        // Supabase — PostgreSQL + Auth + Storage gratis
        // Por qué: Si en el futuro escalamos o necesitamos una DB en la nube para un cliente,
        // Supabase es el mejor plan gratuito disponible. Este nodo también lee/escribe.
        'Supabase': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const url    = cfg.supabaseUrl  || process.env.SUPABASE_URL;
            const apiKey = cfg.supabaseKey  || process.env.SUPABASE_ANON_KEY;
            if (!url || !apiKey || !cfg.table) { console.log(`[Engine] ⚠️  Supabase — configuración incompleta`); return ctx; }
            try {
                const endpoint = `${url}/rest/v1/${cfg.table}`;
                const headers  = { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
                let res;
                if (cfg.action === 'select') {
                    res = await fetch(`${endpoint}?select=*&limit=${cfg.limit||10}`, { headers });
                } else {
                    res = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' }, body: JSON.stringify(cfg.data || {}) });
                }
                const data = await res.json();
                console.log(`[Engine] 🟢 Supabase — ${cfg.action||'insert'} en tabla "${cfg.table}"`);
                return { ...ctx, _supabaseResult: data };
            } catch(e) { console.error(`[Engine] ❌ Supabase error: ${e.message}`); return ctx; }
        },

        // Google Sheets — leer/escribir en hojas de cálculo compartidas
        // Por qué: Es el formato de datos más universal. Clientes, reportes, inventarios.
        // Este nodo ya tienes la API configurada en el server. Lo conectamos directamente.
        'Google Sheets': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 📗 Google Sheets — acción "${cfg.action||'append'}" en hoja "${cfg.sheetName}"`);
            // Integración real via googleapis (ya tienes las credenciales en .env)
            // Implementación completa se conecta al sheetsRoutes existente
            return { ...ctx, _sheetsAction: cfg.action };
        },

        // Notion — crear páginas, bases de datos de contenido
        // Por qué: Muchos equipos creativos y clientes usan Notion como CMS/wiki.
        // Crear páginas automáticamente desde un flujo es muy poderoso para reportes y documentación.
        'Notion': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const apiKey = cfg.apiKey || process.env.NOTION_API_KEY;
            if (!apiKey || !cfg.databaseId) { console.log(`[Engine] ⚠️  Notion — falta apiKey o databaseId`); return ctx; }
            try {
                const res = await fetch('https://api.notion.com/v1/pages', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        parent: { database_id: cfg.databaseId },
                        properties: cfg.properties || { Name: { title: [{ text: { content: cfg.title || 'Nueva entrada' } }] } }
                    })
                });
                const data = await res.json();
                console.log(`[Engine] 📓 Notion — página creada: ${data.id}`);
                return { ...ctx, _notionPageId: data.id };
            } catch(e) { console.error(`[Engine] ❌ Notion error: ${e.message}`); return ctx; }
        },

        // Cal.com — sistema de citas open source, alternativa gratuita a Calendly
        // Por qué: Calendly cuesta $10/mes. Cal.com es gratis y más personalizable.
        // Este nodo puede crear/leer disponibilidad sin depender de servicios de pago.
        'Cal.com': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const apiKey = cfg.apiKey || process.env.CALCOM_API_KEY;
            if (!apiKey) { console.log(`[Engine] ⚠️  Cal.com — falta CALCOM_API_KEY`); return ctx; }
            try {
                const res = await fetch(`https://api.cal.com/v1/${cfg.endpoint || 'bookings'}`, {
                    method: cfg.method || 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    ...(cfg.body ? { body: JSON.stringify(cfg.body) } : {})
                });
                const data = await res.json();
                console.log(`[Engine] 📅 Cal.com — ${cfg.endpoint||'bookings'} consultado`);
                return { ...ctx, _calResult: data };
            } catch(e) { console.error(`[Engine] ❌ Cal.com error: ${e.message}`); return ctx; }
        },

        // ── REDES SOCIALES ────────────────────────────────────────────────────

        // YouTube Data API — subir videos, actualizar títulos, leer métricas
        // Por qué: YouTube es el segundo buscador del mundo. Subir videos automáticamente
        // desde el flujo de producción (Generador Video → Editor → YouTube) es el sueño.
        'YouTube Data API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🎥 YouTube Data API — acción: ${cfg.action || 'list'}`);
            // La subida real requiere OAuth + resumable upload (implementar con googleapis)
            return { ...ctx, _youtubeAction: cfg.action };
        },

        // Pinterest API — crear pins automáticamente
        // Por qué: Pinterest tiene 500M de usuarios y es un motor de búsqueda visual.
        // Para marcas de lifestyle, comida, moda, decoración es oro puro. Completamente automatizable.
        'Pinterest API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const token = cfg.accessToken || process.env.PINTEREST_ACCESS_TOKEN;
            if (!token) { console.log(`[Engine] ⚠️  Pinterest — falta accessToken`); return ctx; }
            try {
                const res = await fetch('https://api.pinterest.com/v5/pins', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ board_id: cfg.boardId, title: cfg.title, description: cfg.description,
                        media_source: { source_type: 'image_url', url: cfg.imageUrl || ctx._imageUrl } })
                });
                const data = await res.json();
                console.log(`[Engine] 📌 Pinterest — pin creado: ${data.id}`);
                return { ...ctx, _pinterestPinId: data.id };
            } catch(e) { console.error(`[Engine] ❌ Pinterest error: ${e.message}`); return ctx; }
        },

        // Facebook Ads API — crear/gestionar campañas de Meta Ads
        // Por qué: Meta Ads es el canal de publicidad paga más usado. Automatizar la creación
        // de anuncios basado en el contenido generado es el siguiente nivel de monetización.
        'Facebook Ads API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 📘 Facebook Ads API — acción: ${cfg.action || 'read'}`);
            return { ...ctx, _fbAdsAction: cfg.action };
        },

        // ── PAGOS ─────────────────────────────────────────────────────────────

        // Stripe Webhook — procesar pagos recibidos
        // Por qué: Cuando alguien paga, el flujo puede automáticamente crear su cuenta,
        // enviarle un email de bienvenida, asignarle tareas, etc. Sin intervención manual.
        'Stripe Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 💳 Stripe Webhook — evento: ${ctx.type || cfg.event || 'payment_intent.succeeded'}`);
            if (ctx.type === 'payment_intent.succeeded' || cfg.event === 'any') {
                return { ...ctx, _paymentReceived: true, _amount: ctx.data?.object?.amount };
            }
            return ctx;
        },

        // ── ANALÍTICA ─────────────────────────────────────────────────────────

        // Google Analytics — enviar eventos de conversión
        // Por qué: Trackear cuándo un flujo genera una venta, lead o acción importante
        // sin que el equipo tenga que hacerlo manualmente. GA4 Measurement Protocol es gratuito.
        'Google Analytics': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const measurementId = cfg.measurementId || process.env.GA_MEASUREMENT_ID;
            const apiSecret     = cfg.apiSecret     || process.env.GA_API_SECRET;
            if (!measurementId || !apiSecret) { console.log(`[Engine] ⚠️  Google Analytics — falta config`); return ctx; }
            try {
                await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
                    method: 'POST',
                    body: JSON.stringify({ client_id: cfg.clientId || 'godzilla-server', events: [{ name: cfg.eventName || 'automation_triggered', params: { value: 1, ...cfg.params } }] })
                });
                console.log(`[Engine] 📊 Google Analytics — evento "${cfg.eventName || 'automation_triggered'}" enviado`);
            } catch(e) { console.error(`[Engine] ❌ GA error: ${e.message}`); }
            return ctx;
        },

        // RSS Feed — leer feeds de noticias para el Trends Bot
        // Por qué: Mantenerse al día de tendencias de la industria sin pagar Feedly.
        // El flujo puede leer RSS → pasar a Gemini → generar contenido basado en tendencias actuales.
        'RSS Feed': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.url) { console.log(`[Engine] ⚠️  RSS Feed — sin URL`); return ctx; }
            try {
                const res  = await fetch(cfg.url);
                const text = await res.text();
                const items = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>|<title>(.+?)<\/title>/g)]
                    .slice(1, (cfg.limit||5)+1)
                    .map(m => (m[1] || m[2] || '').trim());
                console.log(`[Engine] 📰 RSS Feed — ${items.length} artículos leídos de ${cfg.url}`);
                return { ...ctx, _rssFeedItems: items };
            } catch(e) { console.error(`[Engine] ❌ RSS error: ${e.message}`); return ctx; }
        },

        // ── CONTROL DE FLUJO AVANZADO ─────────────────────────────────────────

        // Delay / Espera — pausar el flujo un tiempo
        // Por qué: Necesario para no saturar APIs con rate limits, o para enviar un
        // mensaje de follow-up 24h después de una conversión sin depender de crons.
        'Delay / Espera': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const ms  = (cfg.seconds || 0) * 1000 + (cfg.minutes || 0) * 60000;
            if (ms > 0 && ms <= 300000) { // máximo 5 minutos para no bloquear
                console.log(`[Engine] ⏳ Delay — esperando ${ms}ms`);
                await new Promise(r => setTimeout(r, ms));
            }
            return ctx;
        },

        // Loop / Iterador — procesar cada elemento de un array
        // Por qué: Cuando el plan tiene 30 días y quieres procesar cada uno individualmente
        // con lógica diferente, el Loop lo hace sin repetir código.
        'Loop / Iterador': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const array = ctx[cfg.arrayField || 'plan'] || [];
            console.log(`[Engine] 🔄 Loop / Iterador — ${array.length} elementos en "${cfg.arrayField || 'plan'}"`);
            return { ...ctx, _loopItems: array, _loopCount: array.length };
        },

        // Merge / Combinar — unir resultados de múltiples ramas del flujo
        // Por qué: Cuando tienes dos ramas paralelas (ej. generar imagen Y video al mismo tiempo)
        // y quieres combinar sus resultados antes de enviarlo al publicador.
        'Merge / Combinar': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🔀 Merge — combinando contexto`);
            return { ...ctx, _merged: true };
        },

        // Set Variables — guardar datos temporales con nombre
        // Por qué: En flujos complejos necesitas guardar resultados intermedios con nombres
        // descriptivos (ej. _customerName, _invoiceId) para usarlos en nodos posteriores.
        'Set Variables': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const vars = cfg.variables || {};
            console.log(`[Engine] 📝 Set Variables — asignando ${Object.keys(vars).length} variables`);
            return { ...ctx, ...vars };
        },

        // PDF Generator — generar PDFs de contratos, reportes, facturas
        // Por qué: Automatizar la generación de documentos es una de las tareas más demandadas.
        // Contrato firmado → PDF generado → Email enviado. Sin intervención humana.
        'PDF Generator': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 📄 PDF Generator — generando "${cfg.filename || 'documento.pdf'}"`);
            // Implementación real usa puppeteer/playwright para generar PDFs desde HTML
            // puppeteer ya está en el server (usado para IG bot)
            return { ...ctx, _pdfGenerated: true, _pdfFilename: cfg.filename || 'documento.pdf' };
        },

        // Google Calendar API — crear eventos en calendarios externos de clientes
        // Por qué: Diferente al Calendario Global propio. Este se conecta al Google Calendar
        // del cliente directamente para crear/leer citas en SU calendar personal.
        'Google Calendar API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 📅 Google Calendar API — evento: "${cfg.summary || 'Nueva cita'}"`);
            // Usa el calendarService.js existente que ya tienes
            return { ...ctx, _gcalAction: cfg.action || 'create' };
        },

        // ── DEFAULT ───────────────────────────────────────────────────────────

        '_default': async (node, ctx) => {
            console.log(`[Engine] ℹ️  Nodo "${node.title}" — solo visual (sin acción programada)`);
            return ctx;
        }
    };

    // ─── Orden Topológico ─────────────────────────────────────────────────────
    // BFS desde el nodo origen, respetando las conexiones del grafo
    static topologicalSort(nodes, edges, startId) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const visited = new Set();
        const order   = [];

        const dfs = (id) => {
            if (visited.has(id)) return;
            visited.add(id);
            // Primero visitar los nodos que este id necesita (dependencias hacia atrás)
            // Para topológico de izq a derecha simplemente visitamos los sucesores al final
            order.push(id);
            edges.filter(e => e.source === id).forEach(e => dfs(e.target));
        };

        dfs(startId);
        return order.map(id => nodeMap.get(id)).filter(Boolean);
    }

    // ─── Ejecutar un camino desde un nodo ────────────────────────────────────
    static async _executeNodePath(nodes, edges, startNodeId, inputPayload, runId, runLog) {
        const executionOrder = this.topologicalSort(nodes, edges, startNodeId);
        console.log(`[Engine] Orden: ${executionOrder.map(n => n.title).join(' → ')}`);

        let ctx = { ...inputPayload };

        for (const node of executionOrder) {
            const t0 = Date.now();
            try {
                const action = this.NODE_ACTIONS[node.title] || this.NODE_ACTIONS['_default'];
                ctx = await action(node, ctx);
                runLog.push({ node: node.title, status: 'success', ms: Date.now() - t0 });
                console.log(`[Engine] ✅ ${node.title} — ${Date.now() - t0}ms`);
            } catch (e) {
                runLog.push({ node: node.title, status: 'error', error: e.message, ms: Date.now() - t0 });
                console.error(`[Engine] ❌ ${node.title} falló: ${e.message}`);
                // Continuamos con el siguiente nodo (tolerancia a fallos)
            }
        }

        return ctx;
    }

    // ─── Entry Point: disparar por título de nodo ─────────────────────────────
    // Busca en TODOS los flujos el nodo origen (no solo el primero)
    static async triggerFlow(sourceTitle, inputPayload = {}, flowId = null) {
        const t0 = Date.now();
        let runId = null;

        try {
            console.log(`\n[Engine] ════ FLUJO INICIADO desde: "${sourceTitle}" ════`);

            let rows;
            if (flowId) {
                const r = await pool.query('SELECT id, nodes, edges FROM automation_flow WHERE id=$1', [flowId]);
                rows = r.rows;
            } else {
                // Busca en TODOS los flujos el que contenga el nodo origen
                const r = await pool.query('SELECT id, nodes, edges FROM automation_flow WHERE jsonb_array_length(nodes) > 0');
                rows = r.rows.filter(row => (row.nodes || []).some(n => n.title === sourceTitle));
            }

            if (!rows.length) {
                console.log(`[Engine] Nodo "${sourceTitle}" no encontrado en ningún flujo.`);
                return;
            }

            for (const { id: fId, nodes, edges } of rows) {
                // runLog aislado por cada flujo/fuente
                const runLog = [];
                const sourceNodes = nodes.filter(n => n.title === sourceTitle);
                if (!sourceNodes.length) continue;

                const { rows: [{ id }] } = await pool.query(
                    `INSERT INTO flow_runs (flow_id, status, source) VALUES ($1, 'running', $2) RETURNING id`,
                    [fId, sourceTitle]
                );
                runId = id;

                for (const src of sourceNodes) {
                    await this._executeNodePath(nodes, edges, src.id, inputPayload, runId, runLog);
                }

                await pool.query(
                    `UPDATE flow_runs SET status='success', finished_at=NOW(), duration_ms=$1, log=$2 WHERE id=$3`,
                    [Date.now() - t0, JSON.stringify(runLog), runId]
                );
                invalidateFlowCache(fId);
            }
            console.log(`[Engine] ════ FLUJO COMPLETADO en ${Date.now() - t0}ms ════\n`);

        } catch (err) {
            console.error('[Engine] Error fatal:', err.message);
            if (runId) {
                await pool.query(
                    `UPDATE flow_runs SET status='error', finished_at=NOW(), log=$1 WHERE id=$2`,
                    [JSON.stringify([{ node:'engine', status:'error', error: err.message }]), runId]
                );
            }
        }
    }

    // ─── Entry Point: disparar por ID de nodo (webhooks externos) ────────────
    static async triggerNode(nodeId, inputPayload = {}, flowId = 1) {
        const t0 = Date.now();
        const runLog = [];
        let runId = null;

        try {
            console.log(`\n[Engine] ════ FLUJO INICIADO desde NODO ID: "${nodeId}" ════`);

            const result = await pool.query(
                'SELECT id, nodes, edges FROM automation_flow WHERE id = $1', [flowId]
            );
            if (!result.rows.length) { console.log(`[Engine] Flujo ${flowId} no encontrado.`); return; }

            const { id: fId, nodes, edges } = result.rows[0];
            const sourceNode = nodes.find(n => n.id === nodeId);
            if (!sourceNode) { console.log(`[Engine] Nodo "${nodeId}" no encontrado.`); return; }

            const { rows: [{ id }] } = await pool.query(
                `INSERT INTO flow_runs (flow_id, status, source) VALUES ($1,'running',$2) RETURNING id`,
                [fId, sourceNode.title]
            );
            runId = id;

            await this._executeNodePath(nodes, edges, sourceNode.id, inputPayload, runId, runLog);

            await pool.query(
                `UPDATE flow_runs SET status='success', finished_at=NOW(), duration_ms=$1, log=$2 WHERE id=$3`,
                [Date.now() - t0, JSON.stringify(runLog), runId]
            );
            console.log(`[Engine] ════ FLUJO COMPLETADO en ${Date.now() - t0}ms ════\n`);

        } catch (err) {
            console.error('[Engine] Error en triggerNode:', err.message);
            if (runId) {
                await pool.query(
                    `UPDATE flow_runs SET status='error', finished_at=NOW(), log=$1 WHERE id=$2`,
                    [JSON.stringify([...runLog, { node:'engine', status:'error', error: err.message }]), runId]
                );
            }
        }
    }

    // ─── Registrar un nuevo tipo de nodo en caliente ──────────────────────────
    // Para extender sin tocar el archivo: AutomationEngine.registerAction('Mi Nodo', fn)
    static registerAction(title, fn) {
        this.NODE_ACTIONS[title] = fn;
        console.log(`[Engine] 🔌 Nodo "${title}" registrado dinámicamente`);
    }
}

export default AutomationEngine;
