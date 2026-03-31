require('dotenv').config({path: './server/.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function cleanData(data) {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => cleanData(item));
    
    const cleaned = { ...data };
    for (const key in cleaned) {
        if (typeof cleaned[key] === 'string' && cleaned[key].includes('vercel-storage.com')) {
            console.log(`Clearing VERCEL URL from key [${key}]: ${cleaned[key].substring(0, 50)}...`);
            cleaned[key] = ''; // default empty
        } else if (typeof cleaned[key] === 'object') {
            cleaned[key] = cleanData(cleaned[key]);
        }
    }
    return cleaned;
}

async function go(){
    try {
        const r = await pool.query('SELECT id, draft_data, published_data FROM site_nodes');
        for (const row of r.rows) {
            let d = row.draft_data;
            let p = row.published_data;
            let changed = false;

            if (JSON.stringify(d).includes('vercel-storage.com')) {
                d = cleanData(d);
                changed = true;
            }
            if (JSON.stringify(p).includes('vercel-storage.com')) {
                p = cleanData(p);
                changed = true;
            }

            if (changed) {
                console.log(`Updating node: ${row.id}`);
                await pool.query('UPDATE site_nodes SET draft_data=$1, published_data=$2 WHERE id=$3', [d, p, row.id]);
            }
        }
        
        // Let's also verify "hero" manually just in case
        const heroCheck = await pool.query("SELECT draft_data FROM site_nodes WHERE id='hero'");
        console.log("Hero check bgVideoUrl:", heroCheck.rows[0]?.draft_data?.bgVideoUrl);
        
        console.log('✅ ALL VERCEL BLOB URLS PURGED FROM THE DATABASE!');
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        pool.end();
    }
}
go();
