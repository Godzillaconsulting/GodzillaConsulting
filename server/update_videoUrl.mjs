import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    console.log("Starting DB update for packages...");
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT id, draft_data, published_data FROM site_nodes WHERE id LIKE 'paquete-%'");
        console.log(`Found ${res.rows.length} packages to check...`);

        for (let row of res.rows) {
            let draft = row.draft_data || {};
            let pub = row.published_data || {};
            
            let changed = false;
            
            // Add videoUrl property if missing
            if (draft.videoUrl === undefined) { draft.videoUrl = ""; changed = true; }
            if (pub.videoUrl === undefined) { pub.videoUrl = ""; changed = true; }
            
            // Wait, also maybe the "paquetes" grid section itself? 
            // The prompt asks "añadir un videoUrl para cada paquete"
            
            if (changed) {
                await client.query("UPDATE site_nodes SET draft_data = $1, published_data = $2 WHERE id = $3", [draft, pub, row.id]);
                console.log(`✅ Updated ${row.id} with videoUrl`);
            } else {
                 console.log(`ℹ️ No changes needed for ${row.id}`);
            }
        }
    } catch (err) {
        console.error("Error during DB update", err);
    } finally {
        client.release();
        process.exit();
    }
}

run();
