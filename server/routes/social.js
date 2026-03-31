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

        console.log('[SOCIAL API] Contactando servidores de Meta Graph para métricas profundas (Modo Seguro)...');
        
        // Paso 1: Petición segurísima a Graph API V19 (Datos Base)
        const baseUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,fan_count,followers_count,instagram_business_account{id,username,followers_count,media_count}&access_token=${token}`;
        
        const graphRes = await fetch(baseUrl);
        const fbData = await graphRes.json();

        if (fbData.error) {
            console.error('[SOCIAL API] Error Crítico desde Meta (Token base):', fbData.error.message);
            return res.status(502).json({ success: false, error: fbData.error.message });
        }

        const stats = {
            fb: {
                id: fbData.id,
                name: fbData.name,
                followers: fbData.followers_count || fbData.fan_count || 0,
                posts: []
            },
            ig: null
        };

        if (fbData.instagram_business_account) {
            const igData = fbData.instagram_business_account;
            stats.ig = {
                id: igData.id,
                username: igData.username,
                followers: igData.followers_count || 0,
                postsCount: igData.media_count || 0,
                posts: []
            };
        }

        // Paso 2: Extraer posts de FB (Protegido contra Error #283 pages_read_engagement)
        try {
            const fbPostsUrl = `https://graph.facebook.com/v19.0/${fbData.id}/published_posts?limit=100&fields=id,created_time,message,likes.summary(true),comments.summary(true),permalink_url&access_token=${token}`;
            const fbPostsRes = await fetch(fbPostsUrl);
            const fbPostsData = await fbPostsRes.json();
            
            if (fbPostsData.data) {
                stats.fb.posts = fbPostsData.data.map(p => ({
                    id: p.id,
                    timestamp: p.created_time,
                    caption: p.message || 'Sin título',
                    likes: p.likes?.summary?.total_count || 0,
                    comments: p.comments?.summary?.total_count || 0,
                    url: p.permalink_url,
                    media_type: 'POST'
                }));
            } else if(fbPostsData.error) {
                 console.warn('[SOCIAL API - FB Posts] Permisos insuficientes o error:', fbPostsData.error.message);
            }
        } catch(e) { console.warn('[SOCIAL API] No se pudieron cargar los posts FB', e.message); }

        // Paso 3: Extraer posts IG (Protegido contra Error #10 / insights permissions)
        if (stats.ig?.id) {
             try {
                 const igPostsUrl = `https://graph.facebook.com/v19.0/${stats.ig.id}/media?limit=100&fields=id,timestamp,caption,media_type,media_url,thumbnail_url,like_count,comments_count,permalink&access_token=${token}`;
                 const igPostsRes = await fetch(igPostsUrl);
                 const igPostsData = await igPostsRes.json();
                 
                 if (igPostsData.data) {
                     stats.ig.posts = igPostsData.data.map(m => ({
                         id: m.id,
                         timestamp: m.timestamp,
                         caption: m.caption || 'Sin título',
                         media_type: m.media_type,
                         media_url: m.thumbnail_url || m.media_url, // Preferir thumbnail si es video
                         likes: m.like_count || 0,
                         comments: m.comments_count || 0,
                         url: m.permalink
                     }));
                 } else if(igPostsData.error) {
                      console.warn('[SOCIAL API - IG Posts] Permisos insuficientes o error:', igPostsData.error.message);
                 }
             } catch(e) { console.warn('[SOCIAL API] No se pudieron cargar los posts IG', e.message); }
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
