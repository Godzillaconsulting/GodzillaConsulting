/**
 * Script: Patch mediaWorker.js con fuentes de stock 100% GRATIS sin registro
 * Reemplaza las funciones searchPexelsVideo...fetchStockMedia con versiones
 * que usan Coverr.co, Openverse, Wikimedia Commons y Loremflickr primero.
 */
import fs from 'fs';

const filePath = './server/workers/mediaWorker.js';
let content = fs.readFileSync(filePath, 'utf8');

// === NUEVO BLOQUE DE FUNCIONES GRATUITAS ===
const newBlock = `
// ── 1. COVERR.CO — Videos HD GRATIS sin watermark, sin registro ──────────────
// API pública JSON → Mux CDN para descarga directa MP4
async function searchCoverrVideo(keyword, outputPath, targetDuration, usedUrls = new Set()) {
    console.log(\`[Coverr] 🎬 Buscando: "\${keyword}"\`);
    const res = await fetch(
        \`https://coverr.co/api/videos/?q=\${encodeURIComponent(keyword)}&per_page=20&page=0\`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) throw new Error(\`Coverr API error: \${res.status}\`);
    const data = await res.json();
    const hits = (data.hits || []).filter(v =>
        !v.is_premium && v.playback_id && parseFloat(v.duration) > 5 && !usedUrls.has(v.id)
    );
    if (hits.length === 0) throw new Error(\`Coverr: sin resultados para "\${keyword}"\`);
    const picked = hits[Math.floor(Math.random() * Math.min(6, hits.length))];
    usedUrls.add(picked.id);
    console.log(\`[Coverr] ✅ "\${picked.title}" | \${picked.duration}s\`);
    for (const q of ['medium', 'high', 'low']) {
        try { return await downloadAndTrimVideo(\`https://stream.mux.com/\${picked.playback_id}/\${q}.mp4\`, outputPath, targetDuration); }
        catch(e) { console.log(\`[Coverr] Quality \${q} falló: \${e.message}\`); }
    }
    throw new Error(\`Coverr: no se pudo descargar "\${picked.title}"\`);
}

// ── 2. OPENVERSE — Fotos CC 100% gratis, sin registro (20 req/min) ────────────
// WordPress Foundation / Creative Commons
async function searchOpenversePhoto(keyword, outputPath, usedUrls = new Set()) {
    console.log(\`[Openverse] 🖼️ Buscando: "\${keyword}"\`);
    const res = await fetch(
        \`https://api.openverse.org/v1/images/?q=\${encodeURIComponent(keyword)}&page_size=20&license_type=commercial\`,
        { headers: { 'User-Agent': 'GodzillaStudio/1.0 (contact@godzillaconsulting.ai)' } }
    );
    if (!res.ok) throw new Error(\`Openverse API error: \${res.status}\`);
    const data = await res.json();
    const results = (data.results || []).filter(p =>
        p.url && !usedUrls.has(p.id) &&
        (p.filetype === 'jpg' || p.filetype === 'jpeg' || p.filetype === 'png' || !p.filetype)
    );
    if (results.length === 0) throw new Error(\`Openverse: sin fotos para "\${keyword}"\`);
    const picked = results[Math.floor(Math.random() * Math.min(8, results.length))];
    usedUrls.add(picked.id);
    console.log(\`[Openverse] ✅ "\${picked.title || picked.id}"\`);
    return await downloadPhoto(picked.url, outputPath);
}

// ── 3. WIKIMEDIA COMMONS — Fotos dominio público, sin registro ────────────────
async function searchWikimediaPhoto(keyword, outputPath, usedUrls = new Set()) {
    console.log(\`[Wikimedia] 🖼️ Buscando: "\${keyword}"\`);
    const apiUrl = \`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=\${encodeURIComponent(keyword)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1080&format=json&gsrlimit=15\`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': 'GodzillaStudio/1.0 (contact@godzillaconsulting.ai)' } });
    if (!res.ok) throw new Error(\`Wikimedia API error: \${res.status}\`);
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    const valid = pages.filter(p => {
        const info = p.imageinfo?.[0];
        if (!info?.url) return false;
        const u = info.url.toLowerCase();
        return (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png')) && !usedUrls.has(p.pageid);
    });
    if (valid.length === 0) throw new Error(\`Wikimedia: sin fotos para "\${keyword}"\`);
    const picked = valid[Math.floor(Math.random() * Math.min(8, valid.length))];
    usedUrls.add(picked.pageid);
    const info = picked.imageinfo[0];
    console.log(\`[Wikimedia] ✅ \${picked.title}\`);
    return await downloadPhoto(info.thumburl || info.url, outputPath);
}

// ── 4. LOREMFLICKR — Fotos CC Flickr, sin registro ────────────────────────────
async function searchLoremflickrPhoto(keyword, outputPath, usedUrls = new Set()) {
    const safeKw = keyword.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(' ').slice(0, 3).join(',');
    const seed = Math.floor(Math.random() * 10000);
    const imgUrl = \`https://loremflickr.com/1080/1920/\${encodeURIComponent(safeKw)}?lock=\${seed}\`;
    console.log(\`[Loremflickr] 🖼️ \${imgUrl}\`);
    return await downloadPhoto(imgUrl, outputPath);
}

// ── 5. PEXELS VIDEO (solo si el usuario configura su key) ─────────────────────
async function searchPexelsVideo(keyword, outputPath, targetDuration, usedUrls = new Set()) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('PEXELS_API_KEY no configurada');
    const res = await fetch(
        \`https://api.pexels.com/videos/search?query=\${encodeURIComponent(keyword)}&orientation=portrait&size=medium&per_page=15\`,
        { headers: { Authorization: apiKey } }
    );
    if (!res.ok) throw new Error(\`Pexels Video API: \${res.status}\`);
    const data = await res.json();
    const videos = (data.videos || []).filter(v => v.duration > 5 && v.duration < 120 && !usedUrls.has(v.url));
    if (videos.length === 0) throw new Error('Sin resultados Pexels Video');
    const picked = videos[Math.floor(Math.random() * Math.min(5, videos.length))];
    usedUrls.add(picked.url);
    const files = picked.video_files || [];
    const portrait = files.filter(f => f.width < f.height).sort((a, b) => b.width - a.width);
    const best = (portrait.length > 0 ? portrait : files.sort((a, b) => b.width - a.width))[0];
    if (!best?.link) throw new Error('Sin URL de video Pexels');
    console.log(\`[Pexels Video] ✅ \${picked.id} | \${best.width}x\${best.height}\`);
    return await downloadAndTrimVideo(best.link, outputPath, targetDuration);
}

// ── 6. PIXABAY VIDEO (solo si el usuario configura su key) ───────────────────
async function searchPixabayVideo(keyword, outputPath, targetDuration, usedUrls = new Set()) {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error('PIXABAY_API_KEY no configurada');
    const res = await fetch(\`https://pixabay.com/api/videos/?key=\${apiKey}&q=\${encodeURIComponent(keyword)}&video_type=film&per_page=15\`);
    if (!res.ok) throw new Error(\`Pixabay Video API: \${res.status}\`);
    const data = await res.json();
    const videos = (data.hits || []).filter(v => v.duration > 5 && v.duration < 120 && !usedUrls.has(v.pageURL));
    if (videos.length === 0) throw new Error('Sin resultados Pixabay Video');
    const picked = videos[Math.floor(Math.random() * Math.min(5, videos.length))];
    usedUrls.add(picked.pageURL);
    const vs = picked.videos;
    const videoUrl = vs?.large?.url || vs?.medium?.url || vs?.small?.url;
    if (!videoUrl) throw new Error('Sin URL Pixabay Video');
    console.log(\`[Pixabay Video] ✅ \${picked.id} | \${picked.duration}s\`);
    return await downloadAndTrimVideo(videoUrl, outputPath, targetDuration);
}

// ── 7. PEXELS FOTO (solo si el usuario configura su key) ─────────────────────
async function searchPexelsPhoto(keyword, outputPath, usedUrls = new Set()) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('PEXELS_API_KEY no configurada');
    const res = await fetch(
        \`https://api.pexels.com/v1/search?query=\${encodeURIComponent(keyword)}&orientation=portrait&size=large&per_page=15\`,
        { headers: { Authorization: apiKey } }
    );
    if (!res.ok) throw new Error(\`Pexels Photo API: \${res.status}\`);
    const data = await res.json();
    const photos = (data.photos || []).filter(p => !usedUrls.has(p.url));
    if (photos.length === 0) throw new Error('Sin resultados Pexels Foto');
    const picked = photos[Math.floor(Math.random() * Math.min(8, photos.length))];
    usedUrls.add(picked.url);
    const imgUrl = picked.src?.portrait || picked.src?.large;
    if (!imgUrl) throw new Error('Sin URL de foto Pexels');
    console.log(\`[Pexels Foto] ✅ \${picked.id}\`);
    return await downloadPhoto(imgUrl, outputPath);
}

// ── FUNCIÓN PRINCIPAL: Cascada multi-fuente ────────────────────────────────────
// Gratis: Coverr → Openverse → Wikimedia → Loremflickr
// Con key: Pexels/Pixabay Video/Foto
// Fallback final: Google Imagen AI
async function fetchStockMedia(keyword, outputVideoPath, targetDuration, usedUrls = new Set()) {
    const short = keyword.split(' ').slice(0, 4).join(' ');
    const photoOut = outputVideoPath.replace('.mp4', '_photo.jpg');

    // ── NIVEL 1: VIDEOS GRATIS ─────────────────────────────────────────────────
    for (const kw of [keyword, short]) {
        try { return { path: await searchCoverrVideo(kw, outputVideoPath, targetDuration, usedUrls), type: 'video' }; }
        catch(e) { console.log(\`[Stock] Coverr falló ("\${kw}"): \${e.message}\`); }
    }
    if (process.env.PEXELS_API_KEY) {
        for (const kw of [keyword, short]) {
            try { return { path: await searchPexelsVideo(kw, outputVideoPath, targetDuration, usedUrls), type: 'video' }; }
            catch(e) { console.log(\`[Stock] Pexels Video falló ("\${kw}"): \${e.message}\`); }
        }
    }
    if (process.env.PIXABAY_API_KEY) {
        for (const kw of [keyword, short]) {
            try { return { path: await searchPixabayVideo(kw, outputVideoPath, targetDuration, usedUrls), type: 'video' }; }
            catch(e) { console.log(\`[Stock] Pixabay Video falló ("\${kw}"): \${e.message}\`); }
        }
    }

    // ── NIVEL 2: FOTOS GRATIS → Ken Burns slideshow ────────────────────────────
    console.log(\`[Stock] Sin video. Buscando fotos para Ken Burns slideshow...\`);
    for (const kw of [keyword, short]) {
        try { return { path: await searchOpenversePhoto(kw, photoOut, usedUrls), type: 'photo' }; }
        catch(e) { console.log(\`[Stock] Openverse falló ("\${kw}"): \${e.message}\`); }
    }
    for (const kw of [keyword, short]) {
        try { return { path: await searchWikimediaPhoto(kw, photoOut, usedUrls), type: 'photo' }; }
        catch(e) { console.log(\`[Stock] Wikimedia falló ("\${kw}"): \${e.message}\`); }
    }
    if (process.env.PEXELS_API_KEY) {
        for (const kw of [keyword, short]) {
            try { return { path: await searchPexelsPhoto(kw, photoOut, usedUrls), type: 'photo' }; }
            catch(e) { console.log(\`[Stock] Pexels Foto falló ("\${kw}"): \${e.message}\`); }
        }
    }
    for (const kw of [keyword, short]) {
        try { return { path: await searchLoremflickrPhoto(kw, photoOut, usedUrls), type: 'photo' }; }
        catch(e) { console.log(\`[Stock] Loremflickr falló ("\${kw}"): \${e.message}\`); }
    }

    // ── NIVEL 3: Google Imagen AI (fallback final) ─────────────────────────────
    console.log(\`[Stock] ⚠️ Todas las fuentes fallaron. Usando Google Imagen IA...\`);
    throw new Error('NO_STOCK_FOUND');
}
`;

// Encontrar el bloque a reemplazar: desde 'async function searchPexelsVideo' 
// hasta el final de 'async function fetchStockMedia'
const startMarker = '// ── 1. PEXELS VIDEO API';
const endMarker = "throw new Error('NO_STOCK_FOUND'); // Señal para que el caller use Google Imagen";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1) {
    console.error('❌ No se encontró el marcador de inicio:', startMarker);
    process.exit(1);
}
if (endIdx === -1) {
    console.error('❌ No se encontró el marcador de fin:', endMarker);
    process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx + endMarker.length);

const newContent = before + newBlock.trim() + '\n' + after;
fs.writeFileSync(filePath, newContent);
console.log('✅ Funciones de stock gratuitas insertadas correctamente.');
console.log('   Líneas antes:', content.split('\n').length);
console.log('   Líneas después:', newContent.split('\n').length);
