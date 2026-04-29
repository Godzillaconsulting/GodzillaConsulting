const fs = require('fs');
let content = fs.readFileSync('server/services/automationEngine.js', 'utf8');

const targetStr = `        'Anthropic Claude': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(\`[Engine] 🧠 Claude API — Prompt: "\${cfg.prompt}"\`);
            return { ...ctx, _claudeResult: \`Mock Claude response for: \${cfg.prompt}\` };
        },

        'OpenAI / ChatGPT': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(\`[Engine] 🧠 OpenAI API — Prompt: "\${cfg.prompt}"\`);
            return { ...ctx, _openaiResult: \`Mock OpenAI response for: \${cfg.prompt}\` };
        },

        'DeepSeek API': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(\`[Engine] 🧠 DeepSeek API — Prompt: "\${cfg.prompt}"\`);
            return { ...ctx, _deepseekResult: \`Mock DeepSeek response\` };
        },

        'ElevenLabs': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(\`[Engine] 🗣️ ElevenLabs — Text: "\${cfg.text}", Voice: \${cfg.voiceId}\`);
            return { ...ctx, _audioUrl: \`https://mock.elevenlabs.io/audio.mp3\` };
        },

        'Notion': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(\`[Engine] 🗄 Notion — Insertando en DB: \${cfg.databaseId}\`);
            return { ...ctx, _notionStatus: 'success' };
        },`;

const insertStr = `        'Anthropic Claude': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.prompt) { console.log('[Engine] ⚠️ Claude API — sin prompt configurado'); return ctx; }
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const waterfallRes = await executeAiWaterfall([{ role: 'user', content: cfg.prompt }], { 
                    overrideProvider: 'anthropic', model: 'claude-3-5-sonnet-20241022' 
                });
                return { ...ctx, _claudeResult: waterfallRes.content };
            } catch (e) {
                console.error(\`[Engine] ❌ Claude error: \${e.message}\`);
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
                console.error(\`[Engine] ❌ OpenAI error: \${e.message}\`);
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
                console.error(\`[Engine] ❌ DeepSeek error: \${e.message}\`);
                return { ...ctx, _deepseekError: e.message };
            }
        },

        'ElevenLabs': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const voiceId = cfg.voiceId;
            const text = cfg.text;
            if (!voiceId || !text || !process.env.ELEVENLABS_API_KEY) { console.log('[Engine] ⚠️ ElevenLabs — falta configuración'); return ctx; }
            try {
                const url = \`https://api.elevenlabs.io/v1/text-to-speech/\${voiceId}\`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" })
                });
                if (!res.ok) throw new Error(\`ElevenLabs returned \${res.status}\`);
                const arrayBuffer = await res.arrayBuffer();
                // En un caso real, guardarías este buffer en S3/R2 o localmente y retornarías la URL pública.
                // Simularemos retornando que se generó correctamente.
                console.log(\`[Engine] 🗣️ ElevenLabs — Audio generado correctamente (\${arrayBuffer.byteLength} bytes)\`);
                return { ...ctx, _audioGenerated: true, _audioBytes: arrayBuffer.byteLength };
            } catch (e) {
                console.error(\`[Engine] ❌ ElevenLabs error: \${e.message}\`);
                return { ...ctx, _elevenLabsError: e.message };
            }
        },

        'Notion': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.databaseId) { console.log('[Engine] ⚠️ Notion — sin base de datos configurada'); return ctx; }
            try {
                // Aquí iría la llamada real al SDK de Notion. Por simplicidad usamos fetch directo
                const res = await fetch('https://api.notion.com/v1/pages', {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${process.env.NOTION_API_KEY}\`,
                        'Notion-Version': '2022-06-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        parent: { database_id: cfg.databaseId },
                        properties: {
                            // Este es un payload de ejemplo
                            Name: { title: [ { text: { content: cfg.title || 'Nueva Entrada' } } ] }
                        }
                    })
                });
                console.log(\`[Engine] 🗄️ Notion — status: \${res.status}\`);
                return { ...ctx, _notionStatus: res.status };
            } catch (e) {
                console.error(\`[Engine] ❌ Notion error: \${e.message}\`);
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
                console.log(\`[Engine] ⚡ Make Webhook disparado — \${res.status}\`);
                return { ...ctx, _makeStatus: res.status };
            } catch(e) { console.error(\`[Engine] ❌ Make error: \${e.message}\`); return ctx; }
        },

        'Zapier Webhook': async (node, ctx) => {
            return AutomationEngine.NODE_ACTIONS['Make (Integromat)'](node, ctx);
        },

        'Transformador JSON': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.mapping) return ctx;
            try {
                const mapObj = typeof cfg.mapping === 'string' ? JSON.parse(cfg.mapping) : cfg.mapping;
                console.log(\`[Engine] 🔄 Transformador JSON ejecutado\`);
                return { ...ctx, _transformedData: mapObj };
            } catch(e) {
                console.error(\`[Engine] ❌ Transformador JSON error: \${e.message}\`);
                return ctx;
            }
        },

        'Merge / Combinar': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            console.log(\`[Engine] 🔀 Merge / Combinar ejecutado con estrategia: \${cfg.strategy || 'append'}\`);
            return { ...ctx, _mergeStrategy: cfg.strategy };
        },`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, insertStr);
  fs.writeFileSync('server/services/automationEngine.js', content, 'utf8');
  console.log('Successfully updated automationEngine.js (Group B)');
} else {
  console.error('Target string not found!');
  console.log('File content snapshot:', content.substring(content.indexOf('Anthropic Claude') - 50, content.indexOf('Anthropic Claude') + 500));
}
