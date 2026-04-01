import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/db.js';
import { requireAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

// ─── Directorio Temporal (Solo para recibir unida de multer) ───────────────
const TEMP_DIR = '/tmp/uploads';
try { if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true }); } catch {}

// ─── Directorio Constante para Archivos Pesados (Bypass Vercel) ───────────
const ARCHIVOS_PESADOS_DIR = path.join(process.cwd(), 'server', 'uploads', 'assets');
try { if (!fs.existsSync(ARCHIVOS_PESADOS_DIR)) fs.mkdirSync(ARCHIVOS_PESADOS_DIR, { recursive: true }); } catch {}

// ─── Servir Archivos Pesados Locales Estáticamente (Bypass Vercel) ────────
// Cache Infinito de Cloudflare
router.use('/assets', express.static(ARCHIVOS_PESADOS_DIR, {
    maxAge: '1y',
    immutable: true
}));

// ─── Multer (Límite estricto de 10MB para proteger Neon DB) ─────────────────
const upload = multer({
    dest: TEMP_DIR,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB límite para base de datos
});

// ─── URL Pública ─────────────────────────────────────────────────────────────
const getPublicUrl = (req, relativePath) => {
    // Si estamos en Vercel, usamos el relative path (para evitar hardcodear httpslocalhost)
    // El frontend ya arma la URL si le damos una relativa absoluta o el hostname 
    const isDev = process.env.NODE_ENV === 'development';
    const base = isDev ? `http://localhost:${process.env.PORT || 3000}` : '';
    return `${base}/api/media/${relativePath}`;
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

// ─── GET /api/media/file/:id (Escupir Binario directo al Navegador) ─────────
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
            filename: row.id, // El UUID es el "nombre" que usa delete
            originalName: row.filename,
            url: getPublicUrl(req, `file/${row.id}`), // Arma la URL de transmisión directa
            type: 'images',
            size: row.size,
            createdAt: row.created_at
        }));

        // Videos vacío porque los prohibimos para evitar romper Neon tech
        res.json({ images, videos: [], total: images.length });
    } catch (err) {
        console.error('[Media-DB] Error consultando lista de galería:', err);
        res.status(500).json({ error: 'Error al consultar archivos' });
    }
});

// ─── DELETE /api/media/:type/:filename (Borrar registro de DB) ──────────────
router.delete('/:type/:filename', requireAdmin, async (req, res) => {
    // req.params.filename es en realidad el UUID
    const { filename: uuid } = req.params; 

    if (!uuid) {
        return res.status(400).json({ error: 'Falta el UUID (filename).' });
    }

    try {
        const result = await pool.query('DELETE FROM media_storage WHERE id = $1 RETURNING id', [uuid]);

        if (result.rowCount === 0) {
            console.log(`[Media-DB] Aviso: UUID ${uuid} no encontrado para borrar.`);
            return res.status(404).json({ error: 'Archivo inexistente' });
        }

        console.log(`[Media-DB] Archivo evaporado de la DB: ${uuid}`);
        res.json({ success: true, deleted: uuid });
    } catch (err) {
        console.error('[Media-DB] Error eliminando registro:', err);
        res.status(500).json({ error: 'Fallo al eliminar archivo en la Base de Datos' });
    }
});

export default router;
