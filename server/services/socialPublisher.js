import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const META_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

/**
 * Determinar si la URL es de un Video basado en su extensión.
 */
function isVideoUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.webm');
}

/**
 * Publicar a Meta (Facebook Page &/or Instagram Business Account).
 */
export async function publishToMeta(mediaUrl, caption, networks) {
    const isVideo = isVideoUrl(mediaUrl);
    const results = { instagram: { success: false }, facebook: { success: false } };

    if (!META_ACCESS_TOKEN) {
        return { success: false, error: 'Sin META_ACCESS_TOKEN configurado.' };
    }

    try {
        // 1. Obtener IDs (Page & IG Account) usando el token
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,instagram_business_account&access_token=${META_ACCESS_TOKEN}`).then(r => r.json());
        
        if (meRes.error) throw new Error(meRes.error.message);
        
        const pageId = meRes.id;
        const igUserId = meRes.instagram_business_account?.id;

        // 2. Publicar en Instagram (Si se requiere y existe cuenta conectada)
        if (networks.includes('instagram')) {
            if (!igUserId) {
                results.instagram = { success: false, error: 'No hay cuenta de IG Business atada a la Page de Meta.' };
            } else {
                try {
                    let containerReqUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
                    let containerBody = { caption, access_token: META_ACCESS_TOKEN };
                    
                    if (isVideo) {
                        containerBody.media_type = 'REELS';
                        containerBody.video_url = mediaUrl;
                    } else {
                        containerBody.image_url = mediaUrl;
                    }

                    // Paso A: Crear contenedor
                    let containerRes = await fetch(containerReqUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(containerBody)
                    }).then(r => r.json());

                    if (containerRes.error) throw new Error(containerRes.error.message);
                    
                    const creationId = containerRes.id;

                    // Para videos, la API real requiere un POLLING hasta que el video esté "FINISHED" procesando.
                    // Aquí simplificaremos esperando agresivamente unos segundos si es video (modo síncrono rápido o un intento)
                    if (isVideo) {
                        await new Promise(r => setTimeout(r, 8000)); // Esperar a Meta encoding
                    }

                    // Paso B: Publicar contenedor
                    let publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creation_id: creationId, access_token: META_ACCESS_TOKEN })
                    }).then(r => r.json());

                    if (publishRes.error && publishRes.error.code === 9007 && isVideo) {
                         // Si sigue procesando, dar un intento más largo
                         await new Promise(r => setTimeout(r, 10000));
                         publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ creation_id: creationId, access_token: META_ACCESS_TOKEN })
                         }).then(r => r.json());
                    }

                    if (publishRes.error) throw new Error(publishRes.error.message);
                    results.instagram = { success: true, id: publishRes.id };

                } catch (e) {
                    results.instagram = { success: false, error: e.message };
                }
            }
        }

        // 3. Publicar en Facebook Page
        if (networks.includes('facebook') && pageId) {
            try {
                let fbReqUrl = `https://graph.facebook.com/v19.0/${pageId}`;
                let fbBody = { description: caption, access_token: META_ACCESS_TOKEN };
                
                if (isVideo) {
                    fbReqUrl += '/videos';
                    fbBody.file_url = mediaUrl;
                } else {
                    fbReqUrl += '/photos';
                    fbBody.url = mediaUrl;
                    fbBody.message = caption; // Fb photos api usa 'message'
                }

                let fbRes = await fetch(fbReqUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fbBody)
                }).then(r => r.json());

                if (fbRes.error) throw new Error(fbRes.error.message);
                results.facebook = { success: true, id: fbRes.id };
            } catch (e) {
                results.facebook = { success: false, error: e.message };
            }
        }

        return { success: true, report: results };
    } catch (error) {
        return { success: false, error: error.message, report: results };
    }
}

/**
 * Publicar a TikTok (Content Posting API)
 * Funciona preferentemente con Video, y según scopes para Photo Carousel.
 */
export async function publishToTikTok(mediaUrl, caption) {
    if (!TIKTOK_ACCESS_TOKEN) {
        return { success: false, error: 'Sin TIKTOK_ACCESS_TOKEN configurado.' };
    }
    
    // NOTA: La API Content Posting de TikTok exige CORS origin pulling o Direct Upload. 
    // Dado que el archivo de mediaUrl ya existe en la red abierta, se enviará directo a los servidores de TikTok si es compatible.
    const isVideo = isVideoUrl(mediaUrl);

    try {
        let endpoint = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
        let payload = {};

        if (isVideo) {
            payload = {
                post_info: {
                    title: caption,
                    privacy_level: 'PUBLIC_TO_EVERYONE',
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false
                },
                source_info: { source: "PULL_FROM_URL", video_url: mediaUrl }
            };
        } else {
            endpoint = 'https://open.tiktokapis.com/v2/post/publish/content/init/';
            payload = {
                post_info: {
                    title: caption,
                    privacy_level: 'PUBLIC_TO_EVERYONE',
                    disable_comment: false
                },
                source_info: { source: "PULL_FROM_URL", photo_images: [mediaUrl] },
                post_mode: "DIRECT_POST",
                media_type: "PHOTO"
            };
        }

        const tkRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${TIKTOK_ACCESS_TOKEN}`, 
                'Content-Type': 'application/json; charset=UTF-8' 
            },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (tkRes.error && tkRes.error.code !== 'ok') {
            throw new Error(tkRes.error.message || tkRes.error.code);
        }

        return { success: true, id: tkRes.data?.publish_id || 'tiktok_queued' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
