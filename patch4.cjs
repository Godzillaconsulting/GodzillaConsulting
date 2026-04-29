const fs = require('fs');
let content = fs.readFileSync('server/services/automationEngine.js', 'utf8');

const startIndex = content.indexOf('        \'Anthropic Claude\': async (node, ctx) => {');
const endIndex = content.indexOf('        \'Base de Datos\': async (node, ctx) => {');

if (startIndex !== -1 && endIndex !== -1) {
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
        },

`;
  content = content.substring(0, startIndex) + insertStr + content.substring(endIndex);
  fs.writeFileSync('server/services/automationEngine.js', content, 'utf8');
  console.log('Successfully updated automationEngine.js (Group B) using substring method.');
} else {
  console.log('Indexes not found', startIndex, endIndex);
}
