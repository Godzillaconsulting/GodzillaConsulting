import 'dotenv/config';
import pool from './config/db.js';
import fs from 'fs';
import path from 'path';

async function scanAndFixVercelURLs() {
    console.log('🔍 Escaneando la BD (site_nodes) en busca de URLs viejos de Vercel Blob...');
    
    // Directorios donde podrían estar las fotos "perdidas"
    const searchDirs = [
        path.join(process.cwd(), 'uploads', 'assets'),
        path.join(process.cwd(), 'uploads', 'images'),
        path.join(process.cwd(), '..', 'src', 'assets')
    ];

    try {
        const nodesRes = await pool.query('SELECT node_id, data FROM site_nodes');
        
        for (const row of nodesRes.rows) {
            let dataStr = JSON.stringify(row.data);
            
            if (dataStr.includes('vercel-storage.com')) {
                console.log(`\n⚠️ Nodo Afectado: ${row.node_id}`);
                
                const urls = dataStr.match(/https:\/\/[^"']+\.vercel-storage\.com[^"']+/g) || [];
                
                let modified = false;
                for (const url of urls) {
                    // Extraer nombre del archivo (ej: Logo-1XYZ.png -> Logo.png)
                    // Blob vercel suele agregar un guion y hash al final antes de la extensión
                    const rawName = url.split('/').pop();
                    const cleanName = rawName.replace(/-[A-Za-z0-9]+(\.[a-z]+)$/i, '$1');
                    
                    console.log(`   🔎 Buscando localmente: ${cleanName} (Original Vercel: ${rawName})`);
                    
                    let foundLocalPath = null;
                    for (const dir of searchDirs) {
                        try {
                            const files = fs.readdirSync(dir);
                            // Búsqueda insensible a mayúsculas
                            const matched = files.find(f => f.toLowerCase() === cleanName.toLowerCase() || f.toLowerCase() === decodeURIComponent(cleanName).toLowerCase());
                            if (matched) {
                                foundLocalPath = path.join(dir, matched);
                                break;
                            }
                        } catch {}
                    }

                    if (foundLocalPath) {
                        const fileName = path.basename(foundLocalPath);
                        // Copiar al de assets maestro si no está ahí
                        const assetMasterDir = path.join(process.cwd(), 'uploads', 'assets');
                        const destPath = path.join(assetMasterDir, fileName);
                        
                        if (foundLocalPath !== destPath) {
                            fs.copyFileSync(foundLocalPath, destPath);
                        }

                        const newUrl = `https://bot.godzillaconsulting.ai/api/media/assets/${encodeURIComponent(fileName)}`;
                        console.log(`   ✅ Encontrado! Reemplazando URL en DB -> ${newUrl}`);
                        dataStr = dataStr.replace(url, newUrl);
                        modified = true;
                    } else {
                        console.log(`   ❌ No se encontró el archivo localmente para ${cleanName}`);
                    }
                }

                if (modified) {
                    await pool.query('UPDATE site_nodes SET data = $1 WHERE node_id = $2', [JSON.parse(dataStr), row.node_id]);
                    console.log(`   💾 Nodo ${row.node_id} actualizado en Base de Datos.`);
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
