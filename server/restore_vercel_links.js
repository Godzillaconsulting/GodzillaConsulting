import 'dotenv/config';
import pool from './config/db.js';
import fs from 'fs';
import path from 'path';

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePath(p) {
    return path.normalize(p).toLowerCase();
}

async function scanAndFixVercelURLs() {
    console.log('🔍 Escaneando la BD (site_nodes) en busca de URLs viejos de Vercel Blob...');
    
    // Directorios donde podrían estar las fotos "perdidas"
    const searchDirs = [
        path.join(process.cwd(), 'uploads', 'assets'),
        path.join(process.cwd(), 'uploads', 'images'),
        path.join(process.cwd(), '..', 'src', 'assets')
    ];

    try {
        const nodesRes = await pool.query('SELECT id, published_data, draft_data FROM site_nodes');
        
        for (const row of nodesRes.rows) {
            let pStr = row.published_data ? JSON.stringify(row.published_data) : '';
            let dStr = row.draft_data ? JSON.stringify(row.draft_data) : '';
            
            if (pStr.includes('vercel-storage.com') || dStr.includes('vercel-storage.com')) {
                console.log(`\n⚠️ Nodo Afectado: ${row.id}`);
                
                let urls = [...(pStr.match(/https:\/\/[^"']+\.vercel-storage\.com[^"']+/g) || []), ...(dStr.match(/https:\/\/[^"']+\.vercel-storage\.com[^"']+/g) || [])];
                urls = [...new Set(urls)]; // unique
                
                let modified = false;
                for (const url of urls) {
                    const rawName = url.split('/').pop();
                    const cleanName = rawName.replace(/-[A-Za-z0-9]+(\.[a-z]+)$/i, '$1');
                    
                    console.log(`   🔎 Buscando localmente: ${cleanName} (Original: ${rawName})`);
                    
                    let foundLocalPath = null;
                    for (const dir of searchDirs) {
                        try {
                            const files = fs.readdirSync(dir);
                            const matched = files.find(f => f.toLowerCase() === cleanName.toLowerCase() || f.toLowerCase() === decodeURIComponent(cleanName).toLowerCase());
                            if (matched) {
                                foundLocalPath = path.join(dir, matched);
                                break;
                            }
                        } catch {}
                    }

                    if (foundLocalPath) {
                        const fileName = path.basename(foundLocalPath);
                        // Copiar al maestro
                        const assetMasterDir = path.join(process.cwd(), 'uploads', 'assets');
                        const destPath = path.join(assetMasterDir, fileName);
                        if (foundLocalPath !== destPath && normalizePath(foundLocalPath) !== normalizePath(destPath)) {
                            fs.copyFileSync(foundLocalPath, destPath);
                        }

                        const newUrl = `https://bot.godzillaconsulting.ai/api/media/assets/${encodeURIComponent(fileName)}`;
                        console.log(`   ✅ Encontrado! Reemplazando URL en DB -> ${newUrl}`);
                        pStr = pStr.replace(new RegExp(escapeRegex(url), 'g'), newUrl);
                        dStr = dStr.replace(new RegExp(escapeRegex(url), 'g'), newUrl);
                        modified = true;
                    } else {
                        console.log(`   ❌ No se encontró el archivo localmente para ${cleanName}`);
                    }
                }

                if (modified) {
                    const finalP = pStr ? JSON.parse(pStr) : null;
                    const finalD = dStr ? JSON.parse(dStr) : null;
                    await pool.query('UPDATE site_nodes SET published_data = $1, draft_data = $2 WHERE id = $3', [finalP, finalD, row.id]);
                    console.log(`   💾 Nodo ${row.id} actualizado en Base de Datos.`);
                }
            }
        }
        console.log(`\n🚀 Operación de Restauración Finalizada.`);
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

scanAndFixVercelURLs();
