import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';

// Apuntar ffmpeg al binario incluido en el paquete
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// ─── Directorios ─────────────────────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;
const UPLOADS_BASE = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
const UPLOADS_DIR  = UPLOADS_BASE;
const IMAGES_DIR   = path.join(UPLOADS_DIR, 'images');
const VIDEOS_DIR   = path.join(UPLOADS_DIR, 'videos');
const TEMP_DIR     = path.join(UPLOADS_DIR, 'temp');

[UPLOADS_DIR, IMAGES_DIR, VIDEOS_DIR, TEMP_DIR].forEach(dir => {
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
});

// ─── Tipos de archivos que se aceptan ────────────────────────────────────────
// Imágenes: cualquier cosa que sharp pueda procesar (jpeg, png, gif, webp, avif, heic, heif, tiff, bmp, jfif...)
// Vídeos: cualquier contenedor que ffmpeg pueda convertir (mp4, mov, avi, mkv, webm, ts, flv...)
const IMAGE_MIMES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/avif', 'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
    'image/svg+xml', 'image/x-jfif', 'image/jfif', 'image/pjpeg',
];
const VIDEO_MIMES = [
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'video/x-msvideo', 'video/x-matroska', 'video/x-flv', 'video/avi',
    'video/mpeg', 'video/3gpp', 'video/3gpp2', 'video/x-ms-wmv',
    'video/hevc', 'video/mov',
];
// Extensiones de fallback cuando el MIME no coincide exactamente
const VIDEO_EXTS = ['.mp4','.webm','.mov','.avi','.mkv','.flv','.wmv','.ts','.m4v','.3gp','.mpeg','.mpg','.hevc'];

const isVideoFile = (mimetype, originalname) => {
    if (VIDEO_MIMES.includes(mimetype)) return true;
    const ext = path.extname(originalname).toLowerCase();
    return VIDEO_EXTS.includes(ext);
};

// ─── Multer: guarda siempre en /temp con nombre UUID ─────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_DIR),
    filename: (_req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase() || '.bin';
        cb(null, `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    // Aceptamos TODO — la validación se hace en el handler
    fileFilter: (_req, _file, cb) => cb(null, true),
});

// ─── URL pública ──────────────────────────────────────────────────────────────
const getPublicUrl = (req, relativePath) => {
    const base = process.env.PUBLIC_MEDIA_URL || `${req.protocol}://${req.get('host')}`;
    return `${base}/media/${relativePath}`;
};

// ─── Convertir imagen a WebP con sharp ───────────────────────────────────────
function convertImageToWebp(inputPath, outputPath) {
    return sharp(inputPath)
        .webp({ quality: 88 })
        .toFile(outputPath);
}

// ─── Convertir video a MP4 (h264) con ffmpeg ─────────────────────────────────
function convertVideoToMp4(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264',
                '-preset fast',
                '-crf 23',
                '-c:a aac',
                '-b:a 128k',
                '-movflags +faststart',
                '-pix_fmt yuv420p',
            ])
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

// ─── POST /api/media/upload ───────────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const tempPath  = req.file.path;
    const mimetype  = req.file.mimetype;
    const origName  = req.file.originalname;
    const isVideo   = isVideoFile(mimetype, origName);

    const uid       = `${Date.now()}-${uuidv4().substring(0, 8)}`;
    let finalPath, relPath, fileType;

    try {
        if (isVideo) {
            // ── Video → MP4 ──────────────────────────────────────────────────
            const outName = `${uid}.mp4`;
            finalPath     = path.join(VIDEOS_DIR, outName);
            relPath       = `videos/${outName}`;
            fileType      = 'video';

            console.log(`[Media] Convirtiendo video: ${origName} → ${outName}`);
            await convertVideoToMp4(tempPath, finalPath);
            console.log(`[Media] Conversión de video completada.`);
        } else {
            // ── Imagen → WebP ────────────────────────────────────────────────
            const outName = `${uid}.webp`;
            finalPath     = path.join(IMAGES_DIR, outName);
            relPath       = `images/${outName}`;
            fileType      = 'image';

            console.log(`[Media] Convirtiendo imagen: ${origName} → ${outName}`);
            await convertImageToWebp(tempPath, finalPath);
            console.log(`[Media] Conversión de imagen completada.`);
        }

        // Limpiar archivo temporal
        fs.unlink(tempPath, () => {});

        const url = getPublicUrl(req, relPath);
        const size = fs.statSync(finalPath).size;

        res.json({ success: true, url, filename: path.basename(finalPath), type: fileType, size, mimetype: isVideo ? 'video/mp4' : 'image/webp' });

    } catch (err) {
        console.error('[Media] Error en conversión:', err.message);
        // Limpiar temporales
        fs.unlink(tempPath, () => {});
        if (finalPath) fs.unlink(finalPath, () => {});
        res.status(500).json({ error: `Error al procesar el archivo: ${err.message}` });
    }
});

// ─── GET /api/media ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    const listDir = (dir, type) => {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir)
            .filter(f => !f.startsWith('.'))
            .map(f => {
                const stat = fs.statSync(path.join(dir, f));
                return { filename: f, url: getPublicUrl(req, `${type}/${f}`), type, size: stat.size, createdAt: stat.birthtime };
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
    if (!['images', 'videos'].includes(type)) return res.status(400).json({ error: 'Tipo inválido.' });
    const safe = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, type, safe);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado.' });
    fs.unlinkSync(filePath);
    console.log(`[Media] Archivo eliminado: ${type}/${safe}`);
    res.json({ success: true, deleted: `${type}/${safe}` });
});

export default router;
