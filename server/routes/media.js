import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// ─── Configuración de Cloudinary ──────────────────────────────────────────────
// Asegúrate de definir estas credenciales en tu backend (.env) y en Vercel.
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// ─── Directorio Temporal (Solo para recibir antes de subir) ──────────────────
const TEMP_DIR = '/tmp/uploads';
try { if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true }); } catch {}

// ─── Multer ──────────────────────────────────────────────────────────────────
const upload = multer({
    dest: TEMP_DIR,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB límite por precaución
});

// ─── POST /api/media/upload ───────────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const tempPath = req.file.path;
    const isVideo  = req.file.mimetype.startsWith('video/');

    try {
        console.log(`[Media] Subiendo a Cloudinary: ${req.file.originalname}`);
        // Subir a Cloudinary (resource_type: 'auto' autodetecta imágenes o videos)
        const result = await cloudinary.uploader.upload(tempPath, {
            folder: 'godzilla_media',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
        });

        console.log(`[Media] Éxito: ${result.secure_url}`);

        // Limpiar archivo temporal
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        res.json({ 
            success: true, 
            url: result.secure_url, 
            filename: result.public_id, // Usamos public_id como filename para poder borrarlo luego
            type: isVideo ? 'video' : 'image', 
            size: result.bytes, 
            mimetype: req.file.mimetype 
        });

    } catch (err) {
        console.error('[Media] Error al subir a Cloudinary:', err);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ error: `Fallo Cloudinary: ${err.message}` });
    }
});

// ─── GET /api/media ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        // Validar que las credenciales existan para no crashear
        if (!process.env.CLOUDINARY_API_KEY) {
            return res.json({ images: [], videos: [], total: 0, warning: 'Cloudinary no configurado' });
        }

        // Buscar todos los recursos en la carpeta godzilla_media
        const searchResult = await cloudinary.search
            .expression('folder:godzilla_media')
            .sort_by('created_at', 'desc')
            .max_results(500)
            .execute();

        const items = searchResult.resources || [];
        
        const images = [];
        const videos = [];

        items.forEach(item => {
            const isVideo = item.resource_type === 'video';
            const mappedItem = {
                filename: item.public_id, // Identificador único necesario para el DELETE
                url: item.secure_url,
                type: isVideo ? 'videos' : 'images', // Plural por compatibilidad preexistente
                size: item.bytes,
                createdAt: item.created_at
            };

            if (isVideo) videos.push(mappedItem);
            else images.push(mappedItem);
        });

        res.json({ images, videos, total: images.length + videos.length });
    } catch (err) {
        console.error('[Media] Error leyendo Cloudinary:', err);
        res.status(500).json({ error: 'Error al consultar archivos' });
    }
});

// ─── DELETE /api/media/:type/:filename ───────────────────────────────────────
router.delete('/:type/:filename(*)', async (req, res) => {
    // El filename aquí en realidad debe ser el `public_id` de Cloudinary.
    // Usamos (.*) por si tiene barras /godzilla_media/nombre
    const public_id = req.params.filename;
    const type = req.params.type; 

    if (!public_id) {
        return res.status(400).json({ error: 'Falta el public_id (filename).' });
    }

    try {
        const isVideo = type === 'videos';
        // En Cloudinary hay que especificar el resource_type exacto para destruir un video
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: isVideo ? 'video' : 'image'
        });

        if (result.result !== 'ok') {
            console.log(`[Media] Aviso: No se eliminó (Cloudinary devolvió ${result.result})`);
        } else {
            console.log(`[Media] Archivo destruido: ${public_id}`);
        }

        res.json({ success: true, deleted: public_id, status: result.result });
    } catch (err) {
        console.error('[Media] Error eliminando en Cloudinary:', err);
        res.status(500).json({ error: 'Fallo al eliminar archivo en Cloudinary' });
    }
});

export default router;
