export const maxDuration = 60; // Configuración nativa Vercel

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const bodyStr = JSON.stringify(req.body);

        console.log(`[PROXY] Forwarding to: https://bot.godzillaconsulting.ai${req.url}`);
        
        const response = await fetch(`https://bot.godzillaconsulting.ai${req.url}`, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                // Agregar User-Agent y bypass de browser stuff para que CF lo vea como server auth
                'User-Agent': 'Vercel-Serverless-Proxy/1.0'
            },
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : bodyStr
        });

        const data = await response.json();
        
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[PROXY] Error forwarding request:', error);
        return res.status(500).json({ error: 'Proxy forwarding failed', message: error.message });
    }
}
