import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// ─── Vercel usa /tmp (único dir writable), local usa ./server/uploads ────────
const IS_VERCEL = !!process.env.VERCEL;
const UPLOADS_BASE = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
const UPLOADS_DIR  = UPLOADS_BASE;
const IMAGES_DIR   = path.join(UPLOADS_DIR, 'images');
const VIDEOS_DIR   = path.join(UPLOADS_DIR, 'videos');

[UPLOADS_DIR, IMAGES_DIR, VIDEOS_DIR].forEach(dir => {
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
});

// ─── Multer: guardado inteligente por tipo ───────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isVideo = file.mimetype.startsWith('video/');
        cb(null, isVideo ? VIDEOS_DIR : IMAGES_DIR);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
        ];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
});

// URL pública de los medios (ajustar según el entorno)
const getPublicUrl = (req, relativePath) => {
    // Usa env var si está definida (ej: tunnel URL), de lo contrario usa la request origin
    const base = process.env.PUBLIC_MEDIA_URL
        || `${req.protocol}://${req.get('host')}`;
    return `${base}/media/${relativePath}`;
};

// ─── POST /api/media/upload ──────────────────────────────────────────────────
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }
    const isVideo = req.file.mimetype.startsWith('video/');
    const subDir  = isVideo ? 'videos' : 'images';
    const relPath = `${subDir}/${req.file.filename}`;
    const url     = getPublicUrl(req, relPath);

    console.log(`[Media] Archivo subido: ${req.file.filename} (${Math.round(req.file.size / 1024)} KB)`);
    res.json({
        success: true,
        url,
        filename: req.file.filename,
        type: isVideo ? 'video' : 'image',
        size: req.file.size,
        mimetype: req.file.mimetype,
    });
});

// ─── GET /api/media ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    const listDir = (dir, type) => {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir)
            .filter(f => !f.startsWith('.'))
            .map(f => {
                const stat = fs.statSync(path.join(dir, f));
                return {
                    filename: f,
                    url: getPublicUrl(req, `${type}/${f}`),
                    type,
                    size: stat.size,
                    createdAt: stat.birthtime,
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };

    const images = listDir(IMAGES_DIR, 'images');
    const videos = listDir(VIDEOS_DIR, 'videos');
    res.json({ images, videos, total: images.length + videos.length });
});

// ─── DELETE /api/media/:type/:filename ───────────────────────────────────────
router.delete('/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    if (!['images', 'videos'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido.' });
    }
    // Prevent path traversal
    const safe = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, type, safe);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado.' });
    }
    fs.unlinkSync(filePath);
    console.log(`[Media] Archivo eliminado: ${type}/${safe}`);
    res.json({ success: true, deleted: `${type}/${safe}` });
});

export default router;
