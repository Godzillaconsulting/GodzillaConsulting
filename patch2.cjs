const fs = require('fs');
let content = fs.readFileSync('server/services/automationEngine.js', 'utf8');

const targetStr = `        'Make (Integromat)': async (node, ctx) => {`;

const insertStr = `
        'Base de Datos': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            if (!cfg.query) { console.log('[Engine] ⚠️ Base de Datos — sin query configurada'); return ctx; }
            try {
                let params = [];
                if (cfg.params) {
                    try { params = typeof cfg.params === 'string' ? JSON.parse(cfg.params) : cfg.params; } catch(e){}
                }
                const result = await pool.query(cfg.query, params);
                console.log(\`[Engine] 🗄️ Base de Datos — Query ejecutada (\${result.rowCount} filas)\`);
                return { ...ctx, _dbResult: result.rows };
            } catch (e) {
                console.error(\`[Engine] ❌ Base de Datos error: \${e.message}\`);
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
                const url = \`https://api.telegram.org/bot\${token}/sendMessage\`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text })
                });
                console.log(\`[Engine] ✈️ Telegram Bot — status: \${res.status}\`);
                return { ...ctx, _telegramStatus: res.status };
            } catch (e) {
                console.error(\`[Engine] ❌ Telegram error: \${e.message}\`);
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
                const url = \`https://api.twilio.com/2010-04-01/Accounts/\${sid}/Messages.json\`;
                
                const data = new URLSearchParams();
                data.append('To', to);
                data.append('From', from);
                data.append('Body', body);

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': 'Basic ' + Buffer.from(sid + ':' + auth).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: data
                });
                console.log(\`[Engine] 📱 Twilio SMS — status: \${res.status}\`);
                return { ...ctx, _twilioStatus: res.status };
            } catch(e) {
                console.error(\`[Engine] ❌ Twilio error: \${e.message}\`);
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
            } catch(e) { console.error(\`[Engine] ❌ Discord error: \${e.message}\`); }
            return ctx;
        },

        'Slack Webhook': async (node, ctx) => {
            const cfg = AutomationEngine.evaluateConfig(node.config, ctx);
            const url = cfg.webhookUrl;
            if (!url || !cfg.message) return ctx;
            try {
                await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ text: cfg.message }) });
                console.log('[Engine] 💬 Slack Webhook — disparado');
            } catch(e) { console.error(\`[Engine] ❌ Slack error: \${e.message}\`); }
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
                console.log(\`[Engine] 📧 Brevo Email — status: \${res.status}\`);
            } catch(e) { console.error(\`[Engine] ❌ Brevo error: \${e.message}\`); }
            return ctx;
        },

` + targetStr;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, insertStr);
  fs.writeFileSync('server/services/automationEngine.js', content, 'utf8');
  console.log('Successfully updated automationEngine.js (Group A)');
} else {
  console.error('Target string not found!');
}
