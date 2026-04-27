import pool from '../config/db.js';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

class AutomationEngine {

    // ── Cache de flujos en memoria (TTL 30s) ─────────────────────────────────────
    static flowCache = {
        data: null,
        timestamp: 0,
        TTL: 30000
    };

    // ── Catálogo de Acciones de Nodos ───────────────────────────────────────────
    static NODE_ACTIONS = {
        
        // ── ORIGEN: Planificador IA ────────────────────────────────────────────
        'Planificador IA': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (ctx.plan && ctx.plan.length > 0) {
                console.log(`[Engine] 🧠 Planificador IA — plan ya en contexto (${ctx.plan.length} entradas), pasando...`);
                return ctx;
            }

            try {
                const apiKey = process.env.SAMBANOVA_API_KEY;
                if (!apiKey) {
                    console.log(`[Engine] ⚠️  Planificador IA — sin SAMBANOVA_API_KEY`);
                    return ctx;
                }

                const period = cfg.period || 'mes';
                let totalDays = 30;
                if (period === 'semana') totalDays = 7;
                if (period === 'dia') totalDays = 1;

                const blockSize = 5;
                const blocks = Math.ceil(totalDays / blockSize);
                const fullPlan = [];
                const maxTokens = 3500;

                const baseSystemPrompt = `
                    Actúa como un estratega de contenido experto en redes sociales.
                    Nicho de la empresa: "${ctx.niche || 'General'}".
                    Vas a generar contenido para ${blockSize} días consecutivos.
                    El año es ${ctx.year || new Date().getFullYear()} y el mes objetivo es ${ctx.month || 'actual'}.
                    
                    INSTRUCCIONES ESTRICTAS:
                    - Devuelve ÚNICAMENTE un array JSON válido, nada de markdown ni texto extra.
                    - Cada objeto del array representa un día y debe tener esta estructura exacta:
                      {
                        "Tema": "Título del video/post",
                        "NARRACION ESCENA 1": "Texto para TTS de la escena 1",
                        "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "Prompt visual detallado en inglés para generar imagen",
                        "NARRACION ESCENA 2": "...",
                        "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "...",
                        "NARRACION ESCENA 3": "...",
                        "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "...",
                        "NARRACION ESCENA 4": "...",
                        "VISUAL ESCENA 4 (Prompt Imagen Detallado)": "...",
                        "NARRACION ESCENA 5 (CTA)": "Call to action final",
                        "VISUAL ESCENA 5 (Prompt Imagen Detallado)": "Prompt visual de cierre"
                      }
                    - Genera contenido vibrante, para videos verticales rápidos (TikTok/Reels).
                `;

                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');

                const fetchBlock = async (blockIndex) => {
                    const blockPrompt = baseSystemPrompt + `\n\nGenera el bloque de contenido (Días ${blockIndex * blockSize + 1} al ${Math.min((blockIndex + 1) * blockSize, totalDays)}). RESPUESTA SOLO JSON.`;
                    
                    const waterfallRes = await executeAiWaterfall([
                        { role: "system", content: "Eres un estratega de contenido experto en redes sociales. DEBES responder estrictamente con un array JSON válido y nada de markdown." },
                        { role: "user", content: blockPrompt }
                    ], { jsonMode: true, maxTokens: 4000 });
                    
                    const raw  = waterfallRes.content || '[]';
                    const clean = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
                    return JSON.parse(clean);
                };

                console.log(`[Engine] 🧠 Planificador IA — ${period} → ${blocks} bloque(s) de ~${blockSize} días`);
                for (let b = 0; b < blocks; b++) {
                    console.log(`[Engine] Generando bloque ${b+1}/${blocks}...`);
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            const blockData = await fetchBlock(b);
                            fullPlan.push(...blockData);
                            break;
                        } catch (e) {
                            console.warn(`[Engine] Fallo en bloque ${b+1} (intento ${attempt}):`, e.message);
                            if (attempt === 3) throw e;
                            await new Promise(r => setTimeout(r, 2000 * attempt));
                        }
                    }
                }

