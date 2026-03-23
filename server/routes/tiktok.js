/**
 * routes/tiktok.js — TikTok OAuth 2.0 flow en servidor Vercel
 *
 * GET /api/tiktok/auth      → inicia el login de TikTok (redirige al usuario)
 * GET /api/tiktok/callback  → TikTok redirige aquí con el `code`
 */

import express from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI  = 'https://godzillaconsulting.ai/api/tiktok/callback';
const SCOPES        = 'video.list';   // solo lo que está aprobado en sandbox

// Tabla temporal para almacenar pkce state ↔ code_verifier
async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tiktok_oauth_state (
            state TEXT PRIMARY KEY,
            code_verifier TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
}

// ── GET /api/tiktok/auth ──────────────────────────────────────────────────────
router.get('/auth', async (req, res) => {
    if (!CLIENT_KEY) return res.status(500).send('Falta TIKTOK_CLIENT_KEY en variables de entorno.');
    try {
        await ensureTable();
        const codeVerifier  = crypto.randomBytes(64).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        const state         = crypto.randomBytes(16).toString('hex');

        // Guardar state ↔ codeVerifier en DB (expira en 10 min)
        await pool.query(
            `INSERT INTO tiktok_oauth_state (state, code_verifier) VALUES ($1, $2)
             ON CONFLICT (state) DO UPDATE SET code_verifier = $2, created_at = NOW()`,
            [state, codeVerifier]
        );

        const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${CLIENT_KEY}` +
            `&scope=${encodeURIComponent(SCOPES)}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${state}` +
            `&code_challenge=${codeChallenge}` +
            `&code_challenge_method=S256`;

        res.redirect(authUrl);
    } catch(err) {
        console.error('[TikTok OAuth] /auth error:', err.message);
        res.status(500).send('Error iniciando OAuth: ' + err.message);
    }
});

// ── GET /api/tiktok/callback ─────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`<h2>❌ TikTok rechazó: ${error}</h2>`);
    }
    if (!code || !state) {
        return res.status(400).send('<h2>❌ Parámetros inválidos en callback</h2>');
    }

    try {
        await ensureTable();

        // Recuperar code_verifier
        const { rows } = await pool.query(
            'SELECT code_verifier FROM tiktok_oauth_state WHERE state = $1', [state]
        );
        if (!rows.length) return res.status(400).send('<h2>❌ State inválido o expirado. Vuelve a /api/tiktok/auth</h2>');

        const codeVerifier = rows[0].code_verifier;

        // Intercambiar code por tokens
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

        // Limpiar state usado
        await pool.query('DELETE FROM tiktok_oauth_state WHERE state = $1', [state]);

        // Guardar tokens en DB
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tiktok_tokens (
                open_id TEXT PRIMARY KEY,
                access_token TEXT,
                refresh_token TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`
            INSERT INTO tiktok_tokens (open_id, access_token, refresh_token)
            VALUES ($1, $2, $3)
            ON CONFLICT (open_id) DO UPDATE
              SET access_token = $2, refresh_token = $3, updated_at = NOW()
        `, [open_id, access_token, refresh_token]);

        res.send(`
            <html><head><meta charset="utf-8">
            <style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;background:#0a0a0a;color:#e0e0e0;}
            code{background:#1a1a1a;padding:4px 8px;border-radius:4px;color:#4ade80;word-break:break-all;}
            h2{color:#4ade80;}</style></head><body>
            <h2>✅ TikTok autorizado correctamente</h2>
            <p><strong>Open ID:</strong> <code>${open_id}</code></p>
            <p><strong>Access Token:</strong> <code>${access_token}</code></p>
            <p><strong>Refresh Token:</strong> <code>${refresh_token}</code></p>
            <hr>
            <p>Copia estos valores y agrégalos en las variables de entorno de Vercel:</p>
            <pre>TIKTOK_ACCESS_TOKEN=${access_token}
TIKTOK_REFRESH_TOKEN=${refresh_token}
TIKTOK_OPEN_ID=${open_id}</pre>
            <p>Los tokens también fueron guardados en la base de datos. 🦖</p>
            </body></html>
        `);
    } catch(err) {
        console.error('[TikTok OAuth] /callback error:', err.message);
        res.status(500).send('<h2>❌ Error: ' + err.message + '</h2>');
    }
});

export default router;
