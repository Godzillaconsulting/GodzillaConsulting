import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// ─── Directorio Temporal (Solo para recibir unida de multer) ───────────────
const TEMP_DIR = '/tmp/uploads';
try { if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true }); } catch {}

// ─── Directorio Constante para Archivos Pesados (Bypass Vercel) ───────────
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVOS_PESADOS_DIR = path.join(__dirname, '..', 'uploads', 'assets');
try { if (!fs.existsSync(ARCHIVOS_PESADOS_DIR)) fs.mkdirSync(ARCHIVOS_PESADOS_DIR, { recursive: true }); } catch {}

// ─── Servir Archivos Pesados Locales Estáticamente (Bypass Vercel) ────────
// Cache Infinito de Cloudflare
router.use('/assets', express.static(ARCHIVOS_PESADOS_DIR, {
    maxAge: '1y',
    immutable: true
}));

// ─── Multer para imágenes (10MB → Neon DB BYTEA) ────────────────────────────
const upload = multer({
    dest: TEMP_DIR,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Multer para videos (500MB → Disco local, sin límite de DB) ──────────────
const uploadVideo = multer({
    storage: multer.diskStorage({
        destination: ARCHIVOS_PESADOS_DIR,
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
            const ext = path.extname(file.originalname);
            cb(null, unique + ext);
        }
    }),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Solo se aceptan videos en esta ruta.'));
    }
});

// ─── URL Pública ─────────────────────────────────────────────────────────────
const getPublicUrl = (req, relativePath) => {
    const isDev = process.env.NODE_ENV === 'development';
    const base = isDev ? `http://localhost:${process.env.PORT || 3000}` : '';
    return `${base}/api/media/${relativePath}`;
};

// URL para assets pesados en disco local (accesibles vía Cloudflare Tunnel)
const getAssetUrl = (filename) => {
    const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
    return `${botBase}/api/media/assets/${filename}`;
};

// ─── POST /api/media/upload (Guardar a Neon BYTEA) ──────────────────────────
router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const tempPath = req.file.path;
    const isVideo  = req.file.mimetype.startsWith('video/');

    if (isVideo) {
        if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return res.status(400).json({ error: 'El servidor Neon 🦖 no admite videos. Usa enlaces externos o Github para videos gigantes.' });
    }

    try {
        console.log(`[Media-DB] Absorbiendo imagen: ${req.file.originalname}`);
        const buffer = fs.readFileSync(tempPath);

        const result = await pool.query(
            `INSERT INTO media_storage (filename, mimetype, size, file_data) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [req.file.originalname, req.file.mimetype, req.file.size, buffer]
        );

        const newId = result.rows[0].id;
        const publicUrl = getPublicUrl(req, `file/${newId}`);

        console.log(`[Media-DB] Éxito: Guardado con UUID ${newId}`);

        // Destruir archivo temporal para liberar /tmp en Vercel
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        res.json({ 
            success: true, 
            url: publicUrl, 
            filename: newId, // Pasamos el UUID para que AdminStudio sepa como borrarlo
            type: 'image', 
            size: req.file.size, 
            mimetype: req.file.mimetype 
        });

    } catch (err) {
        console.error('[Media-DB] Error al inyectar en Base de Datos:', err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ error: `Fallo base de datos: ${err.message}` });
    }
});
// ─── POST /api/media/upload-video (Guardar Video a Disco Local) ─────────────
router.post('/upload-video', requireAdmin, uploadVideo.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió video.' });
    const filename = req.file.filename;
    const publicUrl = getAssetUrl(filename);
    console.log(`[Media-Local] Video guardado en disco: ${filename} (${(req.file.size/1024/1024).toFixed(1)} MB)`);
    res.json({
        success: true,
        url: publicUrl,
        filename,
        type: 'video',
        size: req.file.size,
        mimetype: req.file.mimetype
    });
});

router.get('/file/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT file_data, mimetype FROM media_storage WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).send('Archivo no encontrado');
        }

        const file = result.rows[0];

        // Headers mágicos para decirle al navegador que es una imagen y que la guarde en caché infinito (1 año)
        // Esto salva tu base de datos de ser consultada cada que el usuario recarga la página
        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); 
        
        // Enviar Buffer binario tal cual
        res.send(file.file_data);
    } catch (err) {
        console.error('[Media-DB] Error sirviendo archivo binario:', err);
        res.status(500).send('Error interno leyendo la bóveda');
    }
});

// ─── GET /api/media (Lista de Galería para Admin Studio) ────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, filename, mimetype, size, created_at FROM media_storage ORDER BY created_at DESC');

        const images = result.rows.map(row => ({
            filename: row.id,
            originalName: row.filename,
            url: getPublicUrl(req, `file/${row.id}`),
            type: 'images',
            size: row.size,
            createdAt: row.created_at
        }));

        // Leer videos del disco local
        let videos = [];
        try {
            const videoExts = /\.(mp4|webm|mov|avi|mkv)$/i;
            const diskFiles = fs.readdirSync(ARCHIVOS_PESADOS_DIR)
                .filter(f => videoExts.test(f))
                .map(f => {
                    const stat = fs.statSync(path.join(ARCHIVOS_PESADOS_DIR, f));
                    return {
                        filename: f,
                        originalName: f,
                        url: getAssetUrl(f),
                        type: 'videos',
                        size: stat.size,
                        createdAt: stat.mtime
                    };
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            videos = diskFiles;
        } catch(diskErr) {
            console.warn('[Media-Local] No se pudo leer la carpeta de videos:', diskErr.message);
        }

        res.json({ images, videos, total: images.length + videos.length });
    } catch (err) {
        console.error('[Media-DB] Error consultando lista de galería:', err);
        res.status(500).json({ error: 'Error al consultar archivos' });
    }
});

// ─── DELETE /api/media/:type/:filename ──────────────────────────────────────────
router.delete('/:type/:filename', requireAdmin, async (req, res) => {
    const { type, filename } = req.params;

    if (!filename) return res.status(400).json({ error: 'Falta el nombre del archivo.' });

    // Videos: borrar del disco local
    if (type === 'videos') {
        const filePath = path.join(ARCHIVOS_PESADOS_DIR, filename);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Media-Local] Video eliminado del disco: ${filename}`);
                return res.json({ success: true, deleted: filename });
            } else {
                return res.status(404).json({ error: 'Video no encontrado en disco' });
            }
        } catch (err) {
            return res.status(500).json({ error: `Error borrando del disco: ${err.message}` });
        }
    }

    // Imágenes: borrar de Neon DB
    try {
        const result = await pool.query('DELETE FROM media_storage WHERE id = $1 RETURNING id', [filename]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Archivo inexistente en DB' });
        console.log(`[Media-DB] Archivo evaporado de la DB: ${filename}`);
        res.json({ success: true, deleted: filename });
    } catch (err) {
        console.error('[Media-DB] Error eliminando registro:', err);
        res.status(500).json({ error: 'Fallo al eliminar archivo en la Base de Datos' });
    }
});

export default router;
