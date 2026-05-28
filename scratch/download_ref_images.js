import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const images = {
    'task_29_real_scene_5.jpg': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Afici%C3%B3n_en_estadio_Hidalgo.JPG'
};

const OUTPUT_DIR = 'c:/Users/GODZILLA.IA/GodzillaConsulting/outputs';

async function downloadImages() {
    for (const [filename, url] of Object.entries(images)) {
        const dest = path.join(OUTPUT_DIR, filename);
        try {
            console.log(`Waiting 8 seconds before downloading ${filename}...`);
            await new Promise(resolve => setTimeout(resolve, 8000));
            console.log(`Downloading ${url} to ${dest}...`);
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            fs.writeFileSync(dest, Buffer.from(buffer));
            console.log(`✅ Saved ${filename}`);
        } catch (e) {
            console.error(`❌ Failed to download ${filename}:`, e.message);
        }
    }
}

downloadImages();
