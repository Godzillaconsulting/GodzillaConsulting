import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../');

dotenv.config({ path: path.join(rootDir, 'server/.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const ARCHIVOS_PESADOS_DIR = 'E:/assets';
const srcDir = path.join(rootDir, 'src/components');

async function downloadAsset(url, isVideo) {
    console.log('Descargando:', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.buffer();
    return { buffer, mimetype: res.headers.get('content-type') || 'application/octet-stream' };
}

async function run() {
    console.log('Buscando URLs en', srcDir);
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));
    const urlSet = new Set();
    
    // Buscar URLs bot.godzillaconsulting.ai
    for (const file of files) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
        const regex = /https:\/\/bot\.godzillaconsulting\.ai\/api\/media\/assets\/[^"'\s]+/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            urlSet.add(match[0]);
        }
    }
    
    // También buscar importar imágenes locales y guardarlas
    for (const file of files) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
        const regex = /from\s+['"]\.\.\/assets\/([^"']+)['"]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const assetPath = path.join(rootDir, 'src/assets', match[1]);
            if (fs.existsSync(assetPath)) urlSet.add(`file://${assetPath}`);
        }
    }

    console.log(`Se encontraron ${urlSet.size} assets base.`);

    if (!fs.existsSync(ARCHIVOS_PESADOS_DIR)) {
        fs.mkdirSync(ARCHIVOS_PESADOS_DIR, { recursive: true });
    }

    for (const rawUrl of urlSet) {
        try {
            const isLocal = rawUrl.startsWith('file://');
            const fileName = isLocal ? path.basename(rawUrl) : decodeURIComponent(rawUrl.split('/').pop());
            const ext = path.extname(fileName).toLowerCase();
            const isDocumentOrVideo = ext === '.mp4' || ext === '.mov' || ext === '.pdf';
            const isImage = ext === '.png' || ext === '.jpg' || ext === '.gif' || ext === '.webp' || ext === '.jpeg';
            
            let buffer, mimetype;
            if (isLocal) {
                buffer = fs.readFileSync(rawUrl.replace('file://', ''));
                if (ext === '.png') mimetype = 'image/png';
                else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
                else if (ext === '.gif') mimetype = 'image/gif';
                else mimetype = 'application/octet-stream';
            } else {
                const fetched = await downloadAsset(rawUrl);
                buffer = fetched.buffer;
                mimetype = fetched.mimetype;
            }

            if (isDocumentOrVideo) {
                // E:/assets
                const outPath = path.join(ARCHIVOS_PESADOS_DIR, fileName);
                if (!fs.existsSync(outPath)) {
                    fs.writeFileSync(outPath, buffer);
                    console.log(`✅ [Video/Doc] Guardado en E:/assets -> ${fileName}`);
                } else {
                    console.log(`⏩ [Video/Doc] Ya existe en E:/assets -> ${fileName}`);
                }
            } else if (isImage) {
                // DB
                const check = await pool.query('SELECT id FROM media_storage WHERE filename = $1', [fileName]);
                if (check.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO media_storage (filename, mimetype, size, file_data) VALUES ($1, $2, $3, $4)`,
                        [fileName, mimetype, buffer.length, buffer]
                    );
                    console.log(`✅ [Imagen] Guardada en BD -> ${fileName}`);
                } else {
                    console.log(`⏩ [Imagen] Ya existe en BD -> ${fileName}`);
                }
            } else {
                console.log(`⚠️ Tipo ignorado: ${fileName}`);
            }

        } catch (e) {
            console.error(`❌ Fallo procesando ${rawUrl}:`, e.message);
        }
    }
    
    console.log('¡Sincronización de Base completada!');
    process.exit(0);
}

run();
