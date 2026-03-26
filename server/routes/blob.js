import express from 'express';
import { put, list, del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

const router = express.Router();

// ─── POST /api/blob/upload-client ────────────────────────────────────────────
// Endpoint para gestionar tokens de subida directa desde el navegador.
// Esto permite subir archivos grandes (>4.5MB) directamente a Vercel Blob.
router.post('/upload-client', async (req, res) => {
    try {
        const body = req.body;
        const jsonResponse = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                return {
                    allowedContentTypes: [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
                        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
                    ],
                    tokenPayload: JSON.stringify({ source: 'godzilla-admin' })
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log(`[Blob] Client Upload Completado: ${blob.pathname} → ${blob.url}`);
            },
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        res.status(200).json(jsonResponse);
    } catch (error) {
        console.error('[Blob] Error en upload-client:', error);
        res.status(400).json({ error: error.message });
    }
});

// ─── POST /api/blob/upload ───────────────────────────────────────────────────
// Recibe un archivo via multipart form-data y lo sube al Vercel Blob Store.
// Funciona tanto en Vercel (serverless) como en desarrollo local (si BLOB_READ_WRITE_TOKEN está en .env).
router.post('/upload', express.raw({ type: 'application/octet-stream', limit: '500mb' }), async (req, res) => {
    try {
        const filename = req.headers['x-filename'] || `upload-${Date.now()}`;
        const contentType = req.headers['x-content-type'] || 'application/octet-stream';

        const blob = await put(filename, req.body, {
            access: 'public',
            contentType,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        console.log(`[Blob] Subido: ${blob.pathname} (${blob.size || 'unknown'} bytes) → ${blob.url}`);

        res.json({
            success: true,
            url: blob.url,
            pathname: blob.pathname,
            type: contentType.startsWith('video/') ? 'video' : 'image',
            size: blob.size || req.body.length,
        });
    } catch (err) {
        console.error('[Blob] Error al subir:', err);
        res.status(500).json({ error: err.message || 'Error al subir al Blob Store' });
    }
});

// ─── GET /api/blob/list ──────────────────────────────────────────────────────
// Lista todos los archivos del Blob Store
router.get('/list', async (req, res) => {
    try {
        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });

        const images = [];
        const videos = [];

        for (const b of blobs) {
            const ext = (b.pathname.split('.').pop() || '').toLowerCase();
            const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
            const item = {
                filename: b.pathname,
                url: b.url,
                size: b.size,
                createdAt: b.uploadedAt,
                type: isVideo ? 'videos' : 'images',
            };
            if (isVideo) videos.push(item);
            else images.push(item);
        }

        res.json({ images, videos, total: images.length + videos.length });
    } catch (err) {
        console.error('[Blob] Error listando:', err);
        res.status(500).json({ error: err.message || 'Error al listar archivos' });
    }
});

// ─── DELETE /api/blob/delete ─────────────────────────────────────────────────
router.delete('/delete', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL requerida' });

        await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        console.log(`[Blob] Eliminado: ${url}`);
        res.json({ success: true, deleted: url });
    } catch (err) {
        console.error('[Blob] Error eliminando:', err);
        res.status(500).json({ error: err.message || 'Error al eliminar' });
    }
});

export default router;
