/**
 * api/proxy.js — Función Serverless de Vercel
 * Actúa como proxy transparente hacia bot.godzillaconsulting.ai
 * Supera el bloqueo de Cloudflare que rechaza rewrites directos de Vercel Edge
 */

const BACKEND = 'https://bot.godzillaconsulting.ai';

export default async function handler(req, res) {
    // Reconstruir la ruta original: /api/proxy?path=chat => /api/chat
    const subpath = req.query.path || '';
    const targetUrl = `${BACKEND}/api/${subpath}`;

    // Pasar query params adicionales (excluyendo 'path' que es nuestro)
    const extraParams = Object.entries(req.query)
        .filter(([k]) => k !== 'path')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    const finalUrl = extraParams ? `${targetUrl}?${extraParams}` : targetUrl;

    try {
        // Construir headers a pasar al backend (filtrar los que Vercel inyecta)
        const PROXY_SECRET = process.env.PROXY_SECRET || 'Zilla-5uper-S3cr3t-2026';
        const forwardHeaders = {
            'Content-Type': req.headers['content-type'] || 'application/json',
            'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            'X-Vercel-Proxy': '1', 
            'X-Vercel-Proxy-Secret': PROXY_SECRET
        };
        if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

        // Body: solo para métodos que lo admiten. Pasamos el stream crudo directo
        let body = undefined;
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            body = req;
        }

        const backendRes = await fetch(finalUrl, {
            method: req.method,
            headers: forwardHeaders,
            body,
            signal: AbortSignal.timeout(55000), // 55s < 60s maxDuration
        });

        // Copiar status y headers de respuesta relevantes
        res.status(backendRes.status);
        const ct = backendRes.headers.get('content-type');
        if (ct) res.setHeader('Content-Type', ct);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');

        // Stream la respuesta soportando archivos binarios
        const arrayBuffer = await backendRes.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (err) {
        console.error('[PROXY ERROR]', err.message);
        res.status(502).json({ error: 'Proxy Error: ' + err.message });
    }
}

// Configuración de Vercel para deshabilitar el body parser automático y permitir forwarding de streams (como subidas de archivos)
export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};
