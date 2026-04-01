import 'dotenv/config';
import pool from './server/config/db.js';
import fs from 'fs';
import path from 'path';

async function scanDBForBrokenLinks() {
    console.log('🔍 Escaneando la BD en busca de URLs viejos de Vercel Blob...');
    try {
        const nodesRes = await pool.query('SELECT node_id, data FROM nodes');
        let brokenCount = 0;
        
        for (const row of nodesRes.rows) {
            const dataStr = JSON.stringify(row.data);
            if (dataStr.includes('blob.vercel-storage.com') || dataStr.includes('vercel')) {
                console.log(`⚠️ Encontrado en Node ID: ${row.node_id}`);
                brokenCount++;
                
                // Extraer URLs
                const urls = dataStr.match(/https:\/\/[^"']+\.vercel-storage\.com[^"']+/g);
                if (urls) {
                    urls.forEach(u => console.log(`   - ${u}`));
                }
            }
        }
        console.log(`\nEscaneo termiando. ${brokenCount} nodos afectados.`);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

scanDBForBrokenLinks();
