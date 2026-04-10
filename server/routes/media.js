import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import pool from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// ─── Directorio Temporal (Solo para recibir unida de multer) ───────────────
const TEMP_DIR = process.env.VERCEL ? '/tmp/uploads' : path.join(os.tmpdir(), 'godzilla-uploads');
try { if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true }); } catch {}

// ─── Directorio Constante para Archivos Pesados (Bypass Vercel) ───────────
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Forza la subida a un disco/partición específica y garantizada
let ARCHIVOS_PESADOS_DIR = 'E:/assets';
try {
    if (!fs.existsSync(ARCHIVOS_PESADOS_DIR)) {
        fs.mkdirSync(ARCHIVOS_PESADOS_DIR, { recursive: true });
    }
} catch (e) {
    if (e.code === 'EROFS' || e.code === 'EACCES' || e.code === 'ENOENT') {
        // Fallback fallback si E: está deshabilitado
        ARCHIVOS_PESADOS_DIR = path.join(os.tmpdir(), 'godzilla-assets');
        try { if (!fs.existsSync(ARCHIVOS_PESADOS_DIR)) fs.mkdirSync(ARCHIVOS_PESADOS_DIR, { recursive: true }); } catch (_) {}
    } else {
        console.error("Error creating E:/assets uploads dir", e);
    }
}

// ─── Servir Archivos Pesados Locales Estáticamente (Bypass Vercel) ────────
// Cache Infinito de Cloudflare
router.use('/assets', express.static(ARCHIVOS_PESADOS_DIR, {
    maxAge: '1y',
    immutable: true
}));

// ─── Multer para imágenes (10MB → Local DB BYTEA) ────────────────────────────
const upload = multer({
    dest: TEMP_DIR,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Multer para videos (500MB → Disco local, sin límite de DB) ──────────────
const uploadVideo = multer({
    storage: multer.diskStorage({
        // Función asíncrona: previene que multer llame a mkdirSync(string) en el primer ciclo del event loop (Evita Vercel 500)
        destination: (req, file, cb) => {
            const dest = ARCHIVOS_PESADOS_DIR;
            // Asegurar creación asíncrona sin bloquear el arranque
            fs.mkdir(dest, { recursive: true }, (err) => {
                // EROFS / ENOENT fallará aquí pero en ejecución, no en BOOT.
                if (err && err.code !== 'EEXIST') {
                    console.error('[Media] No se pudo crear directorio destino:', err);
                    // Fallback de emergencia
                    return cb(null, process.env.VERCEL ? '/tmp' : os.tmpdir());
                }
                cb(null, dest);
            });
        },
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
            const ext = path.extname(file.originalname);
            cb(null, unique + ext);
        }
    }),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    fileFilter: (req, file, cb) => {
        const isVideo = file.mimetype.startsWith('video/');
        const isDocMime = file.mimetype.match(/(pdf|msword|excel|powerpoint|officedocument|csv)/i);
        const isDocExt = file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv)$/i);
        
        if (isVideo || isDocMime || isDocExt) {
            cb(null, true);
        } else {
            cb(new Error('Solo se aceptan videos o documentos válidos. Formato recibido: ' + file.mimetype));
        }
    }
});

// ─── URL Pública ─────────────────────────────────────────────────────────────
const getPublicUrl = (req, relativePath) => {
    // [Vercel Fix] NUNCA quemes un host aquí, usa rutas relativas para las imágenes DB.
    // Así la landing lo carga transparente en cualquier dominio (localhost o godzillaconsulting.ai).
    return `/api/media/${relativePath}`;
};

// URL para assets pesados en disco local (accesibles vía Cloudflare Tunnel)
const getAssetUrl = (filename) => {
    const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || 'https://godzillaconsulting.ai';
    return `${botBase}/api/media/assets/${filename}`;
};

router.post('/upload', requireAdmin, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('[Media] Multer Error:', err);
            return res.status(400).json({ error: `Multer Error: ${err.message}` });
        } else if (err) {
            console.error('[Media] Unknown Upload Error:', err);
            return res.status(500).json({ error: `Upload Error: ${err.message}` });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo (req.file es undefined).' });
    }

    const tempPath = req.file.path;
    const isVideo  = req.file.mimetype.startsWith('video/');

    if (isVideo) {
        if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return res.status(400).json({ error: 'La Base de Datos 🦖 no admite videos. Usa el disco local vía /upload-video o enlaces externos.' });
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
router.post('/upload-video', requireAdmin, (req, res, next) => {
    uploadVideo.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo excede los 500MB permitidos. Por rendimiento de la plataforma, te sugerimos subir videos largos directamente a YouTube e insertar la URL.' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo.' });
    const filename = req.file.filename;
    const publicUrl = getAssetUrl(filename);
    console.log(`[Media-Local] Recurso guardado en disco: ${filename} (${(req.file.size/1024/1024).toFixed(1)} MB)`);
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
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
            const videoExts = /\.(mp4|webm|mov|avi|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|csv)$/i;
            const docExts = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv)$/i;
            const diskFiles = fs.readdirSync(ARCHIVOS_PESADOS_DIR)
                .filter(f => videoExts.test(f))
                .map(f => {
                    const stat = fs.statSync(path.join(ARCHIVOS_PESADOS_DIR, f));
                    return {
                        filename: f,
                        originalName: f,
                        url: getAssetUrl(f),
                        type: docExts.test(f) ? 'document' : 'videos',
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

    // Imágenes: borrar de DB
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
