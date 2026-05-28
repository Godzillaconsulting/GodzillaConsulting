import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'c:/Users/GODZILLA.IA/GodzillaConsulting/outputs';
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const queries = [
    { filename: 'task_29_real_scene_1.jpg', q: 'cruz azul campeon clausura 2026 copa' },
    { filename: 'task_29_real_scene_2.jpg', q: 'estadio ciudad de los deportes azul' },
    { filename: 'task_29_real_scene_3.jpg', q: 'cruz azul vs pumas final 2026 rotondi' },
    { filename: 'task_29_real_scene_4.jpg', q: 'joel huiqui cruz azul campeon 2026' },
    { filename: 'task_29_real_scene_5.jpg', q: 'aficion cruz azul campeon decima' }
];

async function getOgImageFromYahoo(query) {
    try {
        console.log(`Searching Yahoo for: "${query}"`);
        const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const urls = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                const match = href.match(/RU=([^/&]+)/);
                if (match) {
                    try {
                        const decoded = decodeURIComponent(match[1]);
                        if (decoded.startsWith('http') && !decoded.includes('yahoo.com') && urls.length < 3) {
                            if (!decoded.includes('alamy.com') && !decoded.includes('gettyimages.com')) {
                                urls.push(decoded);
                            }
                        }
                    } catch(e) {}
                }
            }
        });

        console.log(`Found links:`, urls);

        for (const articleUrl of urls) {
            try {
                console.log(`Fetching article: ${articleUrl}`);
                const artRes = await fetch(articleUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 8000
                });
                if (!artRes.ok) continue;
                const artHtml = await artRes.text();
                const art$ = cheerio.load(artHtml);
                
                const ogImg = art$('meta[property="og:image"]').attr('content') || 
                              art$('meta[name="twitter:image"]').attr('content') ||
                              art$('link[rel="image_src"]').attr('href');
                              
                if (ogImg && ogImg.startsWith('http')) {
                    console.log(`Found og:image: ${ogImg}`);
                    return ogImg;
                }
            } catch (err) {
                console.log(`Failed fetching article ${articleUrl}: ${err.message}`);
            }
        }
    } catch (e) {
        console.error(`Search failed: ${e.message}`);
    }
    return null;
}

async function run() {
    for (const item of queries) {
        console.log(`\n=============================================`);
        console.log(`Processing: ${item.filename}`);
        const dest = path.join(OUTPUT_DIR, item.filename);
        
        let imgUrl = await getOgImageFromYahoo(item.q);
        
        if (!imgUrl) {
            console.log(`No image found for query. Using direct fallback...`);
            // We use generic but valid Wikimedia/news URLs for fallback
            if (item.filename === 'task_29_real_scene_1.jpg') {
                imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/8/87/Escudo_de_Cruz_Azul.png';
            } else if (item.filename === 'task_29_real_scene_2.jpg') {
                imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Estadio_Azul_panorama_2015.jpg'; // Fixed URL
            } else if (item.filename === 'task_29_real_scene_3.jpg') {
                imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Estadio_olimpico_universitario.jpg';
            } else if (item.filename === 'task_29_real_scene_4.jpg') {
                imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Joel_Huiqui.jpg';
            } else {
                imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Afici%C3%B3n_en_estadio_Hidalgo.JPG';
            }
        }

        try {
            console.log(`Downloading ${imgUrl} to ${dest}...`);
            const imgRes = await fetch(imgUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 15000
            });
            if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
            const buffer = await imgRes.arrayBuffer();
            fs.writeFileSync(dest, Buffer.from(buffer));
            console.log(`✅ Saved ${item.filename} (${buffer.byteLength} bytes)`);
        } catch (e) {
            console.error(`❌ Failed to save ${item.filename}: ${e.message}`);
        }
    }
    process.exit(0);
}

run();
