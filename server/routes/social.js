import express from 'express';

const router = express.Router();

// Pequeño caché en memoria para no spamear a Mark Zuckerberg y evitar baneos de API (Rate Limits)
let metaCache = null;
let lastMetaFetch = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 Hora de gracia

router.get('/meta', async (req, res) => {
    try {
        const token = process.env.PAGE_ACCESS_TOKEN;
        if (!token) {
            return res.status(500).json({ success: false, error: 'No PAGE_ACCESS_TOKEN set in .env' });
        }

        // Si tenemos el caché caliente, lo escupimos inmediatamente
        if (metaCache && (Date.now() - lastMetaFetch < CACHE_TTL)) {
            console.log('[SOCIAL API] Sirviendo métricas Meta desde CACHÉ local');
            return res.json({ success: true, fromCache: true, data: metaCache });
        }

        console.log('[SOCIAL API] Contactando servidores de Meta Graph...');
        
        // Petición a Graph API V19
        const url = `https://graph.facebook.com/v19.0/me?fields=id,name,fan_count,followers_count,instagram_business_account{id,username,followers_count,media_count}&access_token=${token}`;
        
        const graphRes = await fetch(url);
        const fbData = await graphRes.json();

        if (fbData.error) {
            console.error('[SOCIAL API] Error desde Meta:', fbData.error.message);
            return res.status(502).json({ success: false, error: fbData.error.message });
        }

        const stats = {
            fb: {
                id: fbData.id,
                name: fbData.name,
                followers: fbData.followers_count || fbData.fan_count || 0,
            },
            ig: null
        };

        if (fbData.instagram_business_account) {
            const igData = fbData.instagram_business_account;
            stats.ig = {
                id: igData.id,
                username: igData.username,
                followers: igData.followers_count || 0,
                posts: igData.media_count || 0
            };
        }

        // Renovar el Caché
        metaCache = stats;
        lastMetaFetch = Date.now();

        res.json({ success: true, fromCache: false, data: stats });

    } catch (error) {
        console.error('[SOCIAL SERVER ERROR]:', error);
        res.status(500).json({ success: false, error: 'Internal server proxy error' });
    }
});

export default router;
