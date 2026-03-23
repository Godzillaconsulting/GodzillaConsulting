/**
 * tiktok_oauth.cjs — Setup one-time para autorizar @godzilla_consulting en TikTok
 *
 * Uso: node server/tiktok_oauth.cjs
 * Abre el navegador, autoriza, y guarda los tokens en server/.env
 */

const http    = require('http');
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3003/tiktok/callback';
const SCOPES        = 'comment.read,comment.write,video.list';
const ENV_PATH      = path.join(__dirname, '.env');

if (!CLIENT_KEY || !CLIENT_SECRET) {
    console.error('\n❌ Falta TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET en server/.env');
    console.error('   Agrégalos desde: https://developers.tiktok.com\n');
    process.exit(1);
}

// PKCE
const codeVerifier  = crypto.randomBytes(64).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
const state         = crypto.randomBytes(16).toString('hex');

const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
    `client_key=${CLIENT_KEY}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

console.log('\n🦖 TikTok OAuth 2.0 Setup — Godzilla Consulting\n');
console.log('Abre este enlace en tu navegador:');
console.log('\n' + authUrl + '\n');
console.log('Esperando callback en http://localhost:3001/tiktok/callback...');

// Servidor temporal para capturar el callback
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:3001');
    if (!url.pathname.startsWith('/tiktok/callback')) {
        res.end('Not found'); return;
    }

    const code    = url.searchParams.get('code');
    const errparam = url.searchParams.get('error');

    if (errparam) {
        res.writeHead(400); res.end(`Error: ${errparam}`);
        console.error('❌ TikTok rechazó la autorización:', errparam);
        server.close(); return;
    }
    if (!code) { res.end('No code received'); return; }

    console.log('\n✅ Código recibido, intercambiando por tokens...');

    try {
        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: CLIENT_KEY,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier
            })
        });
        const data = await tokenRes.json();

        if (data.error) throw new Error(data.error_description || data.error);

        const { access_token, refresh_token, open_id } = data;

        // Guardar en .env
        let envContent = fs.readFileSync(ENV_PATH, 'utf8');
        const update = (key, value) => {
            if (envContent.includes(`${key}=`)) {
                envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        };
        update('TIKTOK_ACCESS_TOKEN', access_token);
        update('TIKTOK_REFRESH_TOKEN', refresh_token);
        update('TIKTOK_OPEN_ID', open_id);
        fs.writeFileSync(ENV_PATH, envContent);

        console.log(`✅ Tokens guardados en server/.env`);
        console.log(`   Open ID: ${open_id}`);
        console.log(`   Access token: ${access_token.substring(0, 20)}...`);
        console.log('\n✅ SETUP COMPLETADO. Ahora arranca el bot con:');
        console.log('   pm2 start ecosystem.config.cjs --only tiktok-bot\n');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>✅ TikTok autorizado correctamente. Puedes cerrar esta ventana.</h2>`);
    } catch(err) {
        console.error('❌ Error al obtener tokens:', err.message);
        res.writeHead(500); res.end('Error: ' + err.message);
    }
    server.close();
});

server.listen(3003);