                console.log(`[Engine] 🎉 Planificador IA — ${fullPlan.length}/${totalDays} días generados`);
                return { ...ctx, plan: fullPlan.slice(0, totalDays) };

            } catch (error) {
                console.error(`[Engine] ❌ Error en Planificador IA: ${error.message}`);
                console.log(`[Engine] ⚠️ Activando Plan de Emergencia (Fallback) para no detener la producción...`);
                return { ...ctx, plan: [{
                    "Tema": `${ctx.niche || 'Contenido'} - Día de Prueba (Emergencia)`,
                    "NARRACION ESCENA 1": `¡Bienvenidos a la mejor actualización de ${ctx.niche || 'hoy'}!`,
                    "VISUAL ESCENA 1 (Prompt Imagen Detallado)": `A cinematic, highly detailed and vibrant professional photography of ${ctx.niche || 'an interesting subject'}, 4k resolution, hyperrealistic`,
                    "NARRACION ESCENA 2 (CTA)": "¡Si te gustó, dale like y síguenos para no perderte nada!",
                    "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "A highly professional and clean end screen background, neon colors, cyberpunk style, cinematic lighting"
                }], _error: error.message };
            }
        },

        // ── ORIGEN: Programador Cron ──────────────────────────────────────────
        'Programador (Cron)': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] ⏰ Cron disparado — expresión: ${cfg.cron || 'inmediato'}`);
            return ctx;
        },

        // ── ORIGEN: Webhook Custom ───────────────────────────────────────────
        'Webhook': async (node, ctx) => {
            console.log(`[Engine] 🪝 Webhook activado — recibiendo payload...`);
            return ctx; // el payload ya viene inyectado en ctx
        },

        // ── ORIGEN: Evento de Base de Datos ──────────────────────────────────
        'Evento DB': async (node, ctx) => {
            console.log(`[Engine] 📦 Evento DB activado — tabla: ${node.config?.table || 'desconocida'}`);
            return ctx;
        },

        // ── TRANSFORMADORES ───────────────────────────────────────────────────

        // Generador Visual — enriquece el plan iterando escenas
        'Generador Visual': async (node, ctx) => {
            if (!ctx.plan) return ctx;
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const enriched = ctx.plan.map(day => {
                const visualJobs = [];
                for (let i=1; i<=5; i++) {
                    const prompt = day[`VISUAL ESCENA ${i} (Prompt Imagen Detallado)`];
                    if (prompt) {
                        visualJobs.push({
                            scene: i,
                            prompt,
                            ratio: cfg.aspectRatio || '9:16',
                            style: cfg.style || 'cinematic'
                        });
                    }
                }
                return { ...day, _visualJobs: visualJobs };
            });
            console.log(`[Engine] 🖼  Generador Visual — ${enriched.reduce((a, d) => a + d._visualJobs.length, 0)} jobs de imagen preparados`);
            return { ...ctx, plan: enriched };
        },

        // Generador Video — enriquece el plan para pasar al worker de Veo/FFmpeg
        'Generador Video': async (node, ctx) => {
            if (!ctx.plan) return ctx;
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const enriched = ctx.plan.map(day => {
                const videoJobs = [];
                for (let i=1; i<=5; i++) {
                    const prompt = day[`VISUAL ESCENA ${i} (Prompt Imagen Detallado)`];
                    if (prompt) {
                        videoJobs.push({
                            scene: i,
                            prompt,
                            model: cfg.model || 'veo-2.0-generate-001',
                            duration: cfg.duration || '00:05'
                        });
                    }
                }
                return { ...day, _videoJobs: videoJobs };
            });
            console.log(`[Engine] 🎬 Generador Video — ${enriched.reduce((a, d) => a + d._videoJobs.length, 0)} jobs de video preparados`);
            return { ...ctx, plan: enriched };
        },

        // Router (Condición) — filtra o desvía si un campo coincide
        'Router (Condición)': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const field = cfg.field;
            const value = cfg.value;
            const match = ctx[field] === value || String(ctx[field]) === String(value);
            console.log(`[Engine] 🔀 Router — ${field}=${ctx[field]} ${match ? '→ MATCH' : '❌ NO MATCH'}`);
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
            const mon = ctx.month ? (monthMap[ctx.month.toLowerCase()] || now.getMonth()) : now.getMonth();

            let created = 0;
            for (let i = 0; i < ctx.plan.length; i++) {
                const day = ctx.plan[i];
                let narrations = '';
                for (let s=1; s<=5; s++) {
                    const n = day[`NARRACION ESCENA ${s}`] || day[`NARRACION ESCENA ${s} (CTA)`];
                    if (n) narrations += n + " ";
                }

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
                        <h1 style="color:#CC0000;margin-bottom:4px">🎬 Godzilla AI Studio</h1>
                        <p style="color:#71717a;margin-bottom:24px">Plan de Contenido Generado Automáticamente</p>
                        <table style="width:100%;border-collapse:collapse;background:#18181b;border-radius:12px;overflow:hidden">
                            <thead><tr style="background:#27272a">
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">DÍA</th>
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">TEMA</th>
                                <th style="padding:12px;text-align:left;color:#71717a;font-size:11px">PREVIEW</th>
                            </tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        <p style="color:#52525b;font-size:12px;margin-top:24px">Godzilla Consulting — Sistema Autónomo</p>
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
                    subject: cfg.subject || '🎬 Godzilla — Notificación Automática',
                    html
                });
                console.log(`[Engine] 📧 Email Worker — enviado a ${to}`);
            } catch (e) {
                console.error(`[Engine] ❌ Email Worker error: ${e.message}`);
            }
            return ctx;
        },

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
                    console.log(`[Engine] 💬 WhatsApp Bot — mensaje encolado para ${to}`);
                } catch (e) {
                    console.error(`[Engine] ❌ WhatsApp Bot error: ${e.message}`);
                }
            } else {
                console.log(`[Engine] ⚠️  WhatsApp Bot — falta 'to' o 'message' en config del nodo`);
            }
            return ctx;
        },

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
                console.log(`[Engine] 🌐 HTTP Request — ${opts.method} ${cfg.url} → ${res.status}`);
                return { ...ctx, _httpResponse: data, _httpStatus: res.status };
            } catch (e) {
                console.error(`[Engine] ❌ HTTP Request error: ${e.message}`);
                return { ...ctx, _httpError: e.message };
            }
        },

        'Gemini API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const prompt = cfg.prompt;
            if (!prompt) { console.log(`[Engine] ⚠️  Gemini API — sin prompt configurado`); return ctx; }

            try {
                const apiKey = process.env.SAMBANOVA_API_KEY;
                if (!apiKey) throw new Error('SAMBANOVA_API_KEY no configurada');
                
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
                        try { result = JSON.parse(clean); } catch { result = { response: clean }; }
                    } catch (e) {
                        console.warn('[Engine] Gemini API intento ' + attempt + '/3: ' + e.message);
                    }
                }
                if (!result) throw new Error('SambaNova no respondio tras 3 intentos');
                return { ...ctx, _geminiResult: result };
            } catch (e) {
                console.error(`[Engine] ❌ Gemini API error: ${e.message}`);
                return { ...ctx, _geminiError: e.message };
            }
        },

        'Google Sheets': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🗄 Google Sheets — Acción: ${cfg.action || 'Leer'}`);
            return { ...ctx, _sheetsAction: cfg.action || 'read' };
        },

        'Google Calendar API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 📅 Google Calendar API — evento: "${cfg.summary || 'Nueva cita'}"`);
            return { ...ctx, _gcalAction: cfg.action || 'create' };
        },

        'Anthropic Claude': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🧠 Claude API — Prompt: "${cfg.prompt}"`);
            return { ...ctx, _claudeResult: `Mock Claude response for: ${cfg.prompt}` };
        },

        'OpenAI / ChatGPT': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🧠 OpenAI API — Prompt: "${cfg.prompt}"`);
            return { ...ctx, _openaiResult: `Mock OpenAI response for: ${cfg.prompt}` };
        },

        'DeepSeek API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🧠 DeepSeek API — Prompt: "${cfg.prompt}"`);
            return { ...ctx, _deepseekResult: `Mock DeepSeek response` };
        },

        'ElevenLabs': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🗣️ ElevenLabs — Text: "${cfg.text}", Voice: ${cfg.voiceId}`);
            return { ...ctx, _audioUrl: `https://mock.elevenlabs.io/audio.mp3` };
        },

        'Notion': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🗄 Notion — Insertando en DB: ${cfg.databaseId}`);
            return { ...ctx, _notionStatus: 'success' };
        },

        'Make (Integromat)': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] ⚡ Make Webhook — URL: ${cfg.webhookUrl}`);
            return { ...ctx, _makeStatus: 'triggered' };
        },

        'Zapier Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] ⚡ Zapier Webhook — URL: ${cfg.webhookUrl}`);
            return { ...ctx, _zapierStatus: 'triggered' };
        },

        '_default': async (node, ctx) => {
            console.log(`[Engine] ℹ️  Nodo "${node.title}" — Acción Genérica ejecutada`);
            return ctx;
        }
    };

    static evaluateConfig(config, ctx) {
        if (!config) return {};
        const evalStr = (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
                const keys = path.trim().split('.');
                let val = ctx;
                for (const k of keys) {
                    if (val == null) break;
                    val = val[k];
                }
                return val !== undefined ? val : '';
            });
        };

        const result = {};
        for (const [k, v] of Object.entries(config)) {
            if (typeof v === 'string') {
                result[k] = evalStr(v);
            } else if (Array.isArray(v)) {
                result[k] = v.map(item => typeof item === 'string' ? evalStr(item) : item);
            } else if (typeof v === 'object' && v !== null) {
                result[k] = this.evaluateConfig(v, ctx);
            } else {
                result[k] = v;
            }
        }
        return result;
    }

    static topologicalSort(nodes, edges, startId) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const visited = new Set();
        const order   = [];

        const dfs = (id) => {
            if (visited.has(id)) return;
            visited.add(id);
            order.push(id);
            edges.filter(e => e.source === id).forEach(e => dfs(e.target));
        };

        dfs(startId);
        return order.map(id => nodeMap.get(id)).filter(Boolean);
    }

    static async _executeNodePath(nodes, edges, startNodeId, inputPayload, runId, runLog) {
        const executionOrder = this.topologicalSort(nodes, edges, startNodeId);
        console.log(`[Engine] Orden: ${executionOrder.map(n => n.title).join(' → ')}`);

        let ctx = { ...inputPayload };

        for (const node of executionOrder) {
            const t0 = Date.now();
            try {
                const action = this.NODE_ACTIONS[node.title] || this.NODE_ACTIONS['_default'];
                const previousKeys = Object.keys(ctx);
                
                const newCtx = await action(node, ctx);
                
                // Extraemos únicamente las variables nuevas o modificadas por este nodo
                // para guardarlas en el namespace del nodo y permitir mapeo {{ Nodo.salida.var }}
                const outputData = {};
                for (const key in newCtx) {
                    if (newCtx[key] !== ctx[key]) {
                        outputData[key] = newCtx[key];
                    }
                }
                
                ctx = newCtx;
                // Guardar la salida bajo el nombre del nodo. 
                // Ejemplo: si el nodo se llama "ElevenLabs", su salida estará en ctx["ElevenLabs"]["salida"]
                ctx[node.title] = { salida: outputData };
                
                runLog.push({ node: node.title, status: 'success', ms: Date.now() - t0 });
                console.log(`[Engine] ✅ ${node.title} — ${Date.now() - t0}ms`);
            } catch (e) {
                runLog.push({ node: node.title, status: 'error', error: e.message, ms: Date.now() - t0 });
                console.error(`[Engine] ❌ ${node.title} falló: ${e.message}`);
            }
        }
        return ctx;
    }

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
                const r = await pool.query('SELECT id, nodes, edges FROM automation_flow WHERE jsonb_array_length(nodes) > 0');
                rows = r.rows.filter(row => (row.nodes || []).some(n => n.title === sourceTitle));
            }

            if (!rows.length) {
                console.log(`[Engine] Nodo "${sourceTitle}" no encontrado en ningún flujo.`);
                return;
            }

            for (const { id: fId, nodes, edges } of rows) {
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

    static registerAction(title, fn) {
        this.NODE_ACTIONS[title] = fn;
        console.log(`[Engine] 🔌 Nodo "${title}" registrado dinámicamente`);
    }
}

export default AutomationEngine;
