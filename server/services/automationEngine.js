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

        // Router (Condición) / Switch — detiene la rama si no coincide
        'Router / Switch': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const field = cfg.field;
            const value = cfg.value;
            const match = ctx[field] === value || String(ctx[field]) === String(value);
            console.log(`[Engine] 🔀 Router — ${field}=${ctx[field]} ${match ? '→ MATCH' : '❌ NO MATCH (Deteniendo rama)'}`);
            return { ...ctx, _haltBranch: !match, _routerMatch: match };
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
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const waterfallRes = await executeAiWaterfall([
                    { role: 'user', content: prompt }
                ], { temperature: 0.85 });
                
                let result = null;
                const raw = waterfallRes.content || '[]';
                const clean = raw.replace(/```json\n?/gi,'').replace(/```\n?/gi,'').trim();
                
                try { 
                    result = JSON.parse(clean); 
                } catch { 
                    result = { response: clean }; 
                }
                
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
            if (!cfg.prompt) { console.log('[Engine] ⚠️ Claude API — sin prompt configurado'); return ctx; }
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const waterfallRes = await executeAiWaterfall([{ role: 'user', content: cfg.prompt }], { 
                    overrideProvider: 'anthropic', model: 'claude-3-5-sonnet-20241022' 
                });
                return { ...ctx, _claudeResult: waterfallRes.content };
            } catch (e) {
                console.error(`[Engine] ❌ Claude error: ${e.message}`);
                return { ...ctx, _claudeError: e.message };
            }
        },

        'OpenAI / ChatGPT': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.prompt) { console.log('[Engine] ⚠️ OpenAI API — sin prompt configurado'); return ctx; }
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const waterfallRes = await executeAiWaterfall([{ role: 'user', content: cfg.prompt }], { 
                    overrideProvider: 'openai', model: cfg.model || 'gpt-4o' 
                });
                return { ...ctx, _openaiResult: waterfallRes.content };
            } catch (e) {
                console.error(`[Engine] ❌ OpenAI error: ${e.message}`);
                return { ...ctx, _openaiError: e.message };
            }
        },

        'DeepSeek API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.prompt) { console.log('[Engine] ⚠️ DeepSeek API — sin prompt configurado'); return ctx; }
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const waterfallRes = await executeAiWaterfall([{ role: 'user', content: cfg.prompt }], { 
                    overrideProvider: 'deepseek', model: cfg.model || 'deepseek-chat' 
                });
                return { ...ctx, _deepseekResult: waterfallRes.content };
            } catch (e) {
                console.error(`[Engine] ❌ DeepSeek error: ${e.message}`);
                return { ...ctx, _deepseekError: e.message };
            }
        },

        'ElevenLabs': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const voiceId = cfg.voiceId;
            const text = cfg.text;
            if (!voiceId || !text || !process.env.ELEVENLABS_API_KEY) { console.log('[Engine] ⚠️ ElevenLabs — falta configuración'); return ctx; }
            try {
                const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" })
                });
                if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}`);
                const arrayBuffer = await res.arrayBuffer();
                console.log(`[Engine] 🗣️ ElevenLabs — Audio generado correctamente (${arrayBuffer.byteLength} bytes)`);
                return { ...ctx, _audioGenerated: true, _audioBytes: arrayBuffer.byteLength };
            } catch (e) {
                console.error(`[Engine] ❌ ElevenLabs error: ${e.message}`);
                return { ...ctx, _elevenLabsError: e.message };
            }
        },

        'Notion': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.databaseId) { console.log('[Engine] ⚠️ Notion — sin base de datos configurada'); return ctx; }
            try {
                const res = await fetch('https://api.notion.com/v1/pages', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        parent: { database_id: cfg.databaseId },
                        properties: {
                            Name: { title: [ { text: { content: cfg.title || 'Nueva Entrada' } } ] }
                        }
                    })
                });
                console.log(`[Engine] 🗄️ Notion — status: ${res.status}`);
                return { ...ctx, _notionStatus: res.status };
            } catch (e) {
                console.error(`[Engine] ❌ Notion error: ${e.message}`);
                return { ...ctx, _notionError: e.message };
            }
        },

        'Make (Integromat)': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.webhookUrl) return ctx;
            try {
                let payload = {};
                try { payload = cfg.payload ? JSON.parse(cfg.payload) : { data: 'ping' }; } catch(e){}
                const res = await fetch(cfg.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                console.log(`[Engine] ⚡ Make Webhook disparado — ${res.status}`);
                return { ...ctx, _makeStatus: res.status };
            } catch(e) { console.error(`[Engine] ❌ Make error: ${e.message}`); return ctx; }
        },

        'Zapier Webhook': async (node, ctx) => {
            return AutomationEngine.NODE_ACTIONS['Make (Integromat)'](node, ctx);
        },

        'Transformador JSON': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.mapping) return ctx;
            try {
                const mapObj = typeof cfg.mapping === 'string' ? JSON.parse(cfg.mapping) : cfg.mapping;
                console.log(`[Engine] 🔄 Transformador JSON ejecutado`);
                return { ...ctx, _transformedData: mapObj };
            } catch(e) {
                console.error(`[Engine] ❌ Transformador JSON error: ${e.message}`);
                return ctx;
            }
        },

        'Merge / Combinar': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(`[Engine] 🔀 Merge / Combinar ejecutado con estrategia: ${cfg.strategy || 'append'}`);
            return { ...ctx, _mergeStrategy: cfg.strategy };
        },

        'Base de Datos': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.query) { console.log('[Engine] ⚠️ Base de Datos — sin query configurada'); return ctx; }
            try {
                let params = [];
                if (cfg.params) {
                    try { params = typeof cfg.params === 'string' ? JSON.parse(cfg.params) : cfg.params; } catch(e){}
                }
                const result = await pool.query(cfg.query, params);
                console.log(`[Engine] 🗄️ Base de Datos — Query ejecutada (${result.rowCount} filas)`);
                return { ...ctx, _dbResult: result.rows };
            } catch (e) {
                console.error(`[Engine] ❌ Base de Datos error: ${e.message}`);
                return { ...ctx, _dbError: e.message };
            }
        },

        'Neon DB': async (node, ctx) => {
            // Usa la misma conexión por defecto ya que usamos Neon en este proyecto
            return AutomationEngine.NODE_ACTIONS['Base de Datos'](node, ctx);
        },

        'Telegram Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const token = cfg.botToken || process.env.TELEGRAM_BOT_TOKEN;
            const chatId = cfg.chatId;
            const text = cfg.message;
            if (!token || !chatId || !text) { console.log('[Engine] ⚠️ Telegram Bot — falta configuración'); return ctx; }
            try {
                const url = `https://api.telegram.org/bot${token}/sendMessage`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text })
                });
                console.log(`[Engine] ✈️ Telegram Bot — status: ${res.status}`);
                return { ...ctx, _telegramStatus: res.status };
            } catch (e) {
                console.error(`[Engine] ❌ Telegram error: ${e.message}`);
                return ctx;
            }
        },

        'Twilio SMS': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const to = cfg.to;
            const body = cfg.message;
            if (!to || !body || !process.env.TWILIO_ACCOUNT_SID) { console.log('[Engine] ⚠️ Twilio SMS — falta configuración'); return ctx; }
            try {
                const sid = process.env.TWILIO_ACCOUNT_SID;
                const auth = process.env.TWILIO_AUTH_TOKEN;
                const from = process.env.TWILIO_FROM;
                const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
                
                const data = new URLSearchParams();
                data.append('To', to);
                data.append('From', from);
                data.append('Body', body);

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': 'Basic ' + Buffer.from(sid + ':' + auth).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: data
                });
                console.log(`[Engine] 📱 Twilio SMS — status: ${res.status}`);
                return { ...ctx, _twilioStatus: res.status };
            } catch(e) {
                console.error(`[Engine] ❌ Twilio error: ${e.message}`);
                return ctx;
            }
        },

        'Discord Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const url = cfg.webhookUrl;
            if (!url || !cfg.message) return ctx;
            try {
                await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ content: cfg.message }) });
                console.log('[Engine] 👾 Discord Webhook — disparado');
            } catch(e) { console.error(`[Engine] ❌ Discord error: ${e.message}`); }
            return ctx;
        },

        'Slack Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const url = cfg.webhookUrl;
            if (!url || !cfg.message) return ctx;
            try {
                await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ text: cfg.message }) });
                console.log('[Engine] 💬 Slack Webhook — disparado');
            } catch(e) { console.error(`[Engine] ❌ Slack error: ${e.message}`); }
            return ctx;
        },

        'Brevo': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const apiKey = process.env.BREVO_API_KEY || cfg.apiKey;
            if (!apiKey || !cfg.to || !cfg.subject) { console.log('[Engine] ⚠️ Brevo — falta configuración'); return ctx; }
            try {
                const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender: { name: 'Godzilla Studio', email: process.env.EMAIL_USER || 'studio@godzillaconsulting.com' },
                        to: [{ email: cfg.to }],
                        subject: cfg.subject,
                        htmlContent: cfg.html || '<p>Notificación</p>'
                    })
                });
                console.log(`[Engine] 📧 Brevo Email — status: ${res.status}`);
            } catch(e) { console.error(`[Engine] ❌ Brevo error: ${e.message}`); }
            return ctx;
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

        'Paquete de Contenido Social': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            
            // Input: Trends Bot result, Planificador entry, or raw config
            const topic = cfg.topic 
                        || ctx._trendsData?.trending?.[0]?.title 
                        || (ctx.plan?.[0]?.['Tema']) 
                        || 'Tendencia del día';
            const niche = cfg.niche || ctx.niche || 'Marketing Digital';
            const product = cfg.product || ctx._product || null;

            console.log(`[Engine] 📦 Paquete de Contenido Social — Generando para: "${topic}"`);

            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');

                const productLine = product ? ` y el producto/servicio: "${product}"` : '';
                const prompt = `Eres un experto en marketing viral y redes sociales latinoamericanas.
Para el siguiente tema: "${topic}" en el nicho: "${niche}"${productLine}.

Genera un PAQUETE DE CONTENIDO COMPLETO en formato JSON con esta estructura exacta:

{
  "tema": "título del contenido",
  "imagen_prompt": "prompt detallado en inglés para generar una infografía visual viral, estilo moderno, tipografía grande, colores vibrantes, sin texto en español, formato vertical 9:16",
  "tiktok": {
    "descripcion": "descripción viral de máximo 150 caracteres con emojis al inicio",
    "hashtags": ["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5","#hashtag6","#hashtag7","#hashtag8"],
    "musica": "nombre de canción trending en TikTok 2025 que amplifique el mensaje",
    "hook": "primeras 3 palabras del video que detienen el scroll",
    "llamada_accion": "frase para los comentarios / duets"
  },
  "instagram_feed": {
    "caption": "caption con storytelling de 2-3 párrafos + emojis + pregunta al final",
    "hashtags": ["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5","#hashtag6","#hashtag7","#hashtag8","#hashtag9","#hashtag10"],
    "tipo_post": "carrusel o imagen única",
    "musica": "nombre de audio viral para Reels de Instagram 2025"
  },
  "instagram_story": {
    "texto_overlay": "texto corto y poderoso para poner encima de la imagen (máximo 8 palabras)",
    "sticker_sugerido": "tipo de sticker de IG: encuesta / pregunta / cuenta regresiva / quiz",
    "swipe_up_texto": "texto del enlace si aplica"
  },
  "facebook": {
    "post": "publicación para Facebook sin música. Tono profesional/informativo. 2 párrafos + CTA clara.",
    "tipo": "imagen estática o historia sin audio",
    "boost_sugerido": "si se recomienda hacer boost y a qué audiencia"
  },
  "estrategia_viral": "párrafo con la estrategia de publicación: plataforma primero, horario recomendado (hora MX), y por qué esta combinación maximiza el alcance orgánico"
}

Responde SOLO el JSON válido, sin bloques de código markdown.`;

                const aiResponse = await executeAiWaterfall([{ role: 'user', content: prompt }], { temperature: 0.85 });
                
                let paquete = {};
                try {
                    const raw = (aiResponse.content || '').replace(/```json\n?/gi,'').replace(/```\n?/gi,'').trim();
                    paquete = JSON.parse(raw);
                } catch(parseErr) {
                    console.warn('[Engine] ⚠️ Paquete JSON parse failed, returning raw');
                    paquete = { raw: aiResponse.content };
                }

                // Generate the infographic image via Pollinations (free, no API key)
                let imageUrl = null;
                const imgPrompt = paquete.imagen_prompt || `viral infographic about ${topic}, vertical format, bold typography, vibrant neon colors, modern design`;
                const encodedPrompt = encodeURIComponent(imgPrompt);
                imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true&seed=${Date.now()}`;
                console.log(`[Engine] 🖼️  Imagen URL generada vía Pollinations`);

                // Save to studio_tasks for CEO review
                try {
                    const dbModule = await import('../db.js');
                    const pool = dbModule.pool || dbModule.default;
                    await pool.query(
                        `INSERT INTO studio_tasks (titulo, tipo, datos_ia, estado, created_at) VALUES ($1, 'paquete_social', $2, 'pendiente_revision', NOW())`,
                        [paquete.tema || topic, JSON.stringify({ ...paquete, imageUrl })]
                    );
                    console.log('[Engine] 💾 Paquete guardado en studio_tasks para revisión');
                } catch(dbErr) {
                    console.warn('[Engine] ⚠️ No se pudo guardar en DB:', dbErr.message);
                }

                console.log(`[Engine] ✅ Paquete de Contenido Social completado para: "${topic}"`);
                return { 
                    ...ctx, 
                    _contentPackage: { ...paquete, imageUrl, generatedAt: new Date().toISOString(), topic, niche } 
                };

            } catch (e) {
                console.error(`[Engine] ❌ Paquete de Contenido Social error: ${e.message}`);
                return { ...ctx, _contentPackageError: e.message };
            }
        },

        'Trends Bot': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const niche = cfg.niche || ctx.niche || 'Marketing Digital';
            console.log(`[Engine] 📈 Trends Bot — analizando tendencias para: "${niche}"`);
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const response = await executeAiWaterfall([{
                    role: 'user',
                    content: `Eres un analista de tendencias. Dame las 5 tendencias más virales de hoy en el nicho: "${niche}". Responde solo JSON: { "trending": [{ "title": "...", "angle": "...", "virality": "alta|media" }] }`
                }], { temperature: 0.7 });
                const raw = (response.content || '').replace(/```json\n?/gi,'').replace(/```\n?/gi,'').trim();
                const trendsData = JSON.parse(raw);
                console.log(`[Engine] 📈 Trends Bot — ${trendsData.trending?.length || 0} tendencias encontradas`);
                return { ...ctx, _trendsData: trendsData, niche };
            } catch(e) {
                console.error(`[Engine] ❌ Trends Bot error: ${e.message}`);
                return { ...ctx, niche };
            }
        },

        'Bot Newsletter': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const topic = cfg.topic || ctx._trendsData?.trending?.[0]?.title || 'Novedades de la semana';
            const instructions = cfg.instructions || '';
            console.log(`[Engine] 📰 Bot Newsletter — generando para: "${topic}"`);
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const instrLine = instructions ? `Instrucciones extra: ${instructions}` : '';
                const response = await executeAiWaterfall([{
                    role: 'user',
                    content: `Eres un redactor de newsletters premium. Redacta una newsletter completa sobre "${topic}". ${instrLine}\nIncluye: título llamativo, introducción de 2 párrafos, 3 secciones con subtítulos, CTA final. Tono profesional pero cercano en español latino.`
                }], { temperature: 0.75 });
                return { ...ctx, _newsletterContent: response.content };
            } catch(e) {
                console.error(`[Engine] ❌ Bot Newsletter error: ${e.message}`);
                return { ...ctx, _newsletterError: e.message };
            }
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
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        
        // Ejecución BFS Dinámica (Tree-like execution)
        let queue = [ { nodeId: startNodeId, ctx: { ...inputPayload } } ];
        const executed = new Set();
        
        while (queue.length > 0) {
            const { nodeId, ctx } = queue.shift();
            
            // Prevenir loops infinitos puros (aunque en un árbol no debería haber)
            if (executed.has(nodeId)) continue;
            executed.add(nodeId);

            const node = nodeMap.get(nodeId);
            if (!node) continue;

            const t0 = Date.now();
            let newCtx = ctx;
            let haltBranch = false;

            try {
                // Soportar aliases por si cambian de nombre en el UI
                const actionName = node.title === 'Router (Condición)' ? 'Router / Switch' : node.title;
                const action = this.NODE_ACTIONS[actionName] || this.NODE_ACTIONS['_default'];
                
                newCtx = await action(node, ctx);
                
                // Si el nodo decide detener esta rama (ej. condición no cumplida)
                if (newCtx._haltBranch) {
                    haltBranch = true;
                    delete newCtx._haltBranch; // Limpiar para logs
                }
                
                const outputData = {};
                for (const key in newCtx) {
                    if (newCtx[key] !== ctx[key]) outputData[key] = newCtx[key];
                }
                
                newCtx[node.title] = { salida: outputData };
                
                runLog.push({ node: node.title, status: 'success', ms: Date.now() - t0 });
                console.log(`[Engine] ✅ ${node.title} — ${Date.now() - t0}ms`);
            } catch (e) {
                runLog.push({ node: node.title, status: 'error', error: e.message, ms: Date.now() - t0 });
                console.error(`[Engine] ❌ ${node.title} falló: ${e.message}`);
                haltBranch = true; // Error detiene la rama
            }

            // Si la rama no fue detenida (por error o filtro), agregar hijos a la cola
            if (!haltBranch) {
                const children = edges.filter(e => e.source === nodeId);
                for (const edge of children) {
                    queue.push({ nodeId: edge.target, ctx: { ...newCtx } });
                }
            }
        }
        
        return inputPayload; // El contexto final se diluye en ramas, retornamos algo neutral
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
